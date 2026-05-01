import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServerClient } from '@ridendine/db';
import { cookies } from 'next/headers';
import {
  canonicalImageExtensionForMime,
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
  redactSensitiveForLog,
} from '@ridendine/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = 'profiles';

async function ensureProfileBucketExists(
  client: ReturnType<typeof createAdminClient>
): Promise<void> {
  await client.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ALLOWED_TYPES,
    fileSizeLimit: MAX_SIZE,
  });
}

async function uploadProfileImage(
  client: ReturnType<typeof createAdminClient>,
  userId: string,
  buffer: Uint8Array,
  contentType: string,
  ext: string
): Promise<{ url: string } | { error: string }> {
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await client.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType, upsert: false });

  if (error) {
    const isMissingBucket =
      error.message?.includes('not found') || error.message?.includes('Bucket');
    if (!isMissingBucket) {
      return { error: error.message };
    }

    await ensureProfileBucketExists(client);

    const retry = await client.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType, upsert: false });

    if (retry.error) {
      return { error: retry.error.message };
    }

    const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(retry.data.path);
    return { url: urlData.publicUrl };
  }

  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(data.path);
  return { url: urlData.publicUrl };
}

export async function POST(request: NextRequest) {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.upload,
    namespace: 'web-upload',
    routeKey: 'POST:/api/upload',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB' }, { status: 400 });
    }

    const ext = canonicalImageExtensionForMime(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const client = createAdminClient();
    const buffer = new Uint8Array(await file.arrayBuffer());

    const result = await uploadProfileImage(client, user.id, buffer, file.type, ext);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: result.url });
  } catch (error) {
    console.error(
      'Upload error:',
      redactSensitiveForLog(error instanceof Error ? error.message : String(error))
    );
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
