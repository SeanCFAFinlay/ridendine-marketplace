// ==========================================
// DRIVER MATCHING SERVICE
// Pure matching logic: eligible driver lookup, scoring, ranking.
// No events, no audit — read-only + scoring only.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EtaService } from '@ridendine/routing';
import type { DriverSupplySnapshot, PlatformRuleSet } from '@ridendine/types';
import { calculateDistanceKm, scoreDriverForDispatch } from '@ridendine/utils';

// ==========================================
// TYPES
// ==========================================

export interface EligibleDriver {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  approval_state: string;
  presence_status: string;
  distance_km: number;
  estimated_minutes: number;
  rating?: number;
  total_deliveries: number;
  active_workload: number;
  recent_declines: number;
  recent_expiries: number;
  fairness_score: number;
  last_ping_at?: string | null;
  current_lat?: number | null;
  current_lng?: number | null;
}

export interface RankedCandidate {
  driverId: string;
  seconds: number;
  lastPingAt: string | null;
  activeLoad: number;
}

export interface CoverageGap {
  area: string;
  openDeliveries: number;
  availableDrivers: number;
  riskLevel: 'high' | 'medium' | 'low';
}

// ==========================================
// PURE SCORING FUNCTION (exported for tests)
// ==========================================

export function calculateDriverAssignmentScore(driver: EligibleDriver): number {
  const distanceScore = Math.max(0, (12 - driver.distance_km) * 10);
  const ratingScore = (driver.rating || 4) * 5;
  const experienceScore = Math.min(driver.total_deliveries, 500) / 25;
  const workloadPenalty = driver.active_workload * 25;
  const declinePenalty = driver.recent_declines * 8;
  const expiryPenalty = driver.recent_expiries * 10;
  const fairnessBonus = driver.fairness_score * 12;
  return Math.round(
    distanceScore +
      ratingScore +
      experienceScore +
      fairnessBonus -
      workloadPenalty -
      declinePenalty -
      expiryPenalty
  );
}

// ==========================================
// DRIVER MATCHING SERVICE
// ==========================================

export class DriverMatchingService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly eta?: EtaService
  ) {}

  // ==========================================
  // ELIGIBLE DRIVER LOOKUP
  // ==========================================

  async findEligibleDrivers(
    pickupLat: number,
    pickupLng: number,
    maxRadiusKm = 10,
    filterByLocation = true
  ): Promise<EligibleDriver[]> {
    const { data: drivers, error } = await this.client
      .from('drivers')
      .select(`
        id,
        user_id,
        status,
        first_name,
        last_name,
        rating,
        total_deliveries,
        driver_presence!inner (
          status,
          current_lat,
          current_lng,
          updated_at
        )
      `)
      .eq('status', 'approved')
      .eq('driver_presence.status', 'online');

    if (error || !drivers) return [];

    const driverIds = drivers.map((d) => d.id);
    const [activeResult, attemptsResult] = await this.fetchDriverWorkloadData(driverIds);

    const activeWorkload = buildCountMap(activeResult.data ?? [], 'driver_id');
    const recentDeclines = buildDeclineMap(attemptsResult.data ?? [], 'declined');
    const recentExpiries = buildDeclineMap(attemptsResult.data ?? [], 'expired');

    const eligible: EligibleDriver[] = [];

    for (const driver of drivers) {
      const presence = driver.driver_presence as unknown as {
        status: string;
        current_lat: number | null;
        current_lng: number | null;
        updated_at?: string | null;
      };
      if (!presence) continue;

      let distance = 0;
      if (filterByLocation && pickupLat && pickupLng && presence.current_lat && presence.current_lng) {
        distance = haversineKm(presence.current_lat, presence.current_lng, pickupLat, pickupLng);
        if (distance > maxRadiusKm) continue;
      }

      const workload = activeWorkload.get(driver.id) ?? 0;
      eligible.push({
        id: driver.id,
        user_id: driver.user_id,
        first_name: driver.first_name,
        last_name: driver.last_name,
        approval_state: driver.status,
        presence_status: presence.status,
        distance_km: distance,
        estimated_minutes: Math.round((distance / 30) * 60) + 5,
        rating: driver.rating,
        total_deliveries: driver.total_deliveries,
        active_workload: workload,
        recent_declines: recentDeclines.get(driver.id) ?? 0,
        recent_expiries: recentExpiries.get(driver.id) ?? 0,
        fairness_score: 1 / (workload + 1),
        last_ping_at: presence.updated_at ?? null,
        current_lat: presence.current_lat,
        current_lng: presence.current_lng,
      });
    }

    return eligible.sort((a, b) => a.distance_km - b.distance_km);
  }

  // ==========================================
  // BEST DRIVER SELECTION
  // ==========================================

  selectBestDriver(drivers: EligibleDriver[]): EligibleDriver | null {
    if (drivers.length === 0) return null;
    const scored = drivers.map((d) => ({ ...d, score: calculateDriverAssignmentScore(d) }));
    return scored.sort((a, b) => b.score - a.score)[0] ?? null;
  }

  // ==========================================
  // ETA-BASED RANKING
  // ==========================================

  async rankCandidates(
    deliveryId: string,
    eligibleDrivers: EligibleDriver[]
  ): Promise<RankedCandidate[]> {
    const withCoords = eligibleDrivers.filter(
      (d) =>
        d.current_lat != null &&
        d.current_lng != null &&
        Number.isFinite(d.current_lat) &&
        Number.isFinite(d.current_lng)
    );
    const secondsByDriver = new Map<string, number>();

    if (this.eta && withCoords.length > 0) {
      try {
        const ranked = await this.eta.rankDrivers(
          deliveryId,
          withCoords.map((d) => ({
            driverId: d.id,
            point: { lat: d.current_lat as number, lng: d.current_lng as number },
          }))
        );
        for (const r of ranked) {
          secondsByDriver.set(r.driverId, r.seconds);
        }
      } catch {
        /* ETA is optional */
      }
    }

    const result: RankedCandidate[] = eligibleDrivers.map((d) => ({
      driverId: d.id,
      seconds: secondsByDriver.has(d.id)
        ? (secondsByDriver.get(d.id) as number)
        : Math.max(0, Math.round((d.estimated_minutes ?? 0) * 60)),
      lastPingAt: d.last_ping_at ?? null,
      activeLoad: d.active_workload,
    }));

    result.sort((a, b) => a.seconds - b.seconds);
    return result;
  }

  // ==========================================
  // OPS SCORING (FND-007 — moved from ops.repository.ts)
  // ==========================================

  /**
   * Returns driver supply snapshots scored by dispatch priority.
   * Business logic moved from ops.repository.ts listDriverSupply (FND-007).
   */
  async getDriverScores(
    pickupLat?: number | null,
    pickupLng?: number | null,
    rules?: PlatformRuleSet
  ): Promise<DriverSupplySnapshot[]> {
    const rawData = await getRawDriverSupplyData(this.client);
    return computeDriverScores(rawData, pickupLat, pickupLng, rules);
  }

  /**
   * Computes coverage gaps given a set of pending delivery items.
   * Business logic moved from ops.repository.ts getDispatchCommandCenterReadModel (FND-007).
   */
  getCoverageGaps(
    pendingItems: Array<{ pickupArea: string }>,
    driverSupply: DriverSupplySnapshot[]
  ): CoverageGap[] {
    const coverageMap = new Map<string, { openDeliveries: number; availableDrivers: number }>();

    for (const item of pendingItems) {
      const bucket = coverageMap.get(item.pickupArea) ?? { openDeliveries: 0, availableDrivers: 0 };
      bucket.openDeliveries += 1;
      coverageMap.set(item.pickupArea, bucket);
    }

    // Count available drivers per area (approx — drivers are not area-pinned; use total available)
    const onlineCount = driverSupply.filter((d) => d.status === 'online').length;
    for (const [area, counts] of coverageMap.entries()) {
      counts.availableDrivers = onlineCount;
      coverageMap.set(area, counts);
    }

    return [...coverageMap.entries()].map(([area, counts]) => ({
      area,
      openDeliveries: counts.openDeliveries,
      availableDrivers: counts.availableDrivers,
      riskLevel: resolveRiskLevel(counts.openDeliveries, counts.availableDrivers),
    }));
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async fetchDriverWorkloadData(driverIds: string[]): Promise<[
    { data: Array<{ driver_id: string }> | null; error: unknown },
    { data: Array<{ driver_id: string; response: string }> | null; error: unknown }
  ]> {
    if (driverIds.length === 0) {
      return [
        { data: [], error: null },
        { data: [], error: null },
      ];
    }
    return Promise.all([
      (this.client
        .from('deliveries')
        .select('driver_id')
        .in('driver_id', driverIds)
        .in('status', [
          'assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup',
          'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff',
        ]) as unknown) as Promise<{ data: Array<{ driver_id: string }> | null; error: unknown }>,
      (this.client
        .from('assignment_attempts')
        .select('driver_id, response')
        .in('driver_id', driverIds)
        .gte('offered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as unknown) as Promise<{
        data: Array<{ driver_id: string; response: string }> | null;
        error: unknown;
      }>,
    ]);
  }
}

// ==========================================
// RAW DATA FETCHER (thin, no business logic)
// ==========================================

interface RawDriverSupplyRow {
  id: string;
  status: string;
  first_name: string;
  last_name: string;
  driver_presence: unknown;
}

interface RawDriverSupplyData {
  drivers: RawDriverSupplyRow[];
  activeByDriver: Map<string, number>;
  lastAssignmentByDriver: Map<string, string>;
  recentDeclines: Map<string, number>;
  recentExpiries: Map<string, number>;
}

export async function getRawDriverSupplyData(client: SupabaseClient): Promise<RawDriverSupplyData> {
  const [driversResult, deliveriesResult, attemptsResult] = await Promise.all([
    (client
      .from('drivers')
      .select(`
        id,
        status,
        first_name,
        last_name,
        driver_presence(status, current_lat, current_lng)
      `) as unknown) as Promise<{ data: RawDriverSupplyRow[] | null; error: unknown }>,
    (client
      .from('deliveries')
      .select('driver_id, updated_at')
      .in('status', [
        'assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup',
        'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff',
      ]) as unknown) as Promise<{ data: Array<{ driver_id: string; updated_at: string }> | null; error: unknown }>,
    (client
      .from('assignment_attempts')
      .select('driver_id, response')
      .gte('offered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as unknown) as Promise<{
      data: Array<{ driver_id: string; response: string }> | null;
      error: unknown;
    }>,
  ]);

  const activeByDriver = new Map<string, number>();
  const lastAssignmentByDriver = new Map<string, string>();
  for (const row of (deliveriesResult.data ?? []) as Array<{ driver_id?: string; updated_at: string }>) {
    if (!row.driver_id) continue;
    activeByDriver.set(row.driver_id, (activeByDriver.get(row.driver_id) ?? 0) + 1);
    const prev = lastAssignmentByDriver.get(row.driver_id);
    if (!prev || prev < row.updated_at) lastAssignmentByDriver.set(row.driver_id, row.updated_at);
  }

  const recentDeclines = new Map<string, number>();
  const recentExpiries = new Map<string, number>();
  for (const row of (attemptsResult.data ?? []) as Array<{ driver_id?: string; response: string }>) {
    if (!row.driver_id) continue;
    if (row.response === 'declined') recentDeclines.set(row.driver_id, (recentDeclines.get(row.driver_id) ?? 0) + 1);
    if (row.response === 'expired') recentExpiries.set(row.driver_id, (recentExpiries.get(row.driver_id) ?? 0) + 1);
  }

  return {
    drivers: (driversResult.data ?? []) as RawDriverSupplyRow[],
    activeByDriver,
    lastAssignmentByDriver,
    recentDeclines,
    recentExpiries,
  };
}

// ==========================================
// SCORING COMPUTATION (pure — no DB calls)
// ==========================================

export function computeDriverScores(
  raw: RawDriverSupplyData,
  pickupLat?: number | null,
  pickupLng?: number | null,
  rules?: PlatformRuleSet
): DriverSupplySnapshot[] {
  const effectiveRules = rules ?? ({ dispatchRadiusKm: 10, maxDeliveryDistanceKm: 15 } as PlatformRuleSet);

  const snapshots: DriverSupplySnapshot[] = raw.drivers.map((driver) => {
    const presence = Array.isArray(driver.driver_presence)
      ? (driver.driver_presence[0] as { status?: string; current_lat?: number; current_lng?: number } | undefined)
      : (driver.driver_presence as { status?: string; current_lat?: number; current_lng?: number } | undefined);
    const activeDeliveries = raw.activeByDriver.get(driver.id) ?? 0;
    const distanceKm = calculateDistanceKm(pickupLat, pickupLng, presence?.current_lat, presence?.current_lng);
    const rawStatus: string = driver.status !== 'approved' ? 'unavailable' : (presence?.status ?? 'offline');
    const status = rawStatus as DriverSupplySnapshot['status'];
    return {
      driverId: driver.id,
      name: [driver.first_name, driver.last_name].filter(Boolean).join(' ') || 'Unknown Driver',
      status,
      approvalState: driver.status,
      activeDeliveries,
      distanceKm,
      lastAssignmentAt: raw.lastAssignmentByDriver.get(driver.id) ?? null,
      recentDeclines: raw.recentDeclines.get(driver.id) ?? 0,
      recentExpiries: raw.recentExpiries.get(driver.id) ?? 0,
      fairnessScore: 1 / (activeDeliveries + 1),
    } satisfies DriverSupplySnapshot;
  });

  return snapshots.sort((a, b) => scoreDriverForDispatch(b, effectiveRules) - scoreDriverForDispatch(a, effectiveRules));
}

// ==========================================
// PURE HELPERS
// ==========================================

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function buildCountMap(
  rows: Array<Record<string, string>>,
  key: string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = row[key];
    if (!id) continue;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

function buildDeclineMap(
  rows: Array<{ driver_id?: string; response: string }>,
  responseType: string
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.driver_id || row.response !== responseType) continue;
    map.set(row.driver_id, (map.get(row.driver_id) ?? 0) + 1);
  }
  return map;
}

function resolveRiskLevel(
  openDeliveries: number,
  availableDrivers: number
): 'high' | 'medium' | 'low' {
  if (openDeliveries > availableDrivers) return 'high';
  if (openDeliveries === availableDrivers) return 'medium';
  return 'low';
}

// ==========================================
// FACTORY
// ==========================================

export function createDriverMatchingService(
  client: SupabaseClient,
  eta?: EtaService
): DriverMatchingService {
  return new DriverMatchingService(client, eta);
}
