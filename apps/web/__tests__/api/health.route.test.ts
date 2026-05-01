/**
 * @jest-environment node
 */

const mockLimit = jest.fn();
const mockSelect = jest.fn(() => ({ limit: mockLimit }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockCreateAdminClient = jest.fn(() => ({ from: mockFrom }));

jest.mock('@ridendine/db', () => ({
  createAdminClient: mockCreateAdminClient,
}));

describe('GET /api/health', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    mockLimit.mockResolvedValue({ data: [{ id: '1' }], error: null });
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('reports degraded readiness when distributed rate limit provider is missing in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.STRIPE_SECRET_KEY = 'sk_live_secret_should_not_leak';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_should_not_leak';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { GET } = await import('../../src/app/api/health/route');
    const response = await GET();
    const payload = await response.json();
    const payloadString = JSON.stringify(payload);

    expect(response.status).toBe(200);
    expect(payload.data.readiness).toBe('degraded');
    expect(payload.data.checks.rateLimit).toBe('degraded');
    expect(payload.data.details.rateLimitProvider).toBe('memory');
    expect(payloadString).not.toContain('sk_live_secret_should_not_leak');
    expect(payloadString).not.toContain('whsec_should_not_leak');
  });
});
