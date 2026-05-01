// ==========================================
// KITCHEN AVAILABILITY — customer checkout guards (Phase 7 / IRR-032)
// Pure helpers + types; DB reads live in KitchenEngine.validateCustomerCheckoutReadiness
// ==========================================

export type CheckoutReadinessFailureCode =
  | 'STOREFRONT_NOT_FOUND'
  | 'STOREFRONT_NOT_ACTIVE'
  | 'STOREFRONT_PAUSED'
  | 'CHEF_NOT_APPROVED'
  | 'OUTSIDE_AVAILABILITY_HOURS'
  | 'MENU_ITEM_UNAVAILABLE';

export type CheckoutReadinessResult =
  | { ok: true }
  | { ok: false; code: CheckoutReadinessFailureCode; message: string };

/** `HH:MM` or `HH:MM:SS` → minutes from midnight (0–1439 clamp). */
export function timeStringToMinutes(t: string): number {
  const parts = String(t).trim().split(':').map((p) => parseInt(p, 10));
  const h = Number.isFinite(parts[0]) ? parts[0]! : 0;
  const m = Number.isFinite(parts[1]) ? parts[1]! : 0;
  return Math.min(1439, Math.max(0, h * 60 + m));
}

/**
 * Weekly rows: one row per `day_of_week` (0–6, JS `Date#getDay()`).
 * Empty `rows` → schedule not configured → **allow** (backward compatible).
 * If any rows exist, today's row must exist and `is_available` with current local time in `[start_time, end_time)`.
 */
export function evaluateWeeklyAvailability(
  now: Date,
  rows: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }[]
): { allowed: boolean; code?: CheckoutReadinessFailureCode } {
  if (!rows.length) return { allowed: true };

  const dow = now.getDay();
  const todayRow = rows.find((r) => r.day_of_week === dow);
  if (!todayRow) {
    return { allowed: false, code: 'OUTSIDE_AVAILABILITY_HOURS' };
  }
  if (!todayRow.is_available) {
    return { allowed: false, code: 'OUTSIDE_AVAILABILITY_HOURS' };
  }

  const cur = now.getHours() * 60 + now.getMinutes();
  const start = timeStringToMinutes(todayRow.start_time);
  const end = timeStringToMinutes(todayRow.end_time);

  if (end > start) {
    if (cur < start || cur >= end) {
      return { allowed: false, code: 'OUTSIDE_AVAILABILITY_HOURS' };
    }
  } else if (end < start) {
    // Overnight window, e.g. 22:00–02:00
    if (cur < start && cur >= end) {
      return { allowed: false, code: 'OUTSIDE_AVAILABILITY_HOURS' };
    }
  } else {
    // start === end → treat as closed window
    return { allowed: false, code: 'OUTSIDE_AVAILABILITY_HOURS' };
  }

  return { allowed: true };
}
