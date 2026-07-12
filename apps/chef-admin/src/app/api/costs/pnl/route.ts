// ==========================================
// CHEF-ADMIN COSTS API — kitchen P&L (Ghost-Kitchen Phase C.3)
//
// Per-brand contribution + kitchen prime-cost rollup for the commissary. Shared
// labour (time_entries, kitchen-scoped) is split across brands by order-count
// share (allocateLaborByOrderCount); food cost comes from active-recipe costing
// per brand; packaging is left null (needs setup) until wired. Overhead is
// allocated by sales share. No fabricated numbers — a brand with no recipe/
// labour data surfaces as needsSetup via computeKitchenPnl.
//
// Kitchen-scoped: operator sees the whole kitchen. Reuses the proven data
// gathering from /api/costs/overview.
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  computeLaborTotals,
  allocateLaborByOrderCount,
  computeKitchenPnl,
  type TimeEntryLike,
  type BrandPnlInput,
} from '@ridendine/engine';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';
import { menuItemFoodCostMap, sumOrderFoodCost, type OrderItemForFoodCost } from '@/lib/food-cost';

export const dynamic = 'force-dynamic';

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const params = request.nextUrl.searchParams;
    const days = Math.min(90, Math.max(1, Number(params.get('days') ?? 1)));
    const overhead = Math.max(0, Number(params.get('overhead') ?? 0));
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    const admin = createAdminClient() as unknown as SupabaseClient;

    // Brands under this commissary kitchen.
    const { data: storefronts } = await admin
      .from('chef_storefronts')
      .select('id, name')
      .eq('kitchen_id', ctx.kitchenId)
      .order('name', { ascending: true });
    const brands = (storefronts ?? []) as { id: string; name: string }[];
    if (brands.length === 0) {
      return successResponse({
        period: { days, since: cutoff },
        overhead: round2(overhead),
        brands: [],
        sales: 0,
        primeCostPct: null,
        message: 'No brands under this kitchen yet.',
      });
    }

    // Shared kitchen labour for the period → total cost (split across brands below).
    const { data: entryRows } = await admin
      .from('time_entries')
      .select('id, staff_id, clock_in, clock_out, hourly_rate')
      .eq('kitchen_id', ctx.kitchenId)
      .gte('clock_in', cutoff);
    const entries = (entryRows ?? []) as TimeEntryLike[];
    const laborTracked = entries.length > 0;
    const kitchenLaborCost = round2(computeLaborTotals(entries, now).totalCost);

    // Per-brand sales, fees, order count, and active-recipe food cost.
    const perBrand = await Promise.all(
      brands.map(async (sf) => {
        const [{ data: orderRows }, costMap] = await Promise.all([
          admin
            .from('orders')
            .select('total, delivery_fee, service_fee, created_at, order_items ( quantity, menu_item_id )')
            .eq('storefront_id', sf.id)
            .neq('is_test', true)
            .in('status', ['delivered', 'completed'])
            .gte('created_at', cutoff),
          menuItemFoodCostMap(admin, sf.id),
        ]);
        const orders = orderRows ?? [];
        const sales = round2(orders.reduce((s, o) => s + Number(o.total ?? 0), 0));
        const platformFees = round2(
          orders.reduce((s, o) => s + Number(o.delivery_fee ?? 0) + Number(o.service_fee ?? 0), 0),
        );
        const orderCount = orders.length;
        const foodCost =
          costMap.size > 0
            ? round2(
                orders.reduce(
                  (sum, o) =>
                    sum +
                    sumOrderFoodCost(
                      ((o as { order_items?: OrderItemForFoodCost[] }).order_items ?? []),
                      costMap,
                    ),
                  0,
                ),
              )
            : null;
        return { storefrontId: sf.id, name: sf.name, sales, platformFees, orderCount, foodCost };
      }),
    );

    // Split shared labour by order-count share.
    const laborByBrand = new Map(
      allocateLaborByOrderCount(
        kitchenLaborCost,
        perBrand.map((b) => ({ storefrontId: b.storefrontId, orderCount: b.orderCount })),
      ).map((a) => [a.storefrontId, a.amount]),
    );

    const inputs: BrandPnlInput[] = perBrand.map((b) => ({
      storefrontId: b.storefrontId,
      sales: b.sales,
      foodCost: b.foodCost,
      packagingCost: null, // wired in a later pass; shown as needs-setup until then
      laborCost: laborTracked ? (laborByBrand.get(b.storefrontId) ?? 0) : null,
      platformFees: b.platformFees,
    }));

    const pnl = computeKitchenPnl(inputs, { overhead });
    const nameById = new Map(perBrand.map((b) => [b.storefrontId, b.name]));

    return successResponse({
      period: { days, since: cutoff },
      ...pnl,
      brands: pnl.brands.map((b) => ({ ...b, name: nameById.get(b.storefrontId) ?? 'Brand' })),
      setup: {
        laborTracked,
        packagingWired: false,
      },
    });
  } catch (error) {
    console.error('Error computing kitchen P&L:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
