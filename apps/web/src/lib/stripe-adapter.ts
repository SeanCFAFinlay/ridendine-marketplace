// ==========================================
// STRIPE PAYMENT ADAPTER
// Implements PaymentAdapter for real Stripe API calls
// Tier 1: Wire Stripe void/cancel on order rejection/cancellation
// ==========================================

import Stripe from 'stripe';
import type { PaymentAdapter } from '@ridendine/engine';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export const stripePaymentAdapter: PaymentAdapter = {
  async cancelPaymentIntent(paymentIntentId: string): Promise<{ cancelled: boolean; status: string }> {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

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
