/**
 * @jest-environment node
 */

import { POST } from '../route';

const mockGetCartWithItems = jest.fn();
const mockCreateAdminClient = jest.fn();
const mockAssertStripeConfigured = jest.fn();
const mockGetStripeClient = jest.fn();
const mockEvaluateCheckoutRisk = jest.fn();
const mockValidateReadiness = jest.fn();
const mockCreateOrder = jest.fn();
const mockAuthorizePayment = jest.fn();
const mockCancelOrder = jest.fn();
const mockAuditLog = jest.fn();
const mockGetCustomerActorContext = jest.fn();
const mockCheckRateLimit = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => mockCreateAdminClient(),
  getCartWithItems: (...args: unknown[]) => mockGetCartWithItems(...args),
  clearCart: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@ridendine/engine', () => ({
  getStripeClient: () => mockGetStripeClient(),
  assertStripeConfigured: () => mockAssertStripeConfigured(),
  evaluateCheckoutRisk: (...args: unknown[]) => mockEvaluateCheckoutRisk(...args),
  BASE_DELIVERY_FEE: 500,
  SERVICE_FEE_PERCENT: 8,
  HST_RATE: 13,
}));

jest.mock('@/lib/engine', () => ({
  getEngine: () => ({
    kitchen: { validateCustomerCheckoutReadiness: (...args: unknown[]) => mockValidateReadiness(...args) },
    orders: {
      createOrder: (...args: unknown[]) => mockCreateOrder(...args),
      authorizePayment: (...args: unknown[]) => mockAuthorizePayment(...args),
      cancelOrder: (...args: unknown[]) => mockCancelOrder(...args),
    },
    audit: { log: (...args: unknown[]) => mockAuditLog(...args) },
  }),
  getCustomerActorContext: () => mockGetCustomerActorContext(),
  errorResponse: (code: string, message: string, status = 400) =>
    Response.json({ success: false, code, error: message }, { status }),
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
}));

jest.mock('@ridendine/utils', () => ({
  getClientIp: () => '127.0.0.1',
  RATE_LIMITS: { checkout: {} },
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  rateLimitResponse: () => Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 }),
}));

type IdemRecord = {
  id: string;
  customer_id: string;
  idempotency_key: string;
  request_hash: string;
  status: 'processing' | 'completed' | 'failed';
  order_id: string | null;
  payment_intent_id: string | null;
  response_payload: Record<string, unknown> | null;
  last_error: string | null;
  updated_at?: string;
};

function createAdminClientMock() {
  const idemTable = new Map<string, IdemRecord>();
  const menuRows = [
    {
      id: 'menu-1',
      storefront_id: '11111111-1111-1111-1111-111111111111',
      price: 12,
      is_available: true,
      is_sold_out: false,
    },
  ];

  return {
    __idemTable: idemTable,
    __menuRows: menuRows,
    from(table: string) {
      if (table === 'menu_items') {
        return {
          select: () => ({
            in: async () => ({ data: menuRows, error: null }),
          }),
        };
      }
      if (table === 'promo_codes') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: null }),
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === 'checkout_idempotency_keys') {
        return {
          select: () => {
            const filter: { customerId?: string; key?: string } = {};
            const chain = {
              eq: (col: string, value: string) => {
                if (col === 'customer_id') filter.customerId = value;
                if (col === 'idempotency_key') filter.key = value;
                return chain;
              },
              maybeSingle: async () => ({
                data: filter.customerId && filter.key ? idemTable.get(`${filter.customerId}:${filter.key}`) ?? null : null,
                error: null,
              }),
            };
            return chain;
          },
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                const key = `${row.customer_id}:${row.idempotency_key}`;
                const created: IdemRecord = {
                  id: 'idem-1',
                  customer_id: row.customer_id as string,
                  idempotency_key: row.idempotency_key as string,
                  request_hash: row.request_hash as string,
                  status: row.status as IdemRecord['status'],
                  order_id: null,
                  payment_intent_id: null,
                  response_payload: null,
                  last_error: null,
                };
                idemTable.set(key, created);
                return { data: created, error: null };
              },
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              for (const [key, value] of idemTable.entries()) {
                idemTable.set(key, { ...value, ...patch });
              }
              return { data: null, error: null };
            },
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
          }),
        }),
      };
    },
    rpc: async () => ({ data: true, error: null }),
  };
}

function buildRequest(body: Record<string, unknown>, idempotencyKey?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return new Request('http://localhost/api/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('POST /api/checkout Phase C hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ allowed: true });
    mockGetCustomerActorContext.mockResolvedValue({
      customerId: 'cust-1',
      actor: { userId: 'user-1', role: 'customer', entityId: 'cust-1' },
    });
    mockGetCartWithItems.mockResolvedValue({
      id: 'cart-1',
      cart_items: [{ menu_item_id: 'menu-1', quantity: 1, unit_price: 12 }],
    });
    mockEvaluateCheckoutRisk.mockReturnValue({ allowed: true, reasons: [], auditPayload: {} });
    mockValidateReadiness.mockResolvedValue({ ok: true });
    mockCreateOrder.mockResolvedValue({
      success: true,
      data: { id: 'order-1', order_number: 'RD-1', total: 19.21 },
    });
    mockAuthorizePayment.mockResolvedValue({ success: true });
    mockGetStripeClient.mockReturnValue({
      paymentIntents: {
        create: jest.fn().mockResolvedValue({
          id: 'pi_1',
          client_secret: 'cs_1',
        }),
      },
    });
    mockCreateAdminClient.mockReturnValue(createAdminClientMock());
  });

  it('rejects modified client totals', async () => {
    const res = await POST(
      buildRequest({
        storefrontId: '11111111-1111-1111-1111-111111111111',
        deliveryAddressId: '22222222-2222-2222-2222-222222222222',
        tip: 0,
        clientTotal: 1,
      })
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('rejects unavailable menu item', async () => {
    const adminClient = createAdminClientMock();
    adminClient.__menuRows[0].is_available = false;
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(
      buildRequest({
        storefrontId: '11111111-1111-1111-1111-111111111111',
        deliveryAddressId: '22222222-2222-2222-2222-222222222222',
      })
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(mockCreateOrder).not.toHaveBeenCalled();
  });

  it('rejects cart item belonging to a different storefront', async () => {
    const adminClient = createAdminClientMock();
    adminClient.__menuRows[0].storefront_id = '33333333-3333-3333-3333-333333333333';
    mockCreateAdminClient.mockReturnValue(adminClient);

    const res = await POST(
      buildRequest({
        storefrontId: '11111111-1111-1111-1111-111111111111',
        deliveryAddressId: '22222222-2222-2222-2222-222222222222',
      })
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('accepts valid checkout and returns server-calculated totals', async () => {
    const res = await POST(
      buildRequest({
        storefrontId: '11111111-1111-1111-1111-111111111111',
        deliveryAddressId: '22222222-2222-2222-2222-222222222222',
        tip: 2,
      })
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.orderId).toBe('order-1');
    expect(body.data.total).toBeGreaterThan(0);
  });

  it('replays the same idempotency key without creating duplicate order/payment', async () => {
    const first = await POST(
      buildRequest(
        {
          storefrontId: '11111111-1111-1111-1111-111111111111',
          deliveryAddressId: '22222222-2222-2222-2222-222222222222',
          tip: 1,
        },
        'idem-key-1'
      )
    );
    expect(first.status).toBe(200);

    const second = await POST(
      buildRequest(
        {
          storefrontId: '11111111-1111-1111-1111-111111111111',
          deliveryAddressId: '22222222-2222-2222-2222-222222222222',
          tip: 1,
        },
        'idem-key-1'
      )
    );
    expect(second.status).toBe(200);
    expect(mockCreateOrder).toHaveBeenCalledTimes(1);
  });
});
