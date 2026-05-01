import { describe, expect, it, vi } from 'vitest';
import {
  claimStripeWebhookEventForProcessing,
  finalizeStripeWebhookFailure,
  finalizeStripeWebhookSuccess,
} from './stripe-webhook-idempotency';

function mockClient(chain: {
  selectExisting?: { id: string; processing_status: string } | null;
  insertErrorCode?: string;
  insertRow?: { id: string };
}) {
  const stripeTable = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: chain.selectExisting ?? null,
          error: null,
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: chain.insertRow ?? { id: 'new-row' },
          error: chain.insertErrorCode
            ? { code: chain.insertErrorCode, message: 'unique' }
            : null,
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'stripe_events_processed') return stripeTable;
      return {};
    }),
  };
  return { client: client as any, stripeTable };
}

describe('stripe-webhook-idempotency', () => {
  it('skips when row already processed', async () => {
    const { client } = mockClient({
      selectExisting: { id: '1', processing_status: 'processed' },
    });
    const r = await claimStripeWebhookEventForProcessing(client, {
      stripeEventId: 'evt_1',
      eventType: 'payment_intent.succeeded',
      livemode: false,
    });
    expect(r).toEqual({ action: 'skip_already_processed' });
  });

  it('skips when another worker holds processing', async () => {
    const { client } = mockClient({
      selectExisting: { id: '1', processing_status: 'processing' },
    });
    const r = await claimStripeWebhookEventForProcessing(client, {
      stripeEventId: 'evt_1',
      eventType: 'payment_intent.succeeded',
      livemode: false,
    });
    expect(r).toEqual({ action: 'skip_in_flight' });
  });

  it('inserts new claim when no row', async () => {
    const { client } = mockClient({
      selectExisting: null,
      insertRow: { id: 'claim-uuid' },
    });
    const r = await claimStripeWebhookEventForProcessing(client, {
      stripeEventId: 'evt_new',
      eventType: 'charge.refunded',
      livemode: false,
      relatedOrderId: null,
    });
    expect(r).toEqual({ action: 'proceed', rowId: 'claim-uuid' });
  });

  it('treats unique violation on insert as in-flight skip', async () => {
    const { client } = mockClient({
      selectExisting: null,
      insertErrorCode: '23505',
    });
    const r = await claimStripeWebhookEventForProcessing(client, {
      stripeEventId: 'evt_race',
      eventType: 'payment_intent.succeeded',
      livemode: false,
    });
    expect(r).toEqual({ action: 'skip_in_flight' });
  });

  it('resumes failed row for Stripe retry', async () => {
    const { client, stripeTable } = mockClient({
      selectExisting: { id: 'row-f', processing_status: 'failed' },
    });
    const r = await claimStripeWebhookEventForProcessing(client, {
      stripeEventId: 'evt_retry',
      eventType: 'payment_intent.succeeded',
      livemode: false,
      relatedOrderId: 'order-1',
    });
    expect(r).toEqual({ action: 'proceed', rowId: 'row-f' });
    expect(stripeTable.update).toHaveBeenCalled();
  });

  it('finalizeSuccess updates by stripe_event_id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq })),
      })),
    } as any;
    await finalizeStripeWebhookSuccess(client, 'evt_x', 'order-9');
    expect(eq).toHaveBeenCalledWith('stripe_event_id', 'evt_x');
  });

  it('finalizeFailure truncates long message', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const client = {
      from: vi.fn(() => ({ update })),
    } as any;
    const long = 'x'.repeat(3000);
    await finalizeStripeWebhookFailure(client, 'evt_y', long);
    expect(update).toHaveBeenCalled();
    const calls = update.mock.calls as unknown as [[{ error_message?: string }]];
    const updateArg = calls[0][0];
    expect(String(updateArg.error_message).length).toBeLessThanOrEqual(2000);
  });
});
