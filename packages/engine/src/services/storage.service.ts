// ==========================================
// STORAGE SERVICE - File Upload & Media
// ==========================================

// Using 'any' for storage operations as StorageClient type doesn't expose storage by default
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StorageClient = any;

// Storage buckets
export const STORAGE_BUCKETS = {
  CHEF_IMAGES: 'chef-images',
  MENU_IMAGES: 'menu-images',
  CUSTOMER_IMAGES: 'customer-images',
  DRIVER_IMAGES: 'driver-images',
  DOCUMENTS: 'documents',
  DELIVERY_PHOTOS: 'delivery-photos',
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// Default placeholder images
export const PLACEHOLDER_IMAGES = {
  CHEF_AVATAR: '/images/placeholders/chef-avatar.png',
  CHEF_COVER: '/images/placeholders/chef-cover.png',
  MENU_ITEM: '/images/placeholders/menu-item.png',
  CUSTOMER_AVATAR: '/images/placeholders/customer-avatar.png',
  DRIVER_AVATAR: '/images/placeholders/driver-avatar.png',
} as const;

// Generate storage path
export function generateStoragePath(
  bucket: StorageBucket,
  entityId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${entityId}/${timestamp}-${sanitizedFileName}`;
}

// Get public URL for a stored file
export function getPublicUrl(
  client: StorageClient,
  bucket: StorageBucket,
  path: string
): string {
  const {
    data: { publicUrl },
  } = client.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

// Upload file to storage
export async function uploadFile(
  client: StorageClient,
  bucket: StorageBucket,
  path: string,
  file: File | Blob,
  options: {
    contentType?: string;
    upsert?: boolean;
  } = {}
): Promise<{ url: string; path: string } | { error: string }> {
  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    contentType: options.contentType,
    upsert: options.upsert ?? false,
  });

  if (error) {
    return { error: error.message };
  }

  const publicUrl = getPublicUrl(client, bucket, data.path);
  return { url: publicUrl, path: data.path };
}

// Delete file from storage
export async function deleteFile(
  client: StorageClient,
  bucket: StorageBucket,
  path: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await client.storage.from(bucket).remove([path]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get signed URL for private files
export async function getSignedUrl(
  client: StorageClient,
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string } | { error: string }> {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return { error: error.message };
  }

  return { url: data.signedUrl };
}

// Validate file type
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(file.type);
}

// Validate file size (max 5MB default)
export function isValidFileSize(
  file: File,
  maxSizeMB: number = 5
): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}

// Get image URL with fallback
export function getImageUrl(
  url: string | null | undefined,
  fallback: string = PLACEHOLDER_IMAGES.MENU_ITEM
): string {
  if (!url || url.trim() === '') {
    return fallback;
  }
  return url;
}

// Get chef avatar URL
export function getChefAvatarUrl(url: string | null | undefined): string {
  return getImageUrl(url, PLACEHOLDER_IMAGES.CHEF_AVATAR);
}

// Get chef cover URL
export function getChefCoverUrl(url: string | null | undefined): string {
  return getImageUrl(url, PLACEHOLDER_IMAGES.CHEF_COVER);
}

// Get menu item image URL
export function getMenuItemImageUrl(url: string | null | undefined): string {
  return getImageUrl(url, PLACEHOLDER_IMAGES.MENU_ITEM);
}

// Upload chef profile image
export async function uploadChefProfileImage(
  client: StorageClient,
  chefId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!isValidImageType(file)) {
    return { error: 'Invalid image type. Please use JPEG, PNG, or WebP.' };
  }

  if (!isValidFileSize(file)) {
    return { error: 'File too large. Maximum size is 5MB.' };
  }

  const path = generateStoragePath(STORAGE_BUCKETS.CHEF_IMAGES, chefId, file.name);
  const result = await uploadFile(client, STORAGE_BUCKETS.CHEF_IMAGES, path, file, {
    contentType: file.type,
    upsert: true,
  });

  if ('error' in result) {
    return { error: result.error };
  }

  return { url: result.url };
}

// Upload menu item image
export async function uploadMenuItemImage(
  client: StorageClient,
  storefrontId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!isValidImageType(file)) {
    return { error: 'Invalid image type. Please use JPEG, PNG, or WebP.' };
  }

  if (!isValidFileSize(file)) {
    return { error: 'File too large. Maximum size is 5MB.' };
  }

  const path = generateStoragePath(
    STORAGE_BUCKETS.MENU_IMAGES,
    storefrontId,
    file.name
  );
  const result = await uploadFile(client, STORAGE_BUCKETS.MENU_IMAGES, path, file, {
    contentType: file.type,
    upsert: true,
  });

  if ('error' in result) {
    return { error: result.error };
  }

  return { url: result.url };
}
