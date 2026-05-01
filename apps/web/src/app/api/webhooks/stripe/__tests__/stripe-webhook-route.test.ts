/**
 * @jest-environment node
 */
import { POST } from '../route';
import { headers } from 'next/headers';
import { getStripeClient } from '@ridendine/engine';
import {
  claimStripeWebhookEventForProcessing,
  finalizeStripeWebhookSuccess,
} from '@ridendine/engine';
import { getEngine } from '@/lib/engine';

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

jest.mock('@ridendine/engine', () => ({
  getStripeClient: jest.fn(),
  claimStripeWebhookEventForProcessing: jest.fn(),
  finalizeStripeWebhookSuccess: jest.fn(),
  finalizeStripeWebhookFailure: jest.fn(),
}));

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/engine', () => ({
  getEngine: jest.fn(),
  getSystemActor: jest.fn(),
}));

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    jest.clearAllMocks();
    jest.mocked(getEngine).mockReturnValue({
      orders: { submitToKitchen: jest.fn().mockResolvedValue({ success: true }) },
      platform: {
        handlePaymentFailure: jest.fn().mockResolvedValue({ success: true }),
        handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
      },
      events: { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) },
      audit: { log: jest.fn().mockResolvedValue(undefined) },
    } as unknown as ReturnType<typeof getEngine>);
    jest
      .mocked(claimStripeWebhookEventForProcessing)
      .mockResolvedValue({ action: 'proceed', rowId: 'row-1' });
    jest.mocked(finalizeStripeWebhookSuccess).mockResolvedValue(undefined);
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    jest.mocked(headers).mockResolvedValue({
      get: () => null,
    } as Awaited<ReturnType<typeof headers>>);

    const req = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      code: 'WEBHOOK_SIGNATURE_INVALID',
      error: 'Missing signature',
    });
    expect(getStripeClient).not.toHaveBeenCalled();
  });

  it('returns 400 when signature verification fails', async () => {
    jest.mocked(headers).mockResolvedValue({
      get: (name: string) =>
        name === 'stripe-signature' ? 't=0,v1=invalid' : null,
    } as Awaited<ReturnType<typeof headers>>);

    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockImplementation(() => {
          throw new Error('No signatures found matching the expected signature');
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const req = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: '{"id":"evt_test"}',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      code: 'WEBHOOK_SIGNATURE_INVALID',
      error: 'Invalid signature',
    });
  });

  it('returns idempotent replay when event already processed', async () => {
    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_1',
          type: 'payment_intent.succeeded',
          livemode: false,
          data: { object: { metadata: { order_id: 'order-1' } } },
        }),
      },
    } as ReturnType<typeof getStripeClient>);
    jest
      .mocked(claimStripeWebhookEventForProcessing)
      .mockResolvedValue({ action: 'skip_already_processed' });

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      received: true,
      idempotentReplay: true,
      reason: 'skip_already_processed',
    });
    expect(finalizeStripeWebhookSuccess).not.toHaveBeenCalled();
  });

  it('handles payment success exactly once', async () => {
    const submitToKitchen = jest.fn().mockResolvedValue({ success: true });
    const events = { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    jest.mocked(getEngine).mockReturnValue({
      orders: { submitToKitchen },
      platform: {
        handlePaymentFailure: jest.fn().mockResolvedValue({ success: true }),
        handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
      },
      events,
      audit,
    } as unknown as ReturnType<typeof getEngine>);
    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_2',
          type: 'payment_intent.succeeded',
          livemode: false,
          data: {
            object: {
              id: 'pi_123',
              amount: 1200,
              metadata: { order_id: 'order-1', order_number: 'RD-1' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    expect(submitToKitchen).toHaveBeenCalledTimes(1);
    expect(finalizeStripeWebhookSuccess).toHaveBeenCalledTimes(1);
  });

  it('handles payment failure without confirming order', async () => {
    const submitToKitchen = jest.fn().mockResolvedValue({ success: true });
    const handlePaymentFailure = jest.fn().mockResolvedValue({ success: true });
    jest.mocked(getEngine).mockReturnValue({
      orders: { submitToKitchen },
      platform: {
        handlePaymentFailure,
        handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
      },
      events: { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) },
      audit: { log: jest.fn().mockResolvedValue(undefined) },
    } as unknown as ReturnType<typeof getEngine>);
    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_3',
          type: 'payment_intent.payment_failed',
          livemode: false,
          data: {
            object: {
              id: 'pi_999',
              metadata: { order_id: 'order-2', order_number: 'RD-2' },
              last_payment_error: { message: 'card declined' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    expect(handlePaymentFailure).toHaveBeenCalledTimes(1);
    expect(submitToKitchen).not.toHaveBeenCalled();
  });

  it('safely ignores unknown event types', async () => {
    jest.mocked(headers).mockResolvedValue({
      get: () => 't=1,v1=valid',
    } as Awaited<ReturnType<typeof headers>>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockReturnValue({
          id: 'evt_4',
          type: 'customer.created',
          livemode: false,
          data: { object: {} },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
  });
});
