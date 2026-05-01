// ==========================================
// IMAGE UPLOAD API ROUTE
// Handles file uploads to Supabase Storage
// Supports: menu item images, profile images, storefront images
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getChefBasicContext } from '@/lib/engine';
import {
  canonicalImageExtensionForMime,
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
  redactSensitiveForLog,
} from '@ridendine/utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const BUCKETS: Record<string, string> = {
  'menu-items': 'menu-items',
  'profiles': 'profiles',
  'storefronts': 'storefronts',
};

async function ensureBucketExists(
  client: ReturnType<typeof createAdminClient>,
  bucketName: string
): Promise<void> {
  await client.storage.createBucket(bucketName, {
    public: true,
    allowedMimeTypes: ALLOWED_TYPES,
    fileSizeLimit: MAX_SIZE,
  });
}

async function uploadToStorage(
  client: ReturnType<typeof createAdminClient>,
  bucketName: string,
  fileName: string,
  buffer: Uint8Array,
  contentType: string
): Promise<{ path: string } | { error: string }> {
  const { data, error } = await client.storage
    .from(bucketName)
    .upload(fileName, buffer, { contentType, upsert: false });

  if (error) {
    const isMissingBucket =
      error.message?.includes('not found') || error.message?.includes('Bucket');
    if (!isMissingBucket) {
      return { error: error.message };
    }

    await ensureBucketExists(client, bucketName);

    const retry = await client.storage
      .from(bucketName)
      .upload(fileName, buffer, { contentType, upsert: false });

    if (retry.error) {
      return { error: retry.error.message };
    }
    return { path: retry.data.path };
  }

  return { path: data.path };
}

export async function POST(request: NextRequest) {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.upload,
    namespace: 'chef-upload',
    routeKey: 'POST:/api/upload',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const context = await getChefBasicContext();
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!bucket || !BUCKETS[bucket]) {
      return NextResponse.json(
        { error: 'Invalid bucket. Use: menu-items, profiles, or storefronts' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum 5MB' },
        { status: 400 }
      );
    }

    const ext = canonicalImageExtensionForMime(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF' },
        { status: 400 }
      );
    }

    const client = createAdminClient();
    const fileName = `${context.chefId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const result = await uploadToStorage(client, BUCKETS[bucket], fileName, buffer, file.type);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const { data: urlData } = client.storage
      .from(BUCKETS[bucket])
      .getPublicUrl(result.path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: result.path,
    });
  } catch (error) {
    console.error(
      'Upload error:',
      redactSensitiveForLog(error instanceof Error ? error.message : String(error))
    );
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
