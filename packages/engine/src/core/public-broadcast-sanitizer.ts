// ==========================================
// CUSTOMER / PUBLIC REALTIME — PAYLOAD SANITIZER
// Whitelist-only projection for order:{orderId} broadcasts (Phase 2).
// ==========================================

/** Keys permitted on `order_update` customer broadcasts (snake_case). */
export const PUBLIC_ORDER_BROADCAST_KEYS = [
  'public_stage',
  'eta_pickup_at',
  'eta_dropoff_at',
  'route_progress_pct',
  'route_remaining_seconds',
  'route_to_dropoff_polyline',
] as const;

export type PublicOrderBroadcastKey = (typeof PUBLIC_ORDER_BROADCAST_KEYS)[number];

/** Exact keys (case-insensitive) and suffix patterns that must never appear in customer payloads. */
const FORBIDDEN_EXACT_CI = new Set([
  'lat',
  'lng',
  'latitude',
  'longitude',
  'driver_lat',
  'driver_lng',
  'chef_lat',
  'chef_lng',
  'storefront_lat',
  'storefront_lng',
  'position',
  'driver_position',
  'chef_position',
  'coordinates',
  'location',
  'driverlocation',
  'cheflocation',
  'driver_location',
  'chef_location',
  'storefront_location',
  'geolocation',
]);

function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (FORBIDDEN_EXACT_CI.has(lower)) return true;
  if (lower.endsWith('_lat') || lower.endsWith('_lng')) return true;
  if (lower.startsWith('lat_') || lower.startsWith('lng_')) return true;
  return false;
}

/**
 * Returns a new object containing only whitelisted keys with non-forbidden names.
 */
export function sanitizePublicOrderBroadcastPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PUBLIC_ORDER_BROADCAST_KEYS) {
    if (!(key in payload)) continue;
    if (isForbiddenKey(key)) continue;
    const v = payload[key];
    if (v === undefined) continue;
    out[key] = v;
  }
  return out;
}

/**
 * Shallow strip of sensitive keys for non-customer channels (e.g. driver offers prep).
 */
export function stripSensitiveCoordinateKeys(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (isForbiddenKey(k)) continue;
    out[k] = v;
  }
  return out;
}
