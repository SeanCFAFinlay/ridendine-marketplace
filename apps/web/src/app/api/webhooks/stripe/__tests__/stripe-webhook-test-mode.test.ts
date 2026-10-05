/**
 * @jest-environment node
 */

// ==========================================
// STRIPE WEBHOOK — PARTNER TEST-MODE EVENTS
//
// A partner test key transacts against Stripe TEST mode on the same deployment.
// Stripe keeps a separate webhook endpoint per mode, so those events arrive
// signed with a DIFFERENT secret — without the second verification attempt every
// test payment would silently fail signature checks and the order would never
// leave `pending`.
//
// Once verified, a test-signed event must never reach finance, ledgers, payouts
// or the engine's money paths: no real money moved. The guard keys off which
// secret verified the signature rather than `event.livemode`, because a staging
// deployment runs entirely on test keys and must keep exercising the real
// finance paths.
// ==========================================

import { POST } from '../route';
import { headers } from 'next/headers';
import {
  getStripeClient,
  claimStripeWebhookEventForProcessing,
  finalizeStripeWebhookSuccess,
  createLoyaltyService,
  handleStripeFinanceWebhook,
} from '@ridendine/engine';
import { getEngine, getSystemActor } from '@/lib/engine';
import { clearCart, createAdminClient } from '@ridendine/db';

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { webhookStripe: { name: 'webhook_stripe' } },
  evaluateRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  rateLimitPolicyResponse: () =>
    Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 }),
  redactSensitiveForLog: (value: string) => value,
  getCorrelationId: () => 'test-correlation-id',
  withCorrelationId: (response: Response) => response,
}));

jest.mock('next/headers', () => ({ headers: jest.fn() }));

jest.mock('@ridendine/engine', () => ({
  getStripeClient: jest.fn(),
  createLoyaltyService: jest.fn(),
  claimStripeWebhookEventForProcessing: jest.fn(),
  finalizeStripeWebhookSuccess: jest.fn(),
  finalizeStripeWebhookFailure: jest.fn(),
  handleStripeFinanceWebhook: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(),
  clearCart: jest.fn(),
}));

jest.mock('@/lib/engine', () => ({
  getEngine: jest.fn(),
  getSystemActor: jest.fn(),
}));

const LIVE_SECRET = 'whsec_live_secret';
const TEST_SECRET = 'whsec_test_mode_secret';

const TEST_ORDER = {
  id: 'order-test',
  customer_id: 'cust-1',
  subtotal: 12,
  total: 12,
  payment_status: 'pending',
  engine_status: 'draft',
  is_test: true,
};

/**
 * Admin mock whose `eq` is both chainable and awaitable — the test-mode branches
 * scope their writes with two filters, e.g. `.eq('id', x).eq('is_test', true)`.
 */
function adminMock(order: Record<string, unknown> | null, patches: Record<string, unknown>[]) {
  const thenable = (): any => ({
    eq: () => thenable(),
    then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
  });
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: order, error: null }) }),
      }),
      update: (patch: Record<string, unknown>) => {
        patches.push(patch);
        return thenable();
      },
      upsert: async () => ({ data: null, error: null }),
    }),
    rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
  };
}

/** constructEvent that verifies only against the TEST secret, as Stripe would. */
function testSignedEvent(event: Record<string, unknown>) {
  return jest
    .fn()
    .mockImplementation((_body: string, _sig: string, secret: string) => {
      if (secret !== TEST_SECRET) {
        throw new Error('No signatures found matching the expected signature');
      }
      return event;
    });
}

function stubEngine(overrides: Record<string, unknown> = {}) {
  const engine = {
    orderCreation: {
      authorizePayment: jest.fn().mockResolvedValue({ success: true }),
      submitToKitchen: jest.fn().mockResolvedValue({ success: true }),
    },
    orders: {},
    platform: {
      handlePaymentFailure: jest.fn().mockResolvedValue({ success: true }),
      handleExternalRefund: jest.fn().mockResolvedValue({ success: true }),
    },
    events: { emit: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) },
    audit: { log: jest.fn().mockResolvedValue(undefined) },
    ...overrides,
  };
  jest.mocked(getEngine).mockReturnValue(engine as unknown as ReturnType<typeof getEngine>);
  return engine;
}

function post() {
  return POST(
    new Request('http://localhost/api/webhooks/stripe', { method: 'POST', body: '{}' })
  );
}

describe('POST /api/webhooks/stripe — partner test-mode events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = LIVE_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET_TEST = TEST_SECRET;

    jest.mocked(headers).mockResolvedValue({
      get: (name: string) => (name === 'stripe-signature' ? 't=0,v1=sig' : null),
    } as Awaited<ReturnType<typeof headers>>);
    jest
      .mocked(claimStripeWebhookEventForProcessing)
      .mockResolvedValue({ action: 'proceed', rowId: 'row-1' });
    jest.mocked(finalizeStripeWebhookSuccess).mockResolvedValue(undefined);
    jest.mocked(getSystemActor).mockReturnValue({
      userId: 'system',
      role: 'system',
    } as ReturnType<typeof getSystemActor>);
    jest.mocked(clearCart).mockResolvedValue(undefined);
    jest.mocked(createLoyaltyService).mockReturnValue({
      earnPoints: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof createLoyaltyService>);
    stubEngine();
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
  });

  it('verifies against the test secret after the live secret fails', async () => {
    const patches: Record<string, unknown>[] = [];
    jest
      .mocked(createAdminClient)
      .mockReturnValue(adminMock(TEST_ORDER, patches) as ReturnType<typeof createAdminClient>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: testSignedEvent({
          id: 'evt_test_1',
          type: 'payment_intent.succeeded',
          livemode: false,
          data: {
            object: {
              id: 'pi_t1',
              amount: 1200,
              amount_received: 1200,
              metadata: { order_id: 'order-test' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await post();

    expect(res.status).toBe(200);
    expect(patches[0]).toMatchObject({ payment_status: 'completed' });
  });

  it('still rejects a genuinely bad signature when no test secret is set', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET_TEST;
    jest
      .mocked(createAdminClient)
      .mockReturnValue(adminMock(TEST_ORDER, []) as ReturnType<typeof createAdminClient>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockImplementation(() => {
          throw new Error('No signatures found matching the expected signature');
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await post();

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      code: 'WEBHOOK_SIGNATURE_INVALID',
      error: 'Invalid signature',
    });
  });

  it('rejects a bad signature that matches neither secret', async () => {
    jest
      .mocked(createAdminClient)
      .mockReturnValue(adminMock(TEST_ORDER, []) as ReturnType<typeof createAdminClient>);
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: jest.fn().mockImplementation(() => {
          throw new Error('No signatures found matching the expected signature');
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await post();

    expect(res.status).toBe(400);
  });

  it('keeps a successful test payment out of finance and the kitchen', async () => {
    const patches: Record<string, unknown>[] = [];
    jest
      .mocked(createAdminClient)
      .mockReturnValue(adminMock(TEST_ORDER, patches) as ReturnType<typeof createAdminClient>);
    const engine = stubEngine();
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: testSignedEvent({
          id: 'evt_test_2',
          type: 'payment_intent.succeeded',
          livemode: false,
          data: {
            object: {
              id: 'pi_t2',
              amount: 1200,
              amount_received: 1200,
              metadata: { order_id: 'order-test' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await post();

    expect(res.status).toBe(200);
    expect(patches[0]).toMatchObject({ payment_status: 'completed' });
    expect(engine.orderCreation.authorizePayment).not.toHaveBeenCalled();
    expect(engine.orderCreation.submitToKitchen).not.toHaveBeenCalled();
    expect(handleStripeFinanceWebhook).not.toHaveBeenCalled();
  });

  it('records a declined test card without running the live failure path', async () => {
    const patches: Record<string, unknown>[] = [];
    jest
      .mocked(createAdminClient)
      .mockReturnValue(adminMock(TEST_ORDER, patches) as ReturnType<typeof createAdminClient>);
    const engine = stubEngine();
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: testSignedEvent({
          id: 'evt_test_3',
          type: 'payment_intent.payment_failed',
          livemode: false,
          data: {
            object: {
              id: 'pi_t3',
              amount: 1200,
              metadata: { order_id: 'order-test' },
              last_payment_error: { message: 'insufficient funds' },
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await post();

    expect(res.status).toBe(200);
    expect(patches[0]).toMatchObject({ payment_status: 'failed' });
    expect(engine.platform.handlePaymentFailure).not.toHaveBeenCalled();
    expect(handleStripeFinanceWebhook).not.toHaveBeenCalled();
  });

  it('records a test refund without touching ledgers', async () => {
    const patches: Record<string, unknown>[] = [];
    jest
      .mocked(createAdminClient)
      .mockReturnValue(adminMock(TEST_ORDER, patches) as ReturnType<typeof createAdminClient>);
    const engine = stubEngine();
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        constructEvent: testSignedEvent({
          id: 'evt_test_4',
          type: 'charge.refunded',
          livemode: false,
          data: {
            object: {
              id: 'ch_t4',
              payment_intent: 'pi_t4',
              amount: 1200,
              amount_refunded: 1200,
              currency: 'cad',
            },
          },
        }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await post();

    expect(res.status).toBe(200);
    expect(patches[0]).toMatchObject({ payment_status: 'refunded' });
    expect(engine.platform.handleExternalRefund).not.toHaveBeenCalled();
    expect(handleStripeFinanceWebhook).not.toHaveBeenCalled();
  });

  it('still runs finance for a LIVE event while a test secret is configured', async () => {
    const patches: Record<string, unknown>[] = [];
    jest
      .mocked(createAdminClient)
      .mockReturnValue(
        adminMock({ ...TEST_ORDER, is_test: false }, patches) as ReturnType<typeof createAdminClient>
      );
    stubEngine();
    jest.mocked(getStripeClient).mockReturnValue({
      webhooks: {
        // Verifies on the FIRST (live) secret — the normal production path.
        constructEvent: jest
          .fn()
          .mockImplementation((_b: string, _s: string, secret: string) => {
            if (secret !== LIVE_SECRET) throw new Error('wrong secret');
            return {
              id: 'evt_live_1',
              type: 'charge.refunded',
              livemode: true,
              data: {
                object: {
                  id: 'ch_l1',
                  payment_intent: 'pi_l1',
                  amount: 1200,
                  amount_refunded: 1200,
                  currency: 'cad',
                },
              },
            };
          }),
      },
    } as ReturnType<typeof getStripeClient>);

    const res = await post();

    expect(res.status).toBe(200);
    expect(handleStripeFinanceWebhook).toHaveBeenCalledTimes(1);
  });
});
