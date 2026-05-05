/**
 * Dispatch / offer tests — updated to canonical services (Stage 3).
 * DispatchEngine removed; behaviors live in:
 *   - calculateDriverAssignmentScore → driver-matching.service
 *   - offerToNextDriver, respondToOffer → offer-management.service
 *   - forceAssign → dispatch-orchestrator
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { calculateDriverAssignmentScore } from './driver-matching.service';
import { OfferManagementService } from './offer-management.service';
import { DispatchOrchestrator } from './dispatch-orchestrator';

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

function makeOfferService(
  client: unknown,
  extras?: { broadcastDriverOffer?: ReturnType<typeof vi.fn>; eta?: unknown }
) {
  const broadcastDriverOffer = extras?.broadcastDriverOffer ?? vi.fn().mockResolvedValue(undefined);
  const events = {
    emit: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    broadcastDriverOffer,
  };
  const driverMatching = {
    findEligibleDrivers: vi.fn().mockResolvedValue([]),
  };
  return {
    service: new OfferManagementService(
      client as any,
      events as any,
      { log: vi.fn().mockResolvedValue(null), logOverride: vi.fn(), logStatusChange: vi.fn() } as any,
      { startTimer: vi.fn(), completeTimer: vi.fn() } as any,
      driverMatching as any,
      extras?.eta as any
    ),
    broadcastDriverOffer,
    driverMatching,
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

describe('OfferManagementService dispatch chain (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlatform.mockResolvedValue(platformDefaults());
    mockRankDrivers.mockResolvedValue([
      { driverId: 'd-far', seconds: 400 },
      { driverId: 'd-near', seconds: 120 },
    ]);
  });

  it('offerToNextDriver returns PENDING_OFFER if a live pending offer already exists', async () => {
    const deliveryRow = {
      id: 'del-1',
      order_id: 'ord-1',
      status: 'pending',
      pickup_lat: 43.7,
      pickup_lng: -79.4,
      pickup_address: '1 Chef St',
      dropoff_address: '9 Cust Rd',
      assignment_attempts_count: 0,
      estimated_distance_km: 3,
      driver_payout: 8.5,
      delivery_fee: 9.99,
    };

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'deliveries') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: deliveryRow, error: null }),
              }),
            }),
          };
        }
        if (table === 'assignment_attempts') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gt: () => ({
                    maybeSingle: () => Promise.resolve({ data: { id: 'existing-att' }, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      }),
    };

    const { service } = makeOfferService(client, {});
    const res = await service.offerToNextDriver('del-1', { userId: 'sys', role: 'system' });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error?.code).toBe('PENDING_OFFER');
    }
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
    const { service } = makeOfferService(client);
    const out = await service.respondToOffer('x', 'accept', 'drv-b', {
      userId: 'u',
      role: 'driver',
      entityId: 'drv-b',
    });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.error?.code).toBe('FORBIDDEN');
  });

  it('DispatchOrchestrator.forceAssign delegates to manualAssign with reason', async () => {
    const client = { from: vi.fn() };
    const events = { emit: vi.fn(), flush: vi.fn().mockResolvedValue(undefined) };
    const audit = { log: vi.fn(), logOverride: vi.fn(), logStatusChange: vi.fn() };
    const sla = { startTimer: vi.fn(), completeTimer: vi.fn() };
    const eta = {};
    const masterOrder = { syncFromDelivery: vi.fn() };
    const masterDelivery = { updateDeliveryStatus: vi.fn() };
    const offerManagement = { offerToNextDriver: vi.fn(), processExpiredOffers: vi.fn() };
    const driverMatching = { findEligibleDrivers: vi.fn() };

    const orchestrator = new DispatchOrchestrator(
      client as any,
      events as any,
      audit as any,
      sla as any,
      eta as any,
      masterOrder as any,
      masterDelivery as any,
      offerManagement as any,
      driverMatching as any
    );

    const manualAssign = vi.fn().mockResolvedValue({ success: true, data: {} });
    (orchestrator as any).manualAssign = manualAssign;
    const actor = { userId: 'ops1', role: 'ops_admin' as const };
    await orchestrator.forceAssign('d1', 'dr1', actor, 'overflow');
    expect(manualAssign).toHaveBeenCalledWith('d1', 'dr1', actor, 'overflow');
  });
});
