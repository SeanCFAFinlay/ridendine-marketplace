/**
 * Payment adapter interface for Stripe operations.
 * Implementations are provided by app-level code to keep Stripe SDK out of the engine.
 */
export interface PaymentAdapter {
  /**
   * Cancel/void a payment intent.
   * Returns true if successfully cancelled, false if already captured or other non-retryable state.
   * Throws on transient failures that should be retried.
   */
  cancelPaymentIntent(paymentIntentId: string): Promise<{ cancelled: boolean; status: string }>;
}
