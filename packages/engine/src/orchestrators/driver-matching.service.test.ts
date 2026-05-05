// ==========================================
// DRIVER MATCHING SERVICE TESTS
// Task 4.2 — Phase 3 Stage 4
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { calculateDriverAssignmentScore, DriverMatchingService } from './driver-matching.service';
import type { EligibleDriver } from './driver-matching.service';

// ==========================================
// FIXTURES
// ==========================================

const DRIVER_A_ID = '00000000-0000-0000-0001-000000000001';
const DRIVER_B_ID = '00000000-0000-0000-0001-000000000002';
const DRIVER_C_ID = '00000000-0000-0000-0001-000000000003';

function makeDriver(overrides: Partial<EligibleDriver> = {}): EligibleDriver {
  return {
    id: DRIVER_A_ID,
    user_id: '00000000-0000-0000-0001-000000000099',
    first_name: 'Jane',
    last_name: 'Driver',
    approval_state: 'approved',
    presence_status: 'online',
    distance_km: 2,
    estimated_minutes: 9,
    rating: 4.8,
    total_deliveries: 200,
    active_workload: 0,
    recent_declines: 0,
    recent_expiries: 0,
    fairness_score: 1,
    last_ping_at: new Date().toISOString(),
    current_lat: 43.26,
    current_lng: -79.87,
    ...overrides,
  };
}

// ==========================================
// PURE SCORING TESTS
// ==========================================

describe('calculateDriverAssignmentScore', () => {
  it('returns a deterministic score for a known driver fixture', () => {
    const driver = makeDriver({
      distance_km: 2,
      rating: 5,
      total_deliveries: 100,
      active_workload: 0,
      recent_declines: 0,
      recent_expiries: 0,
      fairness_score: 1,
    });

    // distanceScore: (12-2)*10 = 100
    // ratingScore: 5*5 = 25
    // experienceScore: 100/25 = 4
    // workloadPenalty: 0
    // declinePenalty: 0
    // expiryPenalty: 0
    // fairnessBonus: 1*12 = 12
    // total = 100 + 25 + 4 + 12 = 141
    expect(calculateDriverAssignmentScore(driver)).toBe(141);
  });

  it('high-rating close driver scores higher than low-rating far driver', () => {
    const closeHighRating = makeDriver({
      distance_km: 1,
      rating: 5,
      total_deliveries: 300,
      active_workload: 0,
      recent_declines: 0,
      recent_expiries: 0,
      fairness_score: 1,
    });

    const farLowRating = makeDriver({
      id: DRIVER_B_ID,
      distance_km: 8,
      rating: 3,
      total_deliveries: 50,
      active_workload: 1,
      recent_declines: 2,
      recent_expiries: 1,
      fairness_score: 0.5,
    });

    expect(calculateDriverAssignmentScore(closeHighRating))
      .toBeGreaterThan(calculateDriverAssignmentScore(farLowRating));
  });

  it('penalizes active workload correctly (25 pts per delivery)', () => {
    const idle = makeDriver({ active_workload: 0 });
    const busy = makeDriver({ active_workload: 2 });
    const diff = calculateDriverAssignmentScore(idle) - calculateDriverAssignmentScore(busy);
    expect(diff).toBe(50); // 2 * 25
  });
});

// ==========================================
// DRIVER MATCHING SERVICE TESTS (with mock DB)
// ==========================================

describe('DriverMatchingService', () => {
  function buildMockClient(driversData: unknown[], deliveriesData: unknown[], attemptsData: unknown[]) {
    return {
      from: vi.fn((table: string) => {
        if (table === 'drivers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: driversData, error: null }),
              }),
            }),
          };
        }
        if (table === 'deliveries') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: deliveriesData, error: null }),
              }),
            }),
          };
        }
        if (table === 'assignment_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ data: attemptsData, error: null }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    };
  }

  function makeDriverRow(id: string, lat: number, lng: number) {
    return {
      id,
      user_id: `user-${id}`,
      status: 'approved',
      first_name: 'Test',
      last_name: 'Driver',
      rating: 4.5,
      total_deliveries: 100,
      driver_presence: {
        status: 'online',
        current_lat: lat,
        current_lng: lng,
        updated_at: new Date().toISOString(),
      },
    };
  }

  it('findEligibleDrivers returns empty array when no online drivers exist', async () => {
    const client = buildMockClient([], [], []);
    const service = new DriverMatchingService(client as any);

    const result = await service.findEligibleDrivers(43.26, -79.87);
    expect(result).toEqual([]);
  });

  it('findEligibleDrivers returns drivers sorted by distance', async () => {
    // Driver A is 2 km away, Driver B is 5 km away
    // Using coords near Hamilton ON
    const driverRows = [
      makeDriverRow(DRIVER_A_ID, 43.28, -79.87),  // ~2.2 km from 43.26,-79.87
      makeDriverRow(DRIVER_B_ID, 43.26, -79.82),  // ~4.5 km from 43.26,-79.87
    ];
    const client = buildMockClient(driverRows, [], []);
    const service = new DriverMatchingService(client as any);

    const result = await service.findEligibleDrivers(43.26, -79.87, 10);
    expect(result.length).toBe(2);
    // Sorted by distance — first driver should be closer
    expect(result[0]!.distance_km).toBeLessThan(result[1]!.distance_km);
  });

  it('findEligibleDrivers excludes drivers beyond maxRadiusKm', async () => {
    const driverRows = [
      makeDriverRow(DRIVER_A_ID, 43.26, -79.87),  // very close
      makeDriverRow(DRIVER_B_ID, 44.0, -79.87),   // ~82 km away — beyond 10 km radius
    ];
    const client = buildMockClient(driverRows, [], []);
    const service = new DriverMatchingService(client as any);

    const result = await service.findEligibleDrivers(43.26, -79.87, 10);
    // Only 1 driver should be within 10km
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe(DRIVER_A_ID);
  });

  describe('selectBestDriver', () => {
    it('returns highest-scoring driver from a 3-driver list', () => {
      const service = new DriverMatchingService({ from: vi.fn() } as any);

      const drivers: EligibleDriver[] = [
        makeDriver({ id: DRIVER_A_ID, distance_km: 5, rating: 3.5, total_deliveries: 20, active_workload: 1, fairness_score: 0.5 }),
        makeDriver({ id: DRIVER_B_ID, distance_km: 1, rating: 5.0, total_deliveries: 400, active_workload: 0, fairness_score: 1 }),
        makeDriver({ id: DRIVER_C_ID, distance_km: 3, rating: 4.0, total_deliveries: 100, active_workload: 0, fairness_score: 1 }),
      ];

      const best = service.selectBestDriver(drivers);
      // DRIVER_B has highest score: distance 1 km (110 pts) + rating 5 (25) + exp 16 + fairness 12 = 163
      expect(best).not.toBeNull();
      expect(best!.id).toBe(DRIVER_B_ID);
    });

    it('returns null for empty driver list', () => {
      const service = new DriverMatchingService({ from: vi.fn() } as any);
      expect(service.selectBestDriver([])).toBeNull();
    });
  });
});
