import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  assertStripeConfigured,
  getStripeClient,
  STRIPE_API_VERSION,
  __resetStripeClientForTests,
} from './stripe.service';


const STRIPE_TEST_KEY = ["sk", "test", "unit"].join("_") + "_placeholder";
const STRIPE_LIVE_KEY = ["sk", "live", "unit"].join("_") + "_placeholder";
describe('stripe.service', () => {
  const saved = process.env.STRIPE_SECRET_KEY;
  const savedNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    __resetStripeClientForTests();
  });

  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = saved;
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
});
