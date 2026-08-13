// ==========================================
// STRIPE ADAPTER TESTS
// TDD: Red-Green-Refactor for stripe-adapter.ts
// ==========================================

process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
// Enables the live→test fallback path; a test-mode PaymentIntent is invisible
// to the live client, so cancelling one has to retry in test mode.
process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_fake_test_mode';

jest.mock('stripe', () => {
  const retrieve = jest.fn();
  const cancel = jest.fn();

  const MockStripe = jest.fn().mockImplementation(() => ({
    paymentIntents: { retrieve, cancel },
  }));

  // Attach fns to constructor so tests can access via jest.requireMock
  (MockStripe as any).__retrieve = retrieve;
  (MockStripe as any).__cancel = cancel;

  return MockStripe;
});

import Stripe from 'stripe';
import { stripePaymentAdapter } from '../lib/stripe-adapter';

// Access the shared mock functions
const MockStripe = Stripe as unknown as jest.MockedClass<typeof Stripe> & {
  __retrieve: jest.Mock;
  __cancel: jest.Mock;
};

describe('stripePaymentAdapter', () => {
  let mockRetrieve: jest.Mock;
  let mockCancel: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRetrieve = (MockStripe as any).__retrieve;
    mockCancel = (MockStripe as any).__cancel;
  });

  describe('cancelPaymentIntent', () => {
    it('returns already_canceled when intent is already canceled', async () => {
      mockRetrieve.mockResolvedValue({ status: 'canceled' });

      const result = await stripePaymentAdapter.cancelPaymentIntent('pi_123');

      expect(result).toEqual({ cancelled: true, status: 'already_canceled' });
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('returns already_captured when intent has succeeded', async () => {
      mockRetrieve.mockResolvedValue({ status: 'succeeded' });

      const result = await stripePaymentAdapter.cancelPaymentIntent('pi_456');

      expect(result).toEqual({ cancelled: false, status: 'already_captured' });
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('cancels a requires_payment_method intent and returns cancelled true', async () => {
      mockRetrieve.mockResolvedValue({ status: 'requires_payment_method' });
      mockCancel.mockResolvedValue({ status: 'canceled' });

      const result = await stripePaymentAdapter.cancelPaymentIntent('pi_789');

      expect(mockCancel).toHaveBeenCalledWith('pi_789');
      expect(result).toEqual({ cancelled: true, status: 'canceled' });
    });

    it('cancels a requires_capture intent and returns correct status', async () => {
      mockRetrieve.mockResolvedValue({ status: 'requires_capture' });
      mockCancel.mockResolvedValue({ status: 'canceled' });

      const result = await stripePaymentAdapter.cancelPaymentIntent('pi_capture');

      expect(mockCancel).toHaveBeenCalledWith('pi_capture');
      expect(result).toEqual({ cancelled: true, status: 'canceled' });
    });

    it('throws and re-throws when stripe returns an error', async () => {
      mockRetrieve.mockRejectedValue(new Error('Stripe API error'));

      await expect(stripePaymentAdapter.cancelPaymentIntent('pi_bad')).rejects.toThrow('Stripe API error');
    });

    // ==========================================
    // TEST-MODE ORDERS (partner rdk_test_ keys / 4242 card)
    // The engine's PaymentAdapter contract passes only a PaymentIntent id, and
    // live/test ids are indistinguishable — so cancelling a test-mode order has
    // to discover the mode from Stripe's `resource_missing`.
    // ==========================================
    it('retries in test mode when the intent is absent from the live account', async () => {
      const missing = Object.assign(new Error('No such payment_intent'), {
        code: 'resource_missing',
      });
      mockRetrieve
        .mockRejectedValueOnce(missing)
        .mockResolvedValueOnce({ status: 'requires_payment_method' });
      mockCancel.mockResolvedValue({ status: 'canceled' });

      const result = await stripePaymentAdapter.cancelPaymentIntent('pi_test_mode');

      expect(mockRetrieve).toHaveBeenCalledTimes(2);
      expect(mockCancel).toHaveBeenCalledWith('pi_test_mode');
      expect(result).toEqual({ cancelled: true, status: 'canceled' });
    });

    it('does not retry for errors other than resource_missing', async () => {
      const rateLimited = Object.assign(new Error('Too many requests'), {
        code: 'rate_limit',
      });
      mockRetrieve.mockRejectedValue(rateLimited);

      await expect(stripePaymentAdapter.cancelPaymentIntent('pi_rl')).rejects.toThrow(
        'Too many requests'
      );
      expect(mockRetrieve).toHaveBeenCalledTimes(1);
      expect(mockCancel).not.toHaveBeenCalled();
    });

    it('surfaces the original error when the intent is missing from BOTH modes', async () => {
      const missing = Object.assign(new Error('No such payment_intent'), {
        code: 'resource_missing',
      });
      mockRetrieve.mockRejectedValue(missing);

      await expect(stripePaymentAdapter.cancelPaymentIntent('pi_nowhere')).rejects.toThrow(
        'No such payment_intent'
      );
      expect(mockRetrieve).toHaveBeenCalledTimes(2);
      expect(mockCancel).not.toHaveBeenCalled();
    });
  });
});
