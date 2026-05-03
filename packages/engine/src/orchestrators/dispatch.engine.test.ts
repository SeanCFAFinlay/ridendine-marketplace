import { describe, expect, it, vi, beforeEach } from 'vitest';
import { calculateDriverAssignmentScore, DispatchEngine } from './dispatch.engine';

const { mockRankDrivers, mockGetPlatform } = vi.hoisted(() => ({
  mockRankDrivers: vi.fn(),
  mockGetPlatform: vi.fn(),
}));

vi.mock('@ridendine/db', () => ({
  getPlatformSettings: (...args: unknown[]) => mockGetPlatform(...args),
}));

function platformDefaults() {
  return {
    dispatchRadiusKm: 20,
    offerTimeoutSeconds: 90,
    maxAssignmentAttempts: 3,
    platformFeePercent: 10,
    serviceFeePercent: 5,
    hstRate: 13,
    minOrderAmount: 15,
    maxDeliveryDistanceKm: 25,
    defaultPrepTimeMinutes: 30,
    autoAssignEnabled: true,
    refundAutoReviewThresholdCents: 0,
    supportSlaWarningMinutes: 60,
    supportSlaBreachMinutes: 120,
    storefrontThrottleOrderLimit: 100,
    storefrontThrottleWindowMinutes: 60,
    storefrontAutoPauseEnabled: false,
    storefrontPauseOnSlaBreach: false,
    updatedAt: new Date().toISOString(),
  };
}

function makeDispatchEngine(
  client: unknown,
  extras?: { broadcastDriverOffer?: ReturnType<typeof vi.fn>; eta?: unknown }
) {
  const broadcastDriverOffer = extras?.broadcastDriverOffer ?? vi.fn().mockResolvedValue(undefined);
  return {
    engine: new DispatchEngine(
      client as any,
      {
        emit: vi.fn(),
        flush: vi.fn().mockResolvedValue(undefined),
        broadcastDriverOffer,
      } as any,
      { log: vi.fn().mockResolvedValue(null), logOverride: vi.fn(), logStatusChange: vi.fn() } as any,
      { startTimer: vi.fn(), completeTimer: vi.fn() } as any,
      extras?.eta as any
    ),
    broadcastDriverOffer,
  };
}

describe('calculateDriverAssignmentScore', () => {
  it('prefers the closer and less loaded driver', () => {
    const closer = calculateDriverAssignmentScore({
      id: '1',
      user_id: 'u1',
      first_name: 'Closer',
      last_name: 'Driver',
      approval_state: 'approved',
      presence_status: 'online',
      distance_km: 2,
      estimated_minutes: 8,
      rating: 4.8,
      total_deliveries: 120,
      active_workload: 0,
      recent_declines: 0,
      recent_expiries: 0,
      fairness_score: 1,
    });

    const fartherBusy = calculateDriverAssignmentScore({
      id: '2',
      user_id: 'u2',
      first_name: 'Busy',
      last_name: 'Driver',
      approval_state: 'approved',
      presence_status: 'online',
      distance_km: 7,
      estimated_minutes: 18,
      rating: 4.9,
      total_deliveries: 400,
      active_workload: 2,
      recent_declines: 1,
      recent_expiries: 1,
      fairness_score: 0.33,
    });

    expect(closer).toBeGreaterThan(fartherBusy);
  });

  it('penalizes decline and expiry history', () => {
    const cleanDriver = calculateDriverAssignmentScore({
      id: '1',
      user_id: 'u1',
      first_name: 'Clean',
      last_name: 'Driver',
      approval_state: 'approved',
      presence_status: 'online',
      distance_km: 4,
      estimated_minutes: 12,
      rating: 4.7,
      total_deliveries: 200,
      active_workload: 0,
      recent_declines: 0,
      recent_expiries: 0,
      fairness_score: 1,
    });

    const unreliableDriver = calculateDriverAssignmentScore({
      id: '2',
      user_id: 'u2',
      first_name: 'Unreliable',
      last_name: 'Driver',
      approval_state: 'approved',
      presence_status: 'online',
      distance_km: 4,
      estimated_minutes: 12,
      rating: 4.7,
      total_deliveries: 200,
      active_workload: 0,
      recent_declines: 3,
      recent_expiries: 2,
      fairness_score: 1,
    });

    expect(cleanDriver).toBeGreaterThan(unreliableDriver);
  });
});

describe('DispatchEngine dispatch chain (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlatform.mockResolvedValue(platformDefaults());
    mockRankDrivers.mockResolvedValue([
      { driverId: 'd-far', seconds: 400 },
      { driverId: 'd-near', seconds: 120 },
    ]);
  });

  it('offerToNextDriver ranks via EtaService and broadcasts sanitized payload on offer channel', async () => {
    const deliveryRow = {
      id: 'del-1',
      order_id: 'ord-1',
      status: 'pending',
      pickup_lat: 43.7,
      pickup_lng: -79.4,
      dropoff_lat: 43.72,
      dropoff_lng: -79.38,
      pickup_address: '1 Chef St',
      dropoff_address: '9 Cust Rd',
      assignment_attempts_count: 0,
      estimated_distance_km: 3,
      driver_payout: 8.5,
    };

    const driverNear = {
      id: 'd-near',
      user_id: 'u-near',
      first_name: 'N',
      last_name: 'ear',
      status: 'approved',
      rating: 4.9,
      total_deliveries: 10,
      driver_presence: {
        status: 'online',
        current_lat: 43.71,
        current_lng: -79.41,
        updated_at: new Date().toISOString(),
      },
    };
    const driverFar = {
      id: 'd-far',
      user_id: 'u-far',
      first_name: 'F',
      last_name: 'ar',
      status: 'approved',
      rating: 4.8,
      total_deliveries: 20,
      driver_presence: {
        status: 'online',
        current_lat: 43.5,
        current_lng: -79.2,
        updated_at: new Date().toISOString(),
      },
    };

    let assignmentSelectCalls = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'deliveries') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: deliveryRow, error: null }),
              }),
              in: () => ({
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === 'assignment_attempts') {
          assignmentSelectCalls += 1;
          if (assignmentSelectCalls === 1) {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    gt: () => ({
                      maybeSingle: () => Promise.resolve({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (assignmentSelectCalls === 2) {
            return {
              select: () => ({
                in: () => ({
                  gte: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            };
          }
          if (assignmentSelectCalls === 3) {
            return {
              select: () => ({
                eq: () => ({
                  in: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            };
          }
          if (assignmentSelectCalls === 4) {
            return {
              insert: () => ({
                select: () => ({
                  single: () =>
                    Promise.resolve({
                      data: {
                        id: 'att-1',
                        attempt_number: 1,
                        offered_at: new Date().toISOString(),
                        expires_at: new Date(Date.now() + 90000).toISOString(),
                        distance_meters: 1000,
                        estimated_minutes: 2,
                      },
                      error: null,
                    }),
                }),
              }),
            };
          }
          return {};
        }
        if (table === 'drivers') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [driverNear, driverFar], error: null }),
              }),
            }),
          };
        }
        if (table === 'service_areas') {
          return {
            select: () => ({
              eq: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'notifications') {
          return { insert: () => Promise.resolve({ error: null }) };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      }),
    };

    const { engine, broadcastDriverOffer } = makeDispatchEngine(client, {
      eta: { rankDrivers: mockRankDrivers },
    });

    const res = await engine.offerToNextDriver('del-1', { userId: 'sys', role: 'system' });
    expect(res.success).toBe(true);
    expect(mockRankDrivers).toHaveBeenCalled();
    expect(broadcastDriverOffer).toHaveBeenCalledTimes(1);
    expect(broadcastDriverOffer).toHaveBeenCalledWith(
      'd-near',
      expect.objectContaining({
        attemptId: 'att-1',
        deliveryId: 'del-1',
        pickupAddress: '1 Chef St',
      }),
      'offer'
    );
  });

  it('respondToOffer rejects wrong driverId', async () => {
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: { driver_id: 'drv-a' },
                error: null,
              }),
          }),
        }),
      })),
    };
    const { engine } = makeDispatchEngine(client);
    const out = await engine.respondToOffer('x', 'accept', 'drv-b', {
      userId: 'u',
      role: 'driver',
      entityId: 'drv-b',
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.error?.code).toBe('FORBIDDEN');
  });

  it('forceAssign delegates to manualAssign with reason', async () => {
    const client = { from: vi.fn() };
    const { engine } = makeDispatchEngine(client);
    const manualAssign = vi.fn().mockResolvedValue({ success: true, data: {} });
    (engine as any).manualAssign = manualAssign;
    const actor = { userId: 'ops1', role: 'ops_admin' as const };
    await engine.forceAssign('d1', 'dr1', actor, 'overflow');
    expect(manualAssign).toHaveBeenCalledWith('d1', 'dr1', actor, 'overflow');
  });
});
