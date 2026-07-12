// ==========================================
// CHEF-ADMIN PRODUCTION API — consolidated prep sheet (Ghost-Kitchen Phase B.2)
//
// One kitchen-wide prep sheet: aggregates active-order demand ACROSS all brands
// under the commissary, resolves each menu item's active recipe, and rolls the
// ingredient needs up per shared inventory item (with the contributing brands)
// via the verified consolidatePrepDemand core. Prep once for every brand.
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  consolidatePrepDemand,
  type BrandPrepDemand,
  type OrderItemRecipe,
  type OrderLineConsumptionInput,
} from '@ridendine/engine';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const ACTIVE_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_pickup'];

export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: storefronts } = await admin
      .from('chef_storefronts')
      .select('id, name')
      .eq('kitchen_id', ctx.kitchenId)
      .order('name', { ascending: true });
    const brands = (storefronts ?? []) as { id: string; name: string }[];
    if (brands.length === 0) {
      return successResponse({ brands: [], prepSheet: [] });
    }

    // Cache active recipes across the whole kitchen (a menu item resolves once).
    const recipeCache = new Map<string, OrderItemRecipe | null>();
    async function loadRecipe(menuItemId: string): Promise<OrderItemRecipe | null> {
      const cached = recipeCache.get(menuItemId);
      if (cached !== undefined) return cached;
      const { data: link } = await admin
        .from('menu_item_recipe_versions')
        .select('recipe_version_id')
        .eq('menu_item_id', menuItemId)
        .eq('is_active', true)
        .maybeSingle();
      const rvId = (link?.recipe_version_id as string | undefined) ?? null;
      if (!rvId) {
        recipeCache.set(menuItemId, null);
        return null;
      }
      const [{ data: version }, { data: ings }] = await Promise.all([
        admin.from('recipe_versions').select('batch_yield').eq('id', rvId).maybeSingle(),
        admin
          .from('recipe_ingredients')
          .select('inventory_item_id, quantity, waste_factor')
          .eq('recipe_version_id', rvId),
      ]);
      const recipe: OrderItemRecipe = {
        batchYield: Number(version?.batch_yield ?? 1),
        ingredients: (ings ?? [])
          .filter((i) => Boolean(i.inventory_item_id))
          .map((i) => ({
            inventoryItemId: i.inventory_item_id as string,
            quantityPerBatch: Number(i.quantity ?? 0),
            wasteFactor: Number(i.waste_factor ?? 0),
          })),
      };
      recipeCache.set(menuItemId, recipe);
      return recipe;
    }

    const brandDemands: BrandPrepDemand[] = [];
    for (const sf of brands) {
      const { data: orders } = await admin
        .from('orders')
        .select('order_items ( menu_item_id, quantity )')
        .eq('storefront_id', sf.id)
        .neq('is_test', true)
        .in('status', ACTIVE_STATUSES);

      const qtyByMenuItem = new Map<string, number>();
      for (const o of orders ?? []) {
        for (const oi of (o as { order_items?: { menu_item_id?: string; quantity?: number }[] }).order_items ?? []) {
          if (!oi.menu_item_id) continue;
          qtyByMenuItem.set(oi.menu_item_id, (qtyByMenuItem.get(oi.menu_item_id) ?? 0) + Number(oi.quantity ?? 0));
        }
      }

      const items: OrderLineConsumptionInput[] = [];
      for (const [menuItemId, quantity] of qtyByMenuItem) {
        items.push({ quantity, recipe: await loadRecipe(menuItemId) });
      }
      brandDemands.push({ storefrontId: sf.id, brandName: sf.name, items });
    }

    const prepSheet = consolidatePrepDemand(brandDemands);

    // Attach ingredient name/unit from the shared pool.
    const itemIds = prepSheet.map((l) => l.inventoryItemId);
    const { data: invItems } =
      itemIds.length > 0
        ? await admin
            .from('inventory_items')
            .select('id, name, unit')
            .eq('kitchen_id', ctx.kitchenId)
            .in('id', itemIds)
        : { data: [] as { id: string; name: string; unit: string | null }[] };
    const infoById = new Map((invItems ?? []).map((i) => [i.id, i]));

    return successResponse({
      brands: brands.map((b) => ({ storefrontId: b.id, name: b.name })),
      prepSheet: prepSheet.map((l) => ({
        ...l,
        name: infoById.get(l.inventoryItemId)?.name ?? null,
        unit: infoById.get(l.inventoryItemId)?.unit ?? null,
      })),
    });
  } catch (error) {
    console.error('Error building consolidated prep sheet:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
