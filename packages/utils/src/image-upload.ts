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

/**
 * Detect an image's real format from its magic bytes.
 *
 * Uploads previously trusted the client-declared `Content-Type` alone, so a
 * file could be stored under an extension and MIME type that did not match its
 * actual contents. The blast radius was limited (the bucket is on Supabase's
 * domain, not the app's, and the size/MIME allowlist still applied) but
 * "trusting the client about what a file is" is exactly the assumption worth
 * removing on an upload path.
 *
 * Returns null when the bytes match no format we accept.
 */
export function sniffImageMime(
  bytes: Uint8Array
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null {
  if (bytes.length < 12) return null;

  const at = (i: number) => bytes[i] as number;

  // JPEG: FF D8 FF
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 &&
    at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a
  ) {
    return 'image/png';
  }

  // GIF: "GIF87a" or "GIF89a"
  if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38) return 'image/gif';

  // WEBP: "RIFF" .... "WEBP"
  if (
    at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Resolve the format to store a file as, verifying the declared type against
 * the actual bytes.
 *
 * `declared` is the browser-supplied Content-Type; `bytes` is the file itself.
 * The sniffed type wins — the declared type is only used to reject early.
 */
export function resolveVerifiedImageType(
  declared: string,
  bytes: Uint8Array,
  allowed: readonly string[]
): { ok: true; contentType: string; ext: string } | { ok: false; reason: string } {
  if (!allowed.includes(declared)) {
    return { ok: false, reason: `Unsupported file type: ${declared}` };
  }

  const sniffed = sniffImageMime(bytes);
  if (!sniffed) {
    return { ok: false, reason: 'File contents are not a recognised image' };
  }
  if (!allowed.includes(sniffed)) {
    return { ok: false, reason: `Unsupported image format: ${sniffed}` };
  }
  if (sniffed !== declared) {
    return {
      ok: false,
      reason: `File contents (${sniffed}) do not match the declared type (${declared})`,
    };
  }

  const ext = canonicalImageExtensionForMime(sniffed);
  if (!ext) return { ok: false, reason: `Unsupported image format: ${sniffed}` };

  return { ok: true, contentType: sniffed, ext };
}
