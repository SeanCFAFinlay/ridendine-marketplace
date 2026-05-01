import { describe, expect, it, afterEach } from 'vitest';
import { redactSensitiveForLog } from './redact-sensitive';
import { validateEngineProcessorHeaders } from './processor-auth';
import { canonicalImageExtensionForMime } from './image-upload';
import { isUuid } from './helpers';

describe('redactSensitiveForLog (IRR-027)', () => {
  it('redacts email addresses', () => {
    expect(redactSensitiveForLog('failed for user@example.com here')).toBe(
      'failed for [email] here'
    );
  });

  it('redacts Stripe-style secret keys', () => {
    expect(redactSensitiveForLog('key sk_test_abc123xyz')).toContain('[stripe_key]');
  });

  it('redacts long digit runs', () => {
    expect(redactSensitiveForLog('card 4242424242424242 end')).toContain('[digits]');
  });
});

describe('validateEngineProcessorHeaders (IRR-006)', () => {
  const prevCron = process.env.CRON_SECRET;
  const prevTok = process.env.ENGINE_PROCESSOR_TOKEN;

  afterEach(() => {
    process.env.CRON_SECRET = prevCron;
    process.env.ENGINE_PROCESSOR_TOKEN = prevTok;
  });

  it('returns false when no secrets configured', () => {
    delete process.env.CRON_SECRET;
    delete process.env.ENGINE_PROCESSOR_TOKEN;
    const h = new Headers();
    h.set('x-processor-token', 'anything');
    expect(validateEngineProcessorHeaders(h)).toBe(false);
  });

  it('accepts Bearer CRON_SECRET', () => {
    process.env.CRON_SECRET = 'cron-secret-1';
    delete process.env.ENGINE_PROCESSOR_TOKEN;
    const h = new Headers();
    h.set('authorization', 'Bearer cron-secret-1');
    expect(validateEngineProcessorHeaders(h)).toBe(true);
  });

  it('accepts x-processor-token', () => {
    delete process.env.CRON_SECRET;
    process.env.ENGINE_PROCESSOR_TOKEN = 'proc-1';
    const h = new Headers();
    h.set('x-processor-token', 'proc-1');
    expect(validateEngineProcessorHeaders(h)).toBe(true);
  });
});

describe('canonicalImageExtensionForMime (IRR-026)', () => {
  it('maps allowed image MIME types', () => {
    expect(canonicalImageExtensionForMime('image/jpeg')).toBe('jpg');
    expect(canonicalImageExtensionForMime('image/png')).toBe('png');
    expect(canonicalImageExtensionForMime('image/svg+xml')).toBeNull();
  });
});

describe('isUuid', () => {
  it('accepts valid v4 UUIDs', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects non-UUIDs', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('../etc/passwd')).toBe(false);
  });
});
