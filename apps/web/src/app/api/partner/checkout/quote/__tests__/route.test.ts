/**
 * @jest-environment node
 */

// ==========================================
// PARTNER QUOTE ROUTE TESTS
// Regression coverage for the COOCO integration report (2026-08): the quote
// route validated against partnerCheckoutSchema, so the payload published in
// RIDENDINE_PARTNER_API.md §2.3 (no `customer` block — a quote never touches a
// customer) was rejected with a bare `VALIDATION_ERROR: "Required"`, identical
// to the error an empty `{}` produced. Undiagnosable from the partner's side.
// ==========================================

import { POST } from '../route';

const mockEvaluateRateLimit = jest.fn();
const mockResolvePartner = jest.fn();
const mockBuildPartnerQuote = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => ({ __admin: true }),
}));

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { partnerCheckout: { name: 'partner_checkout' } },
  evaluateRateLimit: (...args: unknown[]) => mockEvaluateRateLimit(...args),
  rateLimitPolicyResponse: () =>
    Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 }),
}));

jest.mock('@/lib/engine', () => ({
  errorResponse: (
    code: string,
    message: string,
    status = 400,
    details?: Array<{ field: string; message: string }>
  ) =>
    Response.json(
      { success: false, code, error: message, ...(details && { details }) },
      { status }
    ),
  successResponse: (data: unknown, status = 200) =>
    Response.json({ success: true, data }, { status }),
}));

jest.mock('@/lib/partner/auth', () => ({
  resolvePartnerContext: (...args: unknown[]) => mockResolvePartner(...args),
  partnerHasScope: (ctx: { scopes: string[] }, scope: string) => ctx.scopes.includes(scope),
}));

jest.mock('@/lib/partner/rate-limit', () => ({
  enforcePartnerRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/partner/signing', () => ({
  verifyPartnerSignature: jest.fn().mockReturnValue({ ok: true }),
}));

jest.mock('@/lib/checkout/quote', () => ({
  buildPartnerQuote: (...args: unknown[]) => mockBuildPartnerQuote(...args),
}));

/** The exact body published in RIDENDINE_PARTNER_API.md §2.3 — no `customer`. */
const DOCUMENTED_QUOTE_BODY = {
  storefrontId: '11111111-1111-1111-1111-111111111111',
  deliveryAddress: {
    addressLine1: '123 King St W',
    city: 'Hamilton',
    state: 'ON',
    postalCode: 'L8P 1A1',
  },
  items: [{ menuItemId: '22222222-2222-2222-2222-222222222222', quantity: 2 }],
};

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/partner/checkout/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('POST /api/partner/checkout/quote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateRateLimit.mockResolvedValue({ allowed: true });
    mockResolvePartner.mockResolvedValue({
      partnerId: 'p1',
      partnerName: 'COOCO',
      testMode: true,
      scopes: ['quote', 'checkout', 'cancel'],
      keyId: 'k1',
      rateLimitPerMin: 120,
      requireSignature: false,
      signingSecret: null,
    });
    mockBuildPartnerQuote.mockResolvedValue({
      ok: true,
      value: {
        quote: {
          subtotal: 62,
          deliveryFee: 5.99,
          serviceFee: 3.1,
          tax: 9.24,
          tip: 0,
          discount: 0,
          total: 80.33,
        },
        deliveryDistanceKm: 4.23,
        deliverySurgeMultiplier: 1.0,
      },
    });
  });

  it('accepts the documented quote body without a customer block', async () => {
    const res = await POST(buildRequest(DOCUMENTED_QUOTE_BODY, { 'x-api-key': 'k' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.breakdown.total).toBe(80.33);
    expect(mockBuildPartnerQuote).toHaveBeenCalledTimes(1);
  });

  it('accepts — and ignores — a customer block when one is sent', async () => {
    const res = await POST(
      buildRequest(
        { ...DOCUMENTED_QUOTE_BODY, customer: { email: 'd@example.com', firstName: 'Jane' } },
        { 'x-api-key': 'k' }
      )
    );

    expect(res.status).toBe(200);
    // The quote is priced from items + address only; no customer is passed on.
    expect(mockBuildPartnerQuote.mock.calls[0][0]).not.toHaveProperty('customer');
  });

  it('names the offending fields instead of a bare "Required"', async () => {
    const res = await POST(buildRequest({}, { 'x-api-key': 'k' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.error).not.toBe('Required');
    expect(body.error).toContain('storefrontId');
    expect(body.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['storefrontId', 'deliveryAddress', 'items'])
    );
    expect(mockBuildPartnerQuote).not.toHaveBeenCalled();
  });

  it('distinguishes an empty payload from a partially-valid one', async () => {
    const emptyRes = await POST(buildRequest({}, { 'x-api-key': 'k' }));
    const partialRes = await POST(
      buildRequest({ storefrontId: DOCUMENTED_QUOTE_BODY.storefrontId }, { 'x-api-key': 'k' })
    );

    expect((await emptyRes.json()).error).not.toBe((await partialRes.json()).error);
  });

  it('locates a bad item by index', async () => {
    const res = await POST(
      buildRequest(
        { ...DOCUMENTED_QUOTE_BODY, items: [{ menuItemId: 'nope', quantity: 1 }] },
        { 'x-api-key': 'k' }
      )
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details.map((d: { field: string }) => d.field)).toContain('items[0].menuItemId');
  });

  it('rejects requests without a valid partner key', async () => {
    mockResolvePartner.mockResolvedValue(null);
    const res = await POST(buildRequest(DOCUMENTED_QUOTE_BODY));

    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('UNAUTHORIZED');
    expect(mockBuildPartnerQuote).not.toHaveBeenCalled();
  });

  it('rejects a key without the quote scope (403)', async () => {
    mockResolvePartner.mockResolvedValue({
      partnerId: 'p1',
      partnerName: 'X',
      scopes: ['checkout'],
      keyId: 'k1',
      rateLimitPerMin: 120,
      requireSignature: false,
      signingSecret: null,
    });
    const res = await POST(buildRequest(DOCUMENTED_QUOTE_BODY, { 'x-api-key': 'k' }));

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('FORBIDDEN_SCOPE');
    expect(mockBuildPartnerQuote).not.toHaveBeenCalled();
  });

  it('returns 400 on malformed JSON without invoking the pricing engine', async () => {
    const res = await POST(
      new Request('http://localhost/api/partner/checkout/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': 'k' },
        body: '{ not json',
      })
    );

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('VALIDATION_ERROR');
    expect(mockBuildPartnerQuote).not.toHaveBeenCalled();
  });
});
