// ==========================================
// OPS ANALYTICS SERVICE
// Business logic extracted from ops.repository.ts (FND-007)
// Re-exports pure functions from @ridendine/utils for engine consumers
// ==========================================

export {
  calculateDistanceKm,
  extractAreaFromAddress,
  scoreDriverForDispatch,
} from '@ridendine/utils';

export type { DriverScoreInput, DispatchScoringRules } from '@ridendine/utils';

/**
 * Analyze coverage gaps from pending deliveries vs available drivers.
 */
export function analyzeCoverageGaps(
  pendingDeliveries: Array<{ pickupArea: string }>,
  availableDriversByArea?: Map<string, number>
): Array<{
  area: string;
  openDeliveries: number;
  availableDrivers: number;
  riskLevel: 'high' | 'medium' | 'low';
}> {
  const coverageMap = new Map<string, { openDeliveries: number; availableDrivers: number }>();

  for (const delivery of pendingDeliveries) {
    const bucket = coverageMap.get(delivery.pickupArea) ?? { openDeliveries: 0, availableDrivers: 0 };
    bucket.openDeliveries += 1;
    if (availableDriversByArea) {
      bucket.availableDrivers = availableDriversByArea.get(delivery.pickupArea) ?? 0;
    }
    coverageMap.set(delivery.pickupArea, bucket);
  }

  return [...coverageMap.entries()].map(([area, counts]) => ({
    area,
    openDeliveries: counts.openDeliveries,
    availableDrivers: counts.availableDrivers,
    riskLevel:
      counts.openDeliveries > counts.availableDrivers
        ? 'high'
        : counts.openDeliveries === counts.availableDrivers
          ? 'medium'
          : 'low',
  }));
}
