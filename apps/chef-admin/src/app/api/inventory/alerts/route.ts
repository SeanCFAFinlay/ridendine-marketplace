// ==========================================
// CHEF-ADMIN INVENTORY API — live alerts
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { computeInventoryAlerts, computeReorderSuggestion } from '@ridendine/engine';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inventory/alerts
 * Derive low-stock / stockout / expiry alerts from current item state. Computed
 * on read (no fabricated rows) so the chef always sees the true picture.
 */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('inventory_items')
      .select('id, name, unit, current_quantity, reorder_point, par_quantity, expiry_date, is_active')
      .eq('kitchen_id', ctx.kitchenId);

    if (error) {
      console.error('Inventory alerts query error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load inventory', 500);
    }

    const items = data ?? [];
    const byId = new Map(items.map((i) => [i.id, i]));

    const alerts = computeInventoryAlerts(
      items.map((i) => ({
        id: i.id,
        onHand: Number(i.current_quantity ?? 0),
        reorderPoint: i.reorder_point,
        parQuantity: i.par_quantity,
        expiryDate: i.expiry_date,
        isActive: i.is_active,
      })),
      new Date()
    ).map((a) => {
      const item = byId.get(a.inventoryItemId);
      return {
        ...a,
        name: item?.name ?? null,
        unit: item?.unit ?? null,
        onHand: Number(item?.current_quantity ?? 0),
        reorderSuggestion: item
          ? computeReorderSuggestion({
              onHand: Number(item.current_quantity ?? 0),
              reorderPoint: item.reorder_point,
              parQuantity: item.par_quantity,
            })
          : 0,
      };
    });

    return successResponse({ alerts, count: alerts.length });
  } catch (error) {
    console.error('Error computing inventory alerts:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
