// ==========================================
// STRIPE PAYMENT ADAPTER
// Implements PaymentAdapter for real Stripe API calls, so the engine can void
// an uncaptured payment when an order is rejected or cancelled.
//
// This lived in apps/web and was registered ONLY there, which meant chef-admin,
// ops-admin and driver-app all built the engine with paymentAdapter=undefined —
// so a chef rejecting an order in chef-admin could not release the customer's
// card hold. It has no app-specific dependencies, so it belongs here and is now
// the default adapter for every app (see client-helpers.ts).
// ==========================================

import type { PaymentAdapter } from '../types/payment-adapter';
import { getStripeClient, isStripeTestModeConfigured } from './stripe.service';
import type Stripe from 'stripe';

/** Stripe's "this object doesn't exist in this mode" signal. */
function isResourceMissing(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'resource_missing';
}

/**
 * Retrieve a PaymentIntent without being told which mode created it.
 *
 * The cancel path reaches us with only a PaymentIntent id — live and test ids
 * are indistinguishable by shape, and the engine's PaymentAdapter contract
 * carries no mode. A test-mode PI is simply absent from the live account
 * (`resource_missing`), so that error is an unambiguous signal to retry in test
 * mode. Any other Stripe error propagates untouched.
 */
async function retrievePaymentIntentEitherMode(
  paymentIntentId: string
): Promise<{ stripe: Stripe; pi: Stripe.PaymentIntent }> {
  const stripe = getStripeClient();
  try {
    return { stripe, pi: await stripe.paymentIntents.retrieve(paymentIntentId) };
  } catch (error) {
    if (!isResourceMissing(error) || !isStripeTestModeConfigured()) throw error;
    const testStripe = getStripeClient({ testMode: true });
    return { stripe: testStripe, pi: await testStripe.paymentIntents.retrieve(paymentIntentId) };
  }
}

export const stripePaymentAdapter: PaymentAdapter = {
  async cancelPaymentIntent(paymentIntentId: string): Promise<{ cancelled: boolean; status: string }> {
    try {
      // `stripe` here is whichever mode actually owns this PI — cancelling with
      // the other one would 404.
      const { stripe, pi } = await retrievePaymentIntentEitherMode(paymentIntentId);

      // Already cancelled or fully refunded
      if (pi.status === 'canceled') {
        return { cancelled: true, status: 'already_canceled' };
      }

      // If captured (succeeded), can't cancel — needs refund workflow
      if (pi.status === 'succeeded') {
        return { cancelled: false, status: 'already_captured' };
      }

      // Cancel the payment intent (releases the hold)
      const cancelled = await stripe.paymentIntents.cancel(paymentIntentId);
      return { cancelled: cancelled.status === 'canceled', status: cancelled.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[stripe-adapter] cancelPaymentIntent failed:', { paymentIntentId, error: message });
      throw error;
    }
  },
};
