// ==========================================
// DISPATCH ORCHESTRATOR TESTS
// Task 4.4 — Phase 3 Stage 4
// Thin coordinator — tests delegation via mocks only.
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DispatchOrchestrator } from './dispatch-orchestrator';

// ==========================================
// NARROWING HELPERS
// ==========================================

function expectOk<T>(r: { success: boolean; data?: T; error?: unknown }): T {
  if (!r.success) throw new Error(`Expected ok result, got error: ${JSON.stringify(r.error)}`);
  if (r.data === undefined) throw new Error('Expected ok result to have data');
  return r.data;
}

function expectErr(r: { success: boolean; error?: { code: string; message?: string } }): { code: string; message?: string } {
  if (r.success) throw new Error('Expected error result, got ok');
  if (r.error === undefined) throw new Error('Expected error result to have error field');
  return r.error;
}

// ==========================================
// MODULE MOCKS (must be at top level)
// ==========================================

const { mockGetPlatform } = vi.hoisted(() => ({
  mockGetPlatform: vi.fn(),
}));

vi.mock('@ridendine/db', () => ({
  getPlatformSettings: (...args: unknown[]) => mockGetPlatform(...args),
}));

// ==========================================
// CONSTANTS
// ==========================================

const ORDER_ID = '00000000-0000-0000-0003-000000000001';
const DELIVERY_ID = '00000000-0000-0000-0003-000000000002';
const DRIVER_ID = '00000000-0000-0000-0003-000000000003';
const ATTEMPT_ID = '00000000-0000-0000-0003-000000000004';
const OPS_ACTOR = { userId: '00000000-0000-0000-0003-000000000099', role: 'ops_manager' as const };
const SYS_ACTOR = { userId: 'system', role: 'system' as const };

// ==========================================
// HELPERS
// ==========================================

function platformDefaults() {
  return {
    dispatchRadiusKm: 10,
    offerTimeoutSeconds: 90,
    maxAssignmentAttempts: 5,
    platformFeePercent: 15,
    serviceFeePercent: 8,
    hstRate: 13,
    minOrderAmount: 10,
    maxDeliveryDistanceKm: 20,
    defaultPrepTimeMinutes: 20,
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

function makeDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: DELIVERY_ID,
    order_id: ORDER_ID,
    driver_id: null,
    status: 'pending',
    pickup_address: '100 Main St',
    dropoff_address: '200 Oak Ave',
    pickup_lat: 43.26,
    pickup_lng: -79.87,
    dropoff_lat: 43.28,
    dropoff_lng: -79.85,
    estimated_distance_km: 3,
    estimated_duration_minutes: 15,
    delivery_fee: 5.00,
    driver_payout: 4.00,
    assignment_attempts_count: 0,
    escalated_to_ops: false,
    ...overrides,
  };
}

function makeOrder() {
  return {
    id: ORDER_ID,
    delivery_fee: 5.00,
    storefront: {
      id: 'storefront-1',
      name: 'Test Kitchen',
      chef: { id: 'chef-1' },
      kitchen: { address: '100 Main St', lat: 43.26, lng: -79.87 },
    },
    delivery_address: {
      address_line1: '200 Oak Ave',
      address_line2: null,
      city: 'Hamilton',
      state: 'ON',
      postal_code: 'L8P 1A1',
      lat: 43.28,
      lng: -79.85,
    },
  };
}

function makeDriver() {
  return {
    id: DRIVER_ID,
    first_name: 'John',
    last_name: 'Driver',
    status: 'approved',
    driver_presence: { status: 'online' },
  };
}

interface ChainMock {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
}

function makeChain(singleData: unknown = null): ChainMock {
  const c: ChainMock = {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: singleData, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  c.select.mockReturnValue(c);
  c.update.mockReturnValue(c);
  c.insert.mockReturnValue(c);
  c.eq.mockReturnValue(c);
  c.in.mockReturnValue(c);
  c.order.mockReturnValue(c);
  return c;
}

function createOrchestrator(clientFn: (table: string) => unknown) {
  const client = { from: vi.fn((t: string) => clientFn(t)) };

  const events = {
    emit: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    broadcastDriverOffer: vi.fn().mockResolvedValue(undefined),
  };
  const audit = {
    log: vi.fn().mockResolvedValue(null),
    logStatusChange: vi.fn().mockResolvedValue(null),
    logOverride: vi.fn().mockResolvedValue(null),
  };
  const sla = {
    startTimer: vi.fn().mockResolvedValue(null),
    completeTimer: vi.fn().mockResolvedValue(null),
  };
  const eta = {
    computeFullOnAssign: vi.fn().mockResolvedValue(undefined),
    computeInitial: vi.fn().mockResolvedValue(undefined),
    rankDrivers: vi.fn().mockResolvedValue([]),
  };
  const masterOrder = {
    transitionOrder: vi.fn().mockResolvedValue({ success: true }),
    requestDriverAssignment: vi.fn().mockResolvedValue({ success: true }),
  };
  const masterDelivery = {
    updateDeliveryStatus: vi.fn().mockResolvedValue({ success: true, data: { id: DELIVERY_ID, status: 'picked_up' } }),
  };
  const offerManagement = {
    offerToNextDriver: vi.fn().mockResolvedValue({ success: true, data: {} }),
    acceptOffer: vi.fn().mockResolvedValue({ success: true, data: {} }),
    declineOffer: vi.fn().mockResolvedValue({ success: true }),
    respondToOffer: vi.fn().mockResolvedValue({ success: true }),
    processExpiredOffers: vi.fn().mockResolvedValue(3),
  };
  const driverMatching = {
    findEligibleDrivers: vi.fn().mockResolvedValue([]),
    selectBestDriver: vi.fn().mockReturnValue(null),
  };

  const orchestrator = new DispatchOrchestrator(
    client as any,
    events as any,
    audit as any,
    sla as any,
    eta as any,
    masterOrder as any,
    masterDelivery as any,
    offerManagement as any,
    driverMatching as any,
  );

  return { orchestrator, client, events, audit, sla, eta, offerManagement, masterDelivery, masterOrder, driverMatching };
}

// ==========================================
// TESTS
// ==========================================

describe('DispatchOrchestrator', () => {
  beforeEach(() => {
    mockGetPlatform.mockResolvedValue(platformDefaults());
  });

  describe('requestDispatch', () => {
    it('creates delivery with pending status and kicks off offer chain', async () => {
      const order = makeOrder();
      const delivery = makeDelivery();

      const { orchestrator, offerManagement } = createOrchestrator((table) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: order, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === 'deliveries') {
          let callCount = 0;
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockImplementation(() => {
                  callCount += 1;
                  if (callCount === 1) return Promise.resolve({ data: null, error: null }); // no existing delivery
                  return Promise.resolve({ data: delivery, error: null });
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: delivery, error: null }),
              }),
            }),
          };
        }
        return makeChain();
      });

      const result = await orchestrator.requestDispatch(ORDER_ID, SYS_ACTOR);

      expect(result.success).toBe(true);
      const data = expectOk(result);
      expect(data.status).toBe('pending');
      expect(offerManagement.offerToNextDriver).toHaveBeenCalledWith(delivery.id, SYS_ACTOR);
    });
  });

  describe('manualAssign', () => {
    it('assigns driver directly, updates delivery + driver_presence, logs override', async () => {
      const delivery = makeDelivery();
      const driver = makeDriver();
      const updatedDelivery = { ...delivery, driver_id: DRIVER_ID, status: 'assigned' };

      const presenceUpdateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

      const { orchestrator, audit, events } = createOrchestrator((table) => {
        if (table === 'deliveries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: delivery, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedDelivery, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'drivers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: driver, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'driver_presence') {
          return { update: presenceUpdateFn };
        }
        if (table === 'assignment_attempts') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return makeChain();
      });

      const result = await orchestrator.manualAssign(DELIVERY_ID, DRIVER_ID, OPS_ACTOR);

      expect(result.success).toBe(true);
      expect(presenceUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'busy' })
      );
      expect(audit.logOverride).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'manual_driver_assignment', entityId: DELIVERY_ID })
      );
    });

    it('rejects non-ops actor', async () => {
      const { orchestrator } = createOrchestrator(() => makeChain());
      const unauthorizedActor = { userId: 'driver-1', role: 'driver' as const };

      const result = await orchestrator.manualAssign(DELIVERY_ID, DRIVER_ID, unauthorizedActor);
      expect(result.success).toBe(false);
      expect(expectErr(result).code).toBe('FORBIDDEN');
    });
  });

  describe('forceAssign', () => {
    it('delegates to manualAssign with reason — passes reason through', async () => {
      const delivery = makeDelivery();
      const driver = makeDriver();
      const updatedDelivery = { ...delivery, driver_id: DRIVER_ID, status: 'assigned' };

      const { orchestrator, audit } = createOrchestrator((table) => {
        if (table === 'deliveries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: delivery, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedDelivery, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'drivers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: driver, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'driver_presence') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        if (table === 'assignment_attempts') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }) };
        }
        return makeChain();
      });

      const reason = 'Emergency force assign';
      const result = await orchestrator.forceAssign(DELIVERY_ID, DRIVER_ID, OPS_ACTOR, reason);

      expect(result.success).toBe(true);
      expect(audit.logOverride).toHaveBeenCalledWith(
        expect.objectContaining({ reason })
      );
    });
  });

  describe('reassignDelivery', () => {
    it('releases previous driver, resets delivery to pending, calls offer chain', async () => {
      const assignedDelivery = makeDelivery({ driver_id: DRIVER_ID, status: 'assigned' });

      const { orchestrator, offerManagement } = createOrchestrator((table) => {
        if (table === 'deliveries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: assignedDelivery, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === 'driver_presence') {
          return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
        }
        return makeChain();
      });

      const result = await orchestrator.reassignDelivery(DELIVERY_ID, 'Driver no-show', OPS_ACTOR);

      expect(result.success).toBe(true);
      expect(offerManagement.offerToNextDriver).toHaveBeenCalledWith(DELIVERY_ID, OPS_ACTOR);
    });
  });

  describe('getDispatchBoard', () => {
    it('returns shape with pending/active/availableDrivers/escalated fields', async () => {
      const pendingDelivery = makeDelivery();
      const activeDelivery = makeDelivery({ status: 'assigned', driver_id: DRIVER_ID });

      const { orchestrator, driverMatching } = createOrchestrator((table) => {
        if (table === 'deliveries') {
          const chain = makeChain();
          chain.select.mockReturnValue({
            ...chain,
            eq: vi.fn().mockReturnValue({
              ...chain,
              order: vi.fn().mockResolvedValue({ data: [pendingDelivery], error: null }),
              in: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [activeDelivery], error: null }) }),
            }),
            in: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [activeDelivery], error: null }) }),
          });
          return chain;
        }
        return makeChain();
      });

      const board = await orchestrator.getDispatchBoard();

      expect(board).toHaveProperty('pendingDispatch');
      expect(board).toHaveProperty('activeDeliveries');
      expect(board).toHaveProperty('availableDrivers');
      expect(board).toHaveProperty('escalated');
      expect(Array.isArray(board.pendingDispatch)).toBe(true);
      expect(Array.isArray(board.activeDeliveries)).toBe(true);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('delegates to masterDelivery.updateDeliveryStatus (mock verified called)', async () => {
      const { orchestrator, masterDelivery } = createOrchestrator(() => makeChain());

      const result = await orchestrator.updateDeliveryStatus(DELIVERY_ID, 'picked_up', SYS_ACTOR);

      expect(masterDelivery.updateDeliveryStatus).toHaveBeenCalledWith(
        DELIVERY_ID, 'picked_up', SYS_ACTOR, undefined
      );
      expect(result.success).toBe(true);
    });
  });

  describe('acceptOffer delegation', () => {
    it('delegates acceptOffer to offerManagement', async () => {
      const { orchestrator, offerManagement } = createOrchestrator(() => makeChain());

      await orchestrator.acceptOffer(ATTEMPT_ID, SYS_ACTOR);

      expect(offerManagement.acceptOffer).toHaveBeenCalledWith(ATTEMPT_ID, SYS_ACTOR);
    });
  });

  describe('processExpiredOffers delegation', () => {
    it('delegates processExpiredOffers to offerManagement and returns count', async () => {
      const { orchestrator, offerManagement } = createOrchestrator(() => makeChain());

      const count = await orchestrator.processExpiredOffers(SYS_ACTOR);

      expect(offerManagement.processExpiredOffers).toHaveBeenCalledWith(SYS_ACTOR);
      expect(count).toBe(3);
    });
  });
});
