// ==========================================
// CHEF-ADMIN LABOUR API — labour cost & efficiency (today)
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  computeLaborTotals,
  laborPercentOfSales,
  salesPerLaborHour,
  laborPerOrder,
  type TimeEntryLike,
} from '@ridendine/engine';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';
import { kitchenDateKey } from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

const LOOKBACK_HOURS = 36;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number | null) => (n === null ? null : Math.round(n * 10000) / 10000);

/**
 * GET /api/labor/costs — today's labour cost plus efficiency ratios. Ratios are
 * null (not zero) until the underlying data exists, so the UI can show real
 * numbers or a "needs setup" state rather than fabricated ones.
 */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const now = new Date();
    const today = kitchenDateKey(now);
    const cutoff = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const admin = createAdminClient() as unknown as SupabaseClient;

    const [entriesResult, ordersResult] = await Promise.all([
      admin
        .from('time_entries')
        .select('id, staff_id, clock_in, clock_out, hourly_rate')
        .eq('kitchen_id', ctx.kitchenId)
        .gte('clock_in', cutoff.toISOString()),
      admin
        .from('orders')
        .select('total, created_at')
        .eq('storefront_id', ctx.storefrontId ?? '')
        .neq('is_test', true)
        .in('status', ['delivered', 'completed'])
        .gte('created_at', cutoff.toISOString()),
    ]);

    const entries = (entriesResult.data ?? []).filter(
      (e) => !e.clock_out || kitchenDateKey(new Date(e.clock_in)) === today
    ) as TimeEntryLike[];
    const totals = computeLaborTotals(entries, now);

    const ordersToday = (ordersResult.data ?? []).filter(
      (o) => o.created_at && kitchenDateKey(new Date(o.created_at)) === today
    );
    const salesToday = ordersToday.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const orderCount = ordersToday.length;

    const hasLaborData = entries.length > 0;

    return successResponse({
      today,
      hasLaborData,
      laborCost: round2(totals.totalCost),
      laborHours: round2(totals.totalHours),
      salesToday: round2(salesToday),
      orderCount,
      laborPercentOfSales: round4(laborPercentOfSales(totals.totalCost, salesToday)),
      salesPerLaborHour: round2Nullable(salesPerLaborHour(salesToday, totals.totalHours)),
      laborPerOrder: round2Nullable(laborPerOrder(totals.totalCost, orderCount)),
    });
  } catch (error) {
    console.error('Error computing labour costs:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

function round2Nullable(n: number | null): number | null {
  return n === null ? null : Math.round(n * 100) / 100;
}
