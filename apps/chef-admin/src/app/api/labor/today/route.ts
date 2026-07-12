// ==========================================
// CHEF-ADMIN LABOUR API — today's labour snapshot
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { computeLaborTotals, hoursBetween, type TimeEntryLike } from '@ridendine/engine';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';
import { kitchenDateKey } from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

const LOOKBACK_HOURS = 36;

/** GET /api/labor/today — who's on the clock + today's hours and labour cost. */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const now = new Date();
    const today = kitchenDateKey(now);
    const cutoff = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data, error } = await admin
      .from('time_entries')
      .select('id, staff_id, clock_in, clock_out, hourly_rate')
      .eq('kitchen_id', ctx.kitchenId)
      .gte('clock_in', cutoff.toISOString());

    if (error) {
      console.error('Labour today query error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load labour', 500);
    }

    // Keep entries that belong to today (kitchen tz) or are still open.
    const entries = (data ?? []).filter(
      (e) => !e.clock_out || kitchenDateKey(new Date(e.clock_in)) === today
    ) as TimeEntryLike[];

    const totals = computeLaborTotals(entries, now);

    // Names for whoever is currently on the clock.
    const activeStaffIds = [...new Set((data ?? []).filter((e) => !e.clock_out).map((e) => e.staff_id))];
    let onClock: Array<{ staffId: string; name: string | null; hours: number }> = [];
    if (activeStaffIds.length > 0) {
      const { data: staff } = await admin
        .from('kitchen_staff')
        .select('id, name')
        .in('id', activeStaffIds);
      const nameById = new Map((staff ?? []).map((s) => [s.id, s.name]));
      onClock = (data ?? [])
        .filter((e) => !e.clock_out)
        .map((e) => ({
          staffId: e.staff_id,
          name: nameById.get(e.staff_id) ?? null,
          hours: Math.round(hoursBetween(e.clock_in, null, now) * 100) / 100,
        }));
    }

    return successResponse({
      today,
      laborHours: Math.round(totals.totalHours * 100) / 100,
      laborCost: Math.round(totals.totalCost * 100) / 100,
      activeCount: totals.activeCount,
      staffCount: totals.staffCount,
      onClock,
    });
  } catch (error) {
    console.error('Error loading labour today:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
