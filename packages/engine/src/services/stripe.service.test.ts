import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  assertStripeConfigured,
  getStripeClient,
  getStripePublishableKey,
  isStripeTestModeConfigured,
  StripeTestModeUnavailableError,
  STRIPE_API_VERSION,
  __resetStripeClientForTests,
} from './stripe.service';


const STRIPE_TEST_KEY = ["sk", "test", "unit"].join("_") + "_placeholder";
const STRIPE_LIVE_KEY = ["sk", "live", "unit"].join("_") + "_placeholder";
describe('stripe.service', () => {
  const saved = process.env.STRIPE_SECRET_KEY;
  const savedTest = process.env.STRIPE_TEST_SECRET_KEY;
  const savedNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    __resetStripeClientForTests();
  });

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = saved;
    if (savedTest === undefined) delete process.env.STRIPE_TEST_SECRET_KEY;
    else process.env.STRIPE_TEST_SECRET_KEY = savedTest;
    process.env.NODE_ENV = savedNodeEnv;
    __resetStripeClientForTests();
  });

  it('pins a single STRIPE_API_VERSION', () => {
    expect(STRIPE_API_VERSION).toBe('2024-12-18.acacia');
  });

  it('fails closed when STRIPE_SECRET_KEY is missing', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => assertStripeConfigured()).toThrow(/STRIPE_SECRET_KEY/);
    expect(() => getStripeClient()).toThrow(/STRIPE_SECRET_KEY/);
  });

  it('returns the same singleton for repeated getStripeClient', () => {
    process.env.STRIPE_SECRET_KEY = STRIPE_TEST_KEY;
    const a = getStripeClient();
    const b = getStripeClient();
    expect(a).toBe(b);
  });

  it('rejects live-mode secret key outside production', () => {
    process.env.NODE_ENV = 'staging';
    process.env.STRIPE_SECRET_KEY = STRIPE_LIVE_KEY;
    expect(() => assertStripeConfigured()).toThrow(/non-production must use test mode key/);
  });

  it('rejects test-mode secret key in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = STRIPE_TEST_KEY;
    expect(() => assertStripeConfigured()).toThrow(/production must use live mode key/);
  });

  it('accepts live-mode secret key in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = STRIPE_LIVE_KEY;
    expect(() => assertStripeConfigured()).not.toThrow();
  });

  // ==========================================
  // TEST MODE ALONGSIDE LIVE (partner test keys / 4242 card)
  // ==========================================
  describe('test mode', () => {
    it('reports whether test mode is configured', () => {
      delete process.env.STRIPE_TEST_SECRET_KEY;
      expect(isStripeTestModeConfigured()).toBe(false);
      process.env.STRIPE_TEST_SECRET_KEY = STRIPE_TEST_KEY;
      expect(isStripeTestModeConfigured()).toBe(true);
    });

    it('fails closed when test mode is requested but unconfigured', () => {
      process.env.NODE_ENV = 'production';
      process.env.STRIPE_SECRET_KEY = STRIPE_LIVE_KEY;
      delete process.env.STRIPE_TEST_SECRET_KEY;

      expect(() => getStripeClient({ testMode: true })).toThrow(StripeTestModeUnavailableError);
      // Crucially it must NOT quietly hand back the live client.
      expect(() => getStripeClient({ testMode: true })).toThrow(/STRIPE_TEST_SECRET_KEY/);
    });

    it('refuses a live key in STRIPE_TEST_SECRET_KEY', () => {
      process.env.NODE_ENV = 'production';
      process.env.STRIPE_SECRET_KEY = STRIPE_LIVE_KEY;
      process.env.STRIPE_TEST_SECRET_KEY = STRIPE_LIVE_KEY;

      expect(() => getStripeClient({ testMode: true })).toThrow(/must be a Stripe TEST key/);
    });

    it('serves a distinct client per mode, in production, without disturbing live', () => {
      process.env.NODE_ENV = 'production';
      process.env.STRIPE_SECRET_KEY = STRIPE_LIVE_KEY;
      process.env.STRIPE_TEST_SECRET_KEY = STRIPE_TEST_KEY;

      const live = getStripeClient();
      const test = getStripeClient({ testMode: true });

      expect(test).not.toBe(live);
      // Live guard still applies — test mode is additive, not an escape hatch.
      expect(() => assertStripeConfigured()).not.toThrow();
    });

    it('memoises each mode independently', () => {
      process.env.STRIPE_SECRET_KEY = STRIPE_TEST_KEY;
      process.env.STRIPE_TEST_SECRET_KEY = STRIPE_TEST_KEY;

      expect(getStripeClient()).toBe(getStripeClient());
      expect(getStripeClient({ testMode: true })).toBe(getStripeClient({ testMode: true }));
    });

    it('treats testMode:false / undefined as live', () => {
      process.env.STRIPE_SECRET_KEY = STRIPE_TEST_KEY;
      process.env.STRIPE_TEST_SECRET_KEY = STRIPE_TEST_KEY;

      expect(getStripeClient({ testMode: false })).toBe(getStripeClient());
      expect(getStripeClient({})).toBe(getStripeClient());
    });

    it('returns the publishable key matching the requested mode', () => {
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_live_x';
      process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY = 'pk_test_x';

      expect(getStripePublishableKey()).toBe('pk_live_x');
      expect(getStripePublishableKey({ testMode: true })).toBe('pk_test_x');

      delete process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY;
      // Never falls back to the live key — confirming a test clientSecret with
      // it would fail anyway, and silently returning it hides the misconfig.
      expect(getStripePublishableKey({ testMode: true })).toBeNull();

      delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    });
  });
});
