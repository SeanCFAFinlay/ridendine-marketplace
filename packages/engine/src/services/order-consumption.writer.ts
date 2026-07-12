// ==========================================
// ORDER CONSUMPTION WRITER (Ghost-Kitchen Phase B.3)
//
// The DB side of shared-pool auto-decrement. Built on the pure
// inventory-consumption core: on order completion it loads the order's lines and
// their active recipes, computes what the shared kitchen pool consumed, writes
// `consume_order` movements (tagged with { order_id, storefront_id } for brand
// attribution), and keeps each item's current_quantity cache in step.
//
// IDEMPOTENT: skips entirely if this order already has consume_order movements,
// and the DB unique index uq_inventory_movements_consume_order is the backstop
// against a racing duplicate order.completed — so the pool is never
// double-decremented. BEST-EFFORT by contract: the caller wraps this so a
// consumption failure can never undo a completed order.
//
// Uses the untyped Supabase client (like the order engine) so it needs no
// regenerated types to compile.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildConsumeOrderMovements,
  type OrderItemRecipe,
  type OrderLineConsumptionInput,
} from './inventory-consumption.service';
import { applyMovementToQuantity } from '../orchestrators/inventory.engine';

export interface OrderConsumptionResult {
  skipped: boolean;
  reason?: 'already_applied' | 'no_kitchen' | 'no_consumption';
  movementsWritten: number;
}

export async function applyOrderStockConsumption(
  client: SupabaseClient,
  input: { orderId: string; storefrontId: string; actorUserId?: string | null },
): Promise<OrderConsumptionResult> {
  const { orderId, storefrontId } = input;

  // Resolve the commissary kitchen that owns this brand's shared pool.
  const { data: sf } = await client
    .from('chef_storefronts')
    .select('kitchen_id')
    .eq('id', storefrontId)
    .maybeSingle();
  const kitchenId = (sf?.kitchen_id as string | undefined) ?? null;
  if (!kitchenId) return { skipped: true, reason: 'no_kitchen', movementsWritten: 0 };

  // Idempotency: if this order already produced consume_order movements, stop.
  const { data: existing } = await client
    .from('inventory_stock_movements')
    .select('id')
    .eq('movement_type', 'consume_order')
    .filter('metadata->>order_id', 'eq', orderId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { skipped: true, reason: 'already_applied', movementsWritten: 0 };
  }

  // Order lines.
  const { data: items } = await client
    .from('order_items')
    .select('menu_item_id, quantity')
    .eq('order_id', orderId);
  const orderItems = (items ?? []).filter((i: { menu_item_id?: string | null }) => i.menu_item_id);
  if (orderItems.length === 0) {
    return { skipped: true, reason: 'no_consumption', movementsWritten: 0 };
  }

  // Active recipe (+ ingredients) per distinct menu item.
  const menuItemIds = [...new Set(orderItems.map((i: { menu_item_id: string }) => i.menu_item_id))];
  const recipeByMenuItem = new Map<string, OrderItemRecipe | null>();

  for (const menuItemId of menuItemIds) {
    const { data: link } = await client
      .from('menu_item_recipe_versions')
      .select('recipe_version_id')
      .eq('menu_item_id', menuItemId)
      .eq('is_active', true)
      .maybeSingle();
    const recipeVersionId = (link?.recipe_version_id as string | undefined) ?? null;
    if (!recipeVersionId) {
      recipeByMenuItem.set(menuItemId, null);
      continue;
    }

    const [{ data: version }, { data: ingredients }] = await Promise.all([
      client.from('recipe_versions').select('batch_yield').eq('id', recipeVersionId).maybeSingle(),
      client
        .from('recipe_ingredients')
        .select('inventory_item_id, quantity, waste_factor')
        .eq('recipe_version_id', recipeVersionId),
    ]);

    const usable = (ingredients ?? [])
      .filter((ing: { inventory_item_id?: string | null }) => ing.inventory_item_id)
      .map((ing: { inventory_item_id: string; quantity?: number; waste_factor?: number }) => ({
        inventoryItemId: ing.inventory_item_id,
        quantityPerBatch: Number(ing.quantity ?? 0),
        wasteFactor: Number(ing.waste_factor ?? 0),
      }));

    recipeByMenuItem.set(menuItemId, {
      batchYield: Number(version?.batch_yield ?? 1),
      ingredients: usable,
    });
  }

  const lines: OrderLineConsumptionInput[] = orderItems.map(
    (i: { menu_item_id: string; quantity?: number }) => ({
      quantity: Number(i.quantity ?? 0),
      recipe: recipeByMenuItem.get(i.menu_item_id) ?? null,
    }),
  );

  const movements = buildConsumeOrderMovements(lines);
  if (movements.length === 0) {
    return { skipped: true, reason: 'no_consumption', movementsWritten: 0 };
  }

  // Write the ledger movements + keep the current_quantity cache in step.
  let written = 0;
  for (const m of movements) {
    const { error: insErr } = await client.from('inventory_stock_movements').insert({
      kitchen_id: kitchenId,
      inventory_item_id: m.inventoryItemId,
      movement_type: 'consume_order',
      quantity: m.quantity, // already signed negative
      metadata: { order_id: orderId, storefront_id: storefrontId },
      note: 'Auto-decrement on order completion',
      created_by: input.actorUserId ?? null,
    });
    // A unique-index conflict means a racing completion already wrote it — skip.
    if (insErr) continue;
    written += 1;

    const { data: item } = await client
      .from('inventory_items')
      .select('current_quantity')
      .eq('id', m.inventoryItemId)
      .eq('kitchen_id', kitchenId)
      .maybeSingle();
    if (item) {
      await client
        .from('inventory_items')
        .update({
          current_quantity: applyMovementToQuantity(Number(item.current_quantity ?? 0), m.quantity),
        })
        .eq('id', m.inventoryItemId)
        .eq('kitchen_id', kitchenId);
    }
  }

  return { skipped: false, movementsWritten: written };
}
