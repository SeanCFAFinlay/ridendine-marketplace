// ==========================================
// CHEF PAYOUT SCHEDULE — client-safe helpers (no server imports).
// Chef payouts run weekly on Mondays (see the Payouts page fee notes). This is
// the published schedule, computed in the chef's own local time.
// ==========================================

/** 0 = Sunday … 1 = Monday. */
export const PAYOUT_WEEKDAY = 1;
/** Local hour the weekly run is published for. */
export const PAYOUT_HOUR = 9;

/** The next scheduled payout instant strictly after `now`. */
export function nextPayoutDate(now: Date): Date {
  const next = new Date(now);
  next.setHours(PAYOUT_HOUR, 0, 0, 0);
  const daysAhead = (PAYOUT_WEEKDAY - now.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysAhead);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 7);
  return next;
}

/** "2d 5h", "3h 12m", "45m", or "less than a minute". */
export function formatTimeRemaining(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms < 60_000) return 'less than a minute';
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
