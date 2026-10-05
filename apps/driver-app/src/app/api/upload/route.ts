import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  resolveVerifiedImageType,
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
  redactSensitiveForLog,
} from '@ridendine/utils';
import { getDriverActorContext, verifyDriverOwnsDelivery } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = 'delivery-photos';
const CONTEXTS = new Set(['pickup', 'dropoff', 'signature']);

function parseDataUrl(dataUrl: unknown): { mimeType: string; buffer: Uint8Array } | { error: string } {
  if (typeof dataUrl !== 'string') return { error: 'dataUrl is required' };

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { error: 'dataUrl must be a base64 image data URL' };

  const mimeType = match[1];
  const base64Payload = match[2];
  if (!mimeType || !base64Payload) return { error: 'dataUrl must be a base64 image data URL' };

  if (!ALLOWED_TYPES.includes(mimeType)) {
    return { error: 'Invalid file type. Use JPEG, PNG, or WebP' };
  }

  const raw = Buffer.from(base64Payload, 'base64');
  if (!raw.length) return { error: 'Image payload is empty' };
  if (raw.byteLength > MAX_SIZE) return { error: 'File too large. Maximum 5MB' };

  return { mimeType, buffer: new Uint8Array(raw) };
}

async function ensureBucketExists(client: ReturnType<typeof createAdminClient>) {
  await client.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_TYPES,
    fileSizeLimit: MAX_SIZE,
  });
}

async function uploadImage(
  client: ReturnType<typeof createAdminClient>,
  path: string,
  buffer: Uint8Array,
  mimeType: string
): Promise<{ path: string } | { error: string }> {
  const { data, error } = await client.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (!error) return { path: data.path };

  const isMissingBucket = error.message?.includes('not found') || error.message?.includes('Bucket');
  if (!isMissingBucket) return { error: error.message };

  await ensureBucketExists(client);
  const retry = await client.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (retry.error) return { error: retry.error.message };
  return { path: retry.data.path };
}

export async function POST(request: NextRequest) {
  const context = await getDriverActorContext();
  if (!context) {
    const unauthLimit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.auth,
      namespace: 'driver-upload-unauth',
      routeKey: 'POST:/api/upload',
    });
    if (!unauthLimit.allowed) return rateLimitPolicyResponse(unauthLimit);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.upload,
    namespace: 'driver-upload',
    driverId: context.driverId,
    routeKey: 'POST:/api/upload',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const deliveryId = typeof body.deliveryId === 'string' ? body.deliveryId : '';
    const proofContext = typeof body.context === 'string' ? body.context : '';

    if (!deliveryId) {
      return NextResponse.json({ error: 'deliveryId is required' }, { status: 400 });
    }

    if (!CONTEXTS.has(proofContext)) {
      return NextResponse.json({ error: 'context must be pickup, dropoff, or signature' }, { status: 400 });
    }

    const ownsDelivery = await verifyDriverOwnsDelivery(context.driverId, deliveryId);
    if (!ownsDelivery) {
      return NextResponse.json({ error: 'This delivery is not assigned to you' }, { status: 403 });
    }

    const parsed = parseDataUrl(body.dataUrl);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // Verify magic bytes rather than trusting the data-URL's declared MIME.
    // Delivery proof is evidence in a dispute — it must actually be an image.
    const verified = resolveVerifiedImageType(parsed.mimeType, parsed.buffer, ALLOWED_TYPES);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.reason }, { status: 400 });
    }

    const client = createAdminClient();
    const fileName = `${context.driverId}/${deliveryId}/${proofContext}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${verified.ext}`;

    const upload = await uploadImage(client, fileName, parsed.buffer, verified.contentType);
    if ('error' in upload) {
      return NextResponse.json({ error: upload.error }, { status: 500 });
    }

    const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(upload.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: upload.path,
      context: proofContext,
    });
  } catch (error) {
    console.error(
      'Driver upload error:',
      redactSensitiveForLog(error instanceof Error ? error.message : String(error))
    );
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
