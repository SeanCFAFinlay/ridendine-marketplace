// ==========================================
// CLIENT-REPORTED TIMESTAMP GUARDS (driver location, etc.)
// ==========================================

const DEFAULT_MAX_SKEW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Reject wildly wrong device clocks for optional `recordedAt` on location payloads.
 * Returns false for invalid ISO strings or times outside ±maxSkewMs of `now`.
 */
export function isPlausibleClientIsoTime(
  iso: string,
  nowMs: number = Date.now(),
  maxSkewMs: number = DEFAULT_MAX_SKEW_MS
): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Math.abs(t - nowMs) <= maxSkewMs;
}
