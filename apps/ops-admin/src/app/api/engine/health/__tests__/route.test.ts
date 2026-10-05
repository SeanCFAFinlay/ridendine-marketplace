/**
 * @jest-environment node
 */

import { GET } from '../route';

const mockCheckSystemHealth = jest.fn();
const mockGetOpsActorContext = jest.fn();
const mockGuardPlatformApi = jest.fn();
const mockListCompletedProcessorRuns = jest.fn();
const mockAdminClient = { __id: 'admin-client' } as unknown as Record<string, unknown>;

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
  listCompletedProcessorRuns: (...args: unknown[]) => mockListCompletedProcessorRuns(...args),
}));

jest.mock('@ridendine/engine', () => ({
  checkSystemHealth: (...args: unknown[]) => mockCheckSystemHealth(...args),
}));

jest.mock('@/lib/engine', () => ({
  getOpsActorContext: () => mockGetOpsActorContext(),
  guardPlatformApi: (...args: unknown[]) => mockGuardPlatformApi(...args),
}));

function installProcessorRunsQuery(
  rows: Array<{ processor_name: string; finished_at: string | null; status: string }>,
) {
  // The route now reads completed runs via the @ridendine/db repository
  // (listCompletedProcessorRuns) instead of a raw builder chain.
  mockListCompletedProcessorRuns.mockResolvedValue(
    rows.map(({ processor_name, finished_at }) => ({ processor_name, finished_at }))
  );
}

describe('GET /api/engine/health readiness', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockGetOpsActorContext.mockResolvedValue({ actor: { role: 'super_admin' } });
    mockGuardPlatformApi.mockReturnValue(null);
    mockCheckSystemHealth.mockResolvedValue({
      overall: { status: 'up', timestamp: '2026-01-01T00:00:00.000Z', details: {} },
      components: {},
    });
    installProcessorRunsQuery([]);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports missing processor secrets in readiness output', async () => {
    delete process.env.CRON_SECRET;
    delete process.env.ENGINE_PROCESSOR_TOKEN;

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    // `required` distinguishes secrets that must be present to boot from the
    // optional ones (Upstash, Resend, Twilio, Sentry) whose absence silently
    // degrades a capability the platform appears to have.
    expect(body.readiness.env.CRON_SECRET).toEqual({ configured: false, required: true });
    expect(body.readiness.env.ENGINE_PROCESSOR_TOKEN).toEqual({ configured: false, required: true });
    expect(body.readiness.env.UPSTASH_REDIS_REST_URL).toEqual(
      expect.objectContaining({ required: false })
    );
    expect(body.readiness.processorRoutes).toEqual(
      expect.objectContaining({
        sla: '/api/engine/processors/sla',
        expiredOffers: '/api/engine/processors/expired-offers',
        partnerWebhooks: '/api/engine/processors/partner-webhooks',
        reconciliationDaily: '/api/engine/processors/reconciliation',
        retention: '/api/engine/processors/retention',
      })
    );
  });

  it('tracks exactly the processors that vercel.json schedules', async () => {
    // Readiness previously listed three processors nothing scheduled (their
    // lastSuccessAt was permanently null) while omitting partner-webhooks,
    // which runs every minute. A signal that always looks broken gets ignored.
    const res = await GET();
    const body = await res.json();

    expect(Object.keys(body.readiness.processorRuns).sort()).toEqual([
      'expired-offers',
      'partner-webhooks',
      'reconciliation-daily',
      'retention',
      'sla',
    ]);
    expect(body.readiness.processorRuns).not.toHaveProperty('payouts-chef-preview');
    expect(body.readiness.processorRuns).not.toHaveProperty('payouts-driver-preview');
  });

  it('reports lastSuccessAt per processor from ops_processor_runs', async () => {
    installProcessorRunsQuery([
      { processor_name: 'sla', finished_at: '2026-05-18T10:00:00.000Z', status: 'completed' },
      { processor_name: 'expired-offers', finished_at: '2026-05-18T09:59:00.000Z', status: 'completed' },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.readiness.processorRuns).toBeDefined();
    expect(body.readiness.processorRuns.sla.lastSuccessAt).toBe('2026-05-18T10:00:00.000Z');
    expect(body.readiness.processorRuns['expired-offers'].lastSuccessAt).toBe('2026-05-18T09:59:00.000Z');
  });

  it('reports lastSuccessAt as null when a processor has no completed runs', async () => {
    installProcessorRunsQuery([
      { processor_name: 'sla', finished_at: '2026-05-18T10:00:00.000Z', status: 'completed' },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(body.readiness.processorRuns.sla.lastSuccessAt).toBe('2026-05-18T10:00:00.000Z');
    expect(body.readiness.processorRuns['expired-offers'].lastSuccessAt).toBeNull();
  });
});
