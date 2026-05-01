// ==========================================
// IMAGE UPLOAD HELPERS (Phase 15 / IRR-026)
// ==========================================

/** Canonical file extension for allowed profile/menu image MIME types only. */
export function canonicalImageExtensionForMime(contentType: string): 'jpg' | 'png' | 'webp' | 'gif' | null {
  const map: Record<string, 'jpg' | 'png' | 'webp' | 'gif'> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[contentType] ?? null;
}
