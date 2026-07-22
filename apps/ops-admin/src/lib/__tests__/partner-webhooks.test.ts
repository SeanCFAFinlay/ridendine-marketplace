/**
 * @jest-environment node
 */

import { createHmac } from 'crypto';
import { enqueuePartnerWebhooks, deliverPartnerWebhooks } from '../partner-webhooks';

/**
 * Minimal chainable Supabase mock: every builder method returns the builder,
 * the builder is awaitable (resolves to { data }), and insert/update capture
 * their arguments. Results + captures are keyed by table name.
 */
function makeAdmin(results: Record<string, unknown>, capture: Record<string, any[]>) {
  function builder(table: string) {
    const b: any = {
      select: () => b,
      in: () => b,
      gte: () => b,
      lte: () => b,
      eq: () => b,
      order: () => b,
      limit: () => b,
      insert: (rows: unknown) => {
        (capture[`${table}:insert`] ??= []).push(rows);
        return b;
      },
      update: (patch: unknown) => {
        (capture[`${table}:update`] ??= []).push(patch);
        return b;
      },
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: (results[table] as unknown) ?? null, error: null }),
    };
    return b;
  }
  return { from: (table: string) => builder(table) } as any;
}

const NOW = 1_700_000_000_000;

describe('enqueuePartnerWebhooks', () => {
  it('creates a delivery for a partner order with a webhook_url, mapping the event', async () => {
    const capture: Record<string, any[]> = {};
    const admin = makeAdmin(
      {
        order_status_history: [
          { id: 'ev-1', new_status: 'ready_for_pickup', order_id: 'order-1', created_at: '2026-06-30T00:00:00Z' },
          { id: 'ev-2', new_status: 'ready_for_pickup', order_id: 'order-no-partner', created_at: '2026-06-30T00:00:00Z' },
        ],
        orders: [
          { id: 'order-1', order_number: 'RD-1', partner_id: 'p1', status: 'ready_for_pickup', engine_status: 'ready', total: 42 },
          { id: 'order-no-partner', order_number: 'RD-2', partner_id: null, status: 'ready_for_pickup', engine_status: 'ready', total: 10 },
        ],
        api_partners: [{ id: 'p1', webhook_url: 'https://partner.test/hook', webhook_secret: 's', is_active: true }],
        partner_webhook_deliveries: [], // none existing
      },
      capture
    );

    const n = await enqueuePartnerWebhooks(admin, NOW);
    expect(n).toBe(1);
    const inserted = capture['partner_webhook_deliveries:insert'][0] as any[];
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      partner_id: 'p1',
      order_id: 'order-1',
      domain_event_id: 'ev-1',
      event_type: 'order.ready',
      status: 'pending',
    });
    expect(inserted[0].payload.order.orderNumber).toBe('RD-1');
  });

  it('enriches out_for_delivery events with the driver + ETA snapshot', async () => {
    const capture: Record<string, any[]> = {};
    const admin = makeAdmin(
      {
        order_status_history: [
          { id: 'ev-1', new_status: 'out_for_delivery', order_id: 'order-1', created_at: '2026-06-30T00:00:00Z' },
        ],
        orders: [
          { id: 'order-1', order_number: 'RD-1', partner_id: 'p1', status: 'out_for_delivery', engine_status: 'out_for_delivery', total: 42 },
        ],
        api_partners: [{ id: 'p1', webhook_url: 'https://partner.test/hook', webhook_secret: 's', is_active: true }],
        deliveries: [
          { id: 'del-1', order_id: 'order-1', driver_id: 'drv-1', status: 'IN_TRANSIT', eta_dropoff_at: '2026-06-30T00:20:00Z', estimated_dropoff_at: null, distance_km: 4.2 },
        ],
        drivers: [
          { id: 'drv-1', first_name: 'Sam', last_name: 'Rider', phone: '+16475551234', vehicle_type: 'car' },
        ],
        partner_webhook_deliveries: [],
      },
      capture
    );

    const n = await enqueuePartnerWebhooks(admin, Date.parse('2026-06-30T00:00:00Z'));
    expect(n).toBe(1);
    const inserted = capture['partner_webhook_deliveries:insert'][0] as any[];
    expect(inserted[0].payload.delivery).toMatchObject({
      status: 'IN_TRANSIT',
      driverName: 'Sam Rider',
      driverPhone: '+16475551234',
      etaMinutes: 20,
      distanceKm: 4.2,
    });
  });

  it('inserts nothing when no partner has a webhook_url', async () => {
    const capture: Record<string, any[]> = {};
    const admin = makeAdmin(
      {
        order_status_history: [{ id: 'ev-1', new_status: 'ready_for_pickup', order_id: 'order-1', created_at: 'x' }],
        orders: [{ id: 'order-1', partner_id: 'p1', order_number: 'RD-1', status: 'ready', engine_status: 'ready', total: 1 }],
        api_partners: [{ id: 'p1', webhook_url: null, webhook_secret: null, is_active: true }],
      },
      capture
    );
    expect(await enqueuePartnerWebhooks(admin, NOW)).toBe(0);
    expect(capture['partner_webhook_deliveries:insert']).toBeUndefined();
  });
});

describe('deliverPartnerWebhooks', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('POSTs an HMAC-signed body and marks the row delivered on 200', async () => {
    const capture: Record<string, any[]> = {};
    const admin = makeAdmin(
      {
        partner_webhook_deliveries: [
          {
            id: 'd-1',
            partner_id: 'p1',
            event_type: 'order.ready',
            payload: { event: 'order.ready', order: { id: 'order-1' } },
            attempts: 0,
            max_attempts: 6,
            api_partners: { webhook_url: 'https://partner.test/hook', webhook_secret: 'shh' },
          },
        ],
      },
      capture
    );

    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = fetchMock as any;

    const res = await deliverPartnerWebhooks(admin, NOW);
    expect(res).toEqual({ delivered: 1, failed: 0 });

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://partner.test/hook');
    const expectedSig = createHmac('sha256', 'shh').update(opts.body).digest('hex');
    expect(opts.headers['X-RideNDine-Signature']).toBe(`sha256=${expectedSig}`);
    expect(opts.headers['X-RideNDine-Event']).toBe('order.ready');
    expect(capture['partner_webhook_deliveries:update'][0]).toMatchObject({ status: 'delivered', attempts: 1 });
  });

  it('schedules a retry with backoff on failure, and goes dead at max attempts', async () => {
    const capture: Record<string, any[]> = {};
    const admin = makeAdmin(
      {
        partner_webhook_deliveries: [
          {
            id: 'd-2', partner_id: 'p1', event_type: 'order.ready', payload: {},
            attempts: 5, max_attempts: 6,
            api_partners: { webhook_url: 'https://partner.test/hook', webhook_secret: 'shh' },
          },
        ],
      },
      capture
    );
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;

    const res = await deliverPartnerWebhooks(admin, NOW);
    expect(res).toEqual({ delivered: 0, failed: 1 });
    expect(capture['partner_webhook_deliveries:update'][0]).toMatchObject({ status: 'dead', attempts: 6, response_code: 500 });
  });
});
