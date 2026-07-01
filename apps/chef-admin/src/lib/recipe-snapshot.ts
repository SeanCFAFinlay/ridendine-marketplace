// ==========================================
// RECIPE COST SNAPSHOTS (Stage 6) — point-in-time cost capture
//
// When an order is accepted, record the CURRENT cost of each ordered menu
// item's active recipe into recipe_cost_snapshots. This preserves historical
// profitability: later ingredient-price changes never retroactively alter what
// an old order cost. Best-effort and non-blocking — never throws.
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { computeMenuItemCosting } from '@ridendine/engine';

export async function snapshotOrderRecipeCosts(orderId: string): Promise<void> {
  try {
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: order } = await admin
      .from('orders')
      .select('id, storefront_id, order_items ( menu_item_id )')
      .eq('id', orderId)
      .maybeSingle();
    if (!order || !order.storefront_id) return;

    const items = (order.order_items ?? []) as Array<{ menu_item_id: string | null }>;
    const menuItemIds = [...new Set(items.map((i) => i.menu_item_id).filter((v): v is string => Boolean(v)))];
    if (menuItemIds.length === 0) return;

    const { data: recipes } = await admin
      .from('recipes')
      .select('id, menu_item_id')
      .eq('storefront_id', order.storefront_id)
      .eq('is_active', true)
      .in('menu_item_id', menuItemIds);
    const linked = (recipes ?? []).filter((r) => r.menu_item_id) as { id: string; menu_item_id: string }[];
    if (linked.length === 0) return;

    const recipeIds = linked.map((r) => r.id);
    const { data: versions } = await admin
      .from('recipe_versions')
      .select('id, recipe_id, batch_yield, version, is_active')
      .in('recipe_id', recipeIds)
      .order('version', { ascending: false });
    const versionByRecipe = new Map<string, { id: string; batch_yield: number }>();
    for (const v of (versions ?? []) as { id: string; recipe_id: string; batch_yield: number; is_active: boolean }[]) {
      const existing = versionByRecipe.get(v.recipe_id);
      if (!existing || v.is_active) versionByRecipe.set(v.recipe_id, { id: v.id, batch_yield: Number(v.batch_yield ?? 1) });
    }

    const versionIds = [...versionByRecipe.values()].map((v) => v.id);
    const { data: ingredients } = await admin
      .from('recipe_ingredients')
      .select('recipe_version_id, quantity, cost_per_unit, waste_factor')
      .in('recipe_version_id', versionIds);
    const ingByVersion = new Map<string, { quantity: number; costPerUnit: number; wasteFactor: number }[]>();
    for (const i of (ingredients ?? []) as { recipe_version_id: string; quantity: number; cost_per_unit: number; waste_factor: number }[]) {
      const arr = ingByVersion.get(i.recipe_version_id) ?? [];
      arr.push({ quantity: Number(i.quantity ?? 0), costPerUnit: Number(i.cost_per_unit ?? 0), wasteFactor: Number(i.waste_factor ?? 0) });
      ingByVersion.set(i.recipe_version_id, arr);
    }

    const { data: menuItems } = await admin.from('menu_items').select('id, price').in('id', menuItemIds);
    const priceById = new Map((menuItems ?? []).map((m) => [m.id, Number(m.price ?? 0)]));

    const { data: packs } = await admin
      .from('menu_item_packaging')
      .select('menu_item_id, quantity, packaging_item:packaging_items ( cost_per_unit )')
      .in('menu_item_id', menuItemIds);
    const packByMenu = new Map<string, { costPerUnit: number; quantity: number }[]>();
    for (const p of (packs ?? []) as unknown as Array<{ menu_item_id: string; quantity: number; packaging_item: { cost_per_unit: number } | null }>) {
      const arr = packByMenu.get(p.menu_item_id) ?? [];
      arr.push({ costPerUnit: Number(p.packaging_item?.cost_per_unit ?? 0), quantity: Number(p.quantity ?? 1) });
      packByMenu.set(p.menu_item_id, arr);
    }

    const rows = linked
      .map((r) => {
        const version = versionByRecipe.get(r.id);
        if (!version) return null;
        const costing = computeMenuItemCosting({
          ingredients: ingByVersion.get(version.id) ?? [],
          batchYield: version.batch_yield,
          packaging: packByMenu.get(r.menu_item_id) ?? [],
          sellPrice: priceById.get(r.menu_item_id) ?? 0,
        });
        return {
          recipe_version_id: version.id,
          menu_item_id: r.menu_item_id,
          ingredient_cost: costing.perPortionFoodCost,
          packaging_cost: costing.packagingCost,
          total_cost: costing.totalItemCost,
          food_cost_pct: costing.foodCostPct,
          sell_price: costing.sellPrice,
          snapshot_reason: `order:${orderId}`,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length > 0) await admin.from('recipe_cost_snapshots').insert(rows);
  } catch (error) {
    console.error('snapshotOrderRecipeCosts (best-effort) failed:', error);
  }
}
