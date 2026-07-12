// ==========================================
// INVENTORY CONSUMPTION SERVICE (Ghost-Kitchen Phase B)
//
// Pure core of the shared-pool auto-decrement: given the lines of a completed
// order and the active recipe behind each line, compute how much of each shared
// inventory item the order consumed. No DB access — callers pass already-fetched
// recipe/ingredient rows, so this is exhaustively unit-testable and identical
// whichever brand's order triggered it (the pool is the kitchen's, not a brand's).
//
// The DB subscriber then turns each consumption into a `consume_order`
// inventory_stock_movement (signed via signedMovementQuantity), tags it with
// { order_id, storefront_id } for brand attribution, and is idempotent on
// order_id so completing the same order twice never double-decrements.
//
// Quantities are in each item's stock unit; rounded to 4 dp to match
// inventory NUMERIC(14,4).
// ==========================================

import { signedMovementQuantity } from '../orchestrators/inventory.engine';

export interface RecipeIngredientUsage {
  inventoryItemId: string;
  /** Amount used to produce ONE batch of the recipe, in the item's stock unit. */
  quantityPerBatch: number;
  /** Fraction lost to trim/spoilage, 0..1 (physically removed from stock too). */
  wasteFactor?: number;
}

export interface OrderItemRecipe {
  /** Portions produced by one batch of the active recipe version. */
  batchYield: number;
  ingredients: RecipeIngredientUsage[];
}

export interface OrderLineConsumptionInput {
  /** Portions ordered on this line. */
  quantity: number;
  /**
   * The active recipe for this line's menu item, or null when the item has no
   * recipe mapped yet (that line simply consumes nothing — never guess).
   */
  recipe: OrderItemRecipe | null;
}

export interface StockConsumption {
  inventoryItemId: string;
  /** Positive magnitude of stock consumed, summed across all lines. */
  quantity: number;
}

export interface ConsumeOrderMovement {
  inventoryItemId: string;
  /** Signed ledger quantity (negative for consume_order). */
  quantity: number;
  movementType: 'consume_order';
}

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/**
 * Stock consumed per PORTION for one ingredient: its per-batch amount (grossed
 * up for waste) spread across the batch yield. A non-positive batchYield is
 * treated as a single-portion recipe so we never divide by zero.
 */
export function perPortionIngredientUsage(
  ingredient: RecipeIngredientUsage,
  batchYield: number,
): number {
  const waste = Math.max(0, ingredient.wasteFactor ?? 0);
  const perBatchWithWaste = ingredient.quantityPerBatch * (1 + waste);
  if (batchYield <= 0) return perBatchWithWaste;
  return perBatchWithWaste / batchYield;
}

/**
 * Aggregate stock consumption for a whole order. Lines without a recipe, with a
 * non-positive quantity, or with a blank/non-positive ingredient are skipped.
 * The same inventory item used by several lines is summed into one entry.
 */
export function computeOrderStockConsumption(
  lines: OrderLineConsumptionInput[],
): StockConsumption[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    if (!line.recipe || line.quantity <= 0) continue;
    for (const ing of line.recipe.ingredients) {
      if (!ing.inventoryItemId || ing.quantityPerBatch <= 0) continue;
      const perPortion = perPortionIngredientUsage(ing, line.recipe.batchYield);
      const add = perPortion * line.quantity;
      if (add <= 0) continue;
      totals.set(ing.inventoryItemId, (totals.get(ing.inventoryItemId) ?? 0) + add);
    }
  }

  return [...totals.entries()]
    .map(([inventoryItemId, quantity]) => ({ inventoryItemId, quantity: round4(quantity) }))
    .filter((c) => c.quantity > 0);
}

/**
 * The consume_order stock movements for an order, ready to write to the ledger.
 * Quantities are signed negative via signedMovementQuantity so on-hand =
 * Σ movements stays correct.
 */
export function buildConsumeOrderMovements(
  lines: OrderLineConsumptionInput[],
): ConsumeOrderMovement[] {
  return computeOrderStockConsumption(lines).map((c) => ({
    inventoryItemId: c.inventoryItemId,
    quantity: signedMovementQuantity('consume_order', c.quantity),
    movementType: 'consume_order' as const,
  }));
}
