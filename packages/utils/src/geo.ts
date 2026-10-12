// ==========================================
// GEO UTILITIES
// Distance and area extraction functions
// Extracted from ops.repository.ts (FND-007)
// ==========================================

/**
 * Calculate Haversine distance between two coordinates in km.
 * Returns null if any coordinate is missing.
 */
export function calculateDistanceKm(
  lat1?: number | null,
  lng1?: number | null,
  lat2?: number | null,
  lng2?: number | null
): number | null {
  // Explicit checks: coordinate 0 (equator/prime meridian) is valid.
  if (
    lat1 == null || lng1 == null || lat2 == null || lng2 == null ||
    !Number.isFinite(lat1) || !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) || !Number.isFinite(lng2)
  ) {
    return null;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Extract area name from an address string.
 * Takes the second comma-separated segment (usually city/neighborhood).
 */
export function extractAreaFromAddress(address: string | null | undefined): string {
  if (!address) return 'Unknown';
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts[1] ?? parts[0] ?? 'Unknown';
}

/**
 * Dispatch location freshness TTL threshold in milliseconds (90 seconds).
 * Driver locations older than this threshold are considered stale.
 */
export const DRIVER_LOCATION_STALE_THRESHOLD_MS = 90_000;

