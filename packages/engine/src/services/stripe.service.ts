// ==========================================
// CANONICAL STRIPE SERVER CLIENT (IRR-007 / IRR-018)
// Single apiVersion + lazy singletons for all server routes and adapters.
//
// TWO MODES, ONE DEPLOYMENT. Stripe's live/test split is per-API-key, so a
// production deployment holding only `sk_live_` can never accept the 4242 test
// card — partner integration testing was impossible without a separate host.
// `getStripeClient({ testMode: true })` returns a client built from
// STRIPE_TEST_SECRET_KEY instead, so an order flagged `is_test` (partner test
// key, see api_partner_keys.test_mode) transacts in Stripe TEST mode while all
// real traffic on the same deployment stays live.
//
// The two modes are entirely separate Stripe accounts-worth of data: a customer,
// PaymentIntent or PaymentMethod created in one mode DOES NOT EXIST in the other
// (`resource_missing`). Anything that touches an object must use the same mode
// that created it — which is why `testMode` is threaded through rather than
// inferred.
// ==========================================

import Stripe from 'stripe';

/** Pinned Stripe API version for the entire monorepo — change only here. */
export const STRIPE_API_VERSION = '2024-12-18.acacia' as const;

let stripeSingleton: Stripe | null = null;
let stripeTestSingleton: Stripe | null = null;

function assertStripeEnvironmentSafety(secretKey: string): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const allowTestInProd = process.env.STRIPE_ALLOW_TEST_IN_PRODUCTION === 'true';

  if (nodeEnv !== 'production' && !secretKey.startsWith('sk_test_')) {
    throw new Error(
      `Unsafe Stripe key for ${nodeEnv}: non-production must use test mode key`
    );
  }
  if (nodeEnv === 'production' && !secretKey.startsWith('sk_live_')) {
    // Closed-beta escape hatch — explicit opt-in for testing the real
    // production code path with Stripe test keys (no real money moves).
    // Remove STRIPE_ALLOW_TEST_IN_PRODUCTION from Vercel before public launch.
    if (allowTestInProd && secretKey.startsWith('sk_test_')) {
      console.warn(
        '[stripe] STRIPE_ALLOW_TEST_IN_PRODUCTION=true — using Stripe TEST mode key in production environment. Remove this flag before going live with real customers.'
      );
      return;
    }
    throw new Error('Unsafe Stripe key for production: production must use live mode key');
  }
}

export function assertStripeConfigured(): void {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  assertStripeEnvironmentSafety(key);
}

/** Error thrown when test-mode Stripe is requested but not configured. */
export class StripeTestModeUnavailableError extends Error {
  readonly code = 'STRIPE_TEST_MODE_UNAVAILABLE';
  constructor(message: string) {
    super(message);
    this.name = 'StripeTestModeUnavailableError';
  }
}

/**
 * Whether this deployment can transact in Stripe test mode. Used to fail a
 * test-mode checkout early with a clear message rather than at PaymentIntent
 * creation.
 */
export function isStripeTestModeConfigured(): boolean {
  return Boolean(process.env.STRIPE_TEST_SECRET_KEY?.trim());
}

/**
 * Test-mode secret. Guarded in EVERY environment (not just non-prod): this key
 * exists precisely to run test money inside a live deployment, so an `sk_live_`
 * value here would route traffic meant to be fake at real cards. Fail closed —
 * silently falling back to the live client would charge a real card for what the
 * caller asked to be a test transaction.
 */
function assertTestSecretKey(): string {
  const key = process.env.STRIPE_TEST_SECRET_KEY?.trim();
  if (!key) {
    throw new StripeTestModeUnavailableError(
      'STRIPE_TEST_SECRET_KEY is not configured — this deployment cannot process test-mode payments. Set it (sk_test_…) to enable test-card checkout for partner test keys.'
    );
  }
  if (!key.startsWith('sk_test_')) {
    throw new StripeTestModeUnavailableError(
      'STRIPE_TEST_SECRET_KEY must be a Stripe TEST key (sk_test_…). Refusing to run test-flagged orders against a live key.'
    );
  }
  return key;
}

/**
 * Shared Stripe client for PaymentIntents, Connect, webhooks.constructEvent, etc.
 * Never send the secret to the client.
 *
 * Pass `{ testMode: true }` for anything belonging to an `is_test` order — it
 * returns the TEST-mode client, which is the only one that accepts test cards
 * (4242…) and the only one that can see objects created in test mode.
 */
export function getStripeClient(options?: { testMode?: boolean }): Stripe {
  if (options?.testMode) {
    const testKey = assertTestSecretKey();
    if (!stripeTestSingleton) {
      stripeTestSingleton = new Stripe(testKey, {
        apiVersion: STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
      });
    }
    return stripeTestSingleton;
  }

  assertStripeConfigured();
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
    });
  }
  return stripeSingleton;
}

/**
 * The publishable key the browser must initialise Stripe.js with for a given
 * mode. A clientSecret minted in test mode can ONLY be confirmed with the test
 * publishable key, so this travels back in the checkout response — a partner
 * hard-coding one publishable key cannot confirm both modes.
 */
export function getStripePublishableKey(options?: { testMode?: boolean }): string | null {
  const key = options?.testMode
    ? process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY?.trim()
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key || null;
}

/** Test-only: reset singletons between cases. */
export function __resetStripeClientForTests(): void {
  stripeSingleton = null;
  stripeTestSingleton = null;
}

/**
 * Get or create a Stripe Customer for a Ridendine customer.
 * Searches by metadata ridendine_id first to avoid duplicates.
 * Returns the Stripe customer ID string, or null if Stripe is not configured.
 */
export async function getOrCreateStripeCustomer(params: {
  ridendineCustomerId: string;
  email: string;
  name?: string;
  /** Must match the mode of the PaymentIntent this customer will be attached to. */
  testMode?: boolean;
}): Promise<string | null> {
  try {
    if (params.testMode) assertTestSecretKey();
    else assertStripeConfigured();
  } catch {
    return null;
  }

  const stripe = getStripeClient({ testMode: params.testMode });

  // Search for existing customer by ridendine_id metadata
  const existing = await stripe.customers.search({
    query: `metadata['ridendine_id']:'${params.ridendineCustomerId}'`,
    limit: 1,
  });

  if (existing.data.length > 0) {
    return existing.data[0]!.id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { ridendine_id: params.ridendineCustomerId },
  });

  return customer.id;
}
