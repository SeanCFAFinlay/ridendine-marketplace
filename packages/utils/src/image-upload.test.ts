import { describe, it, expect } from 'vitest';
import {
  sniffImageMime,
  resolveVerifiedImageType,
  canonicalImageExtensionForMime,
} from './image-upload';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

function bytes(...vals: number[]): Uint8Array {
  // Pad to 12 so the WEBP check can always read its offsets.
  const out = new Uint8Array(Math.max(12, vals.length));
  out.set(vals);
  return out;
}

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const GIF = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
const WEBP = bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50);

describe('sniffImageMime', () => {
  it('identifies each accepted format from its magic bytes', () => {
    expect(sniffImageMime(JPEG)).toBe('image/jpeg');
    expect(sniffImageMime(PNG)).toBe('image/png');
    expect(sniffImageMime(GIF)).toBe('image/gif');
    expect(sniffImageMime(WEBP)).toBe('image/webp');
  });

  it('returns null for non-image content', () => {
    // "<?php ..." — the classic polyglot upload attempt.
    expect(sniffImageMime(bytes(0x3c, 0x3f, 0x70, 0x68, 0x70))).toBeNull();
    // An HTML document.
    expect(sniffImageMime(bytes(0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e))).toBeNull();
  });

  it('returns null for input too short to classify', () => {
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });

  it('does not mistake RIFF-but-not-WEBP for an image', () => {
    // RIFF container that is a WAV, not a WEBP.
    expect(
      sniffImageMime(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45))
    ).toBeNull();
  });
});

describe('resolveVerifiedImageType', () => {
  it('accepts a file whose bytes match its declared type', () => {
    expect(resolveVerifiedImageType('image/png', PNG, ALLOWED)).toEqual({
      ok: true,
      contentType: 'image/png',
      ext: 'png',
    });
  });

  it('rejects a file whose bytes contradict its declared type', () => {
    // The whole point: a PHP script announced as a PNG.
    const result = resolveVerifiedImageType(
      'image/png',
      bytes(0x3c, 0x3f, 0x70, 0x68, 0x70),
      ALLOWED
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/not a recognised image/i);
  });

  it('rejects a real image declared as a different real image type', () => {
    const result = resolveVerifiedImageType('image/png', JPEG, ALLOWED);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/do not match the declared type/i);
  });

  it('rejects a declared type outside the allowlist before sniffing', () => {
    const result = resolveVerifiedImageType('image/svg+xml', PNG, ALLOWED);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unsupported file type/i);
  });

  it('respects a narrower allowlist', () => {
    // The driver app does not accept GIF.
    const narrow = ['image/jpeg', 'image/png', 'image/webp'] as const;
    expect(resolveVerifiedImageType('image/gif', GIF, narrow).ok).toBe(false);
  });
});

describe('canonicalImageExtensionForMime', () => {
  it('maps every accepted MIME to a canonical extension', () => {
    expect(canonicalImageExtensionForMime('image/jpeg')).toBe('jpg');
    expect(canonicalImageExtensionForMime('image/png')).toBe('png');
    expect(canonicalImageExtensionForMime('image/webp')).toBe('webp');
    expect(canonicalImageExtensionForMime('image/gif')).toBe('gif');
    expect(canonicalImageExtensionForMime('application/pdf')).toBeNull();
  });
});
