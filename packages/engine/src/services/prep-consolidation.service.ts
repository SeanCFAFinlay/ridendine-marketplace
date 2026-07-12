// ==========================================
// PREP CONSOLIDATION SERVICE (Ghost-Kitchen Phase B.2)
//
// Pure core of the consolidated prep sheet: given each brand's demand (menu
// items + quantities + their active recipe), aggregate how much of each SHARED
// ingredient the whole kitchen needs to prep, tagging which brands contribute.
// One list, grouped by shared inventory item — the operator preps once for all
// brands instead of per-brand. No DB access; reuses the verified consumption
// core so the per-portion/waste math is identical to auto-decrement.
// ==========================================

import {
  computeOrderStockConsumption,
  type OrderLineConsumptionInput,
} from './inventory-consumption.service';

export interface BrandPrepDemand {
  storefrontId: string;
  brandName: string;
  /** This brand's demand lines: portions + the active recipe per menu item. */
  items: OrderLineConsumptionInput[];
}

export interface ConsolidatedPrepContribution {
  storefrontId: string;
  brandName: string;
  quantity: number;
}

export interface ConsolidatedPrepLine {
  inventoryItemId: string;
  totalQuantity: number;
  contributingBrands: ConsolidatedPrepContribution[];
}

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/**
 * Aggregate per-brand demand into one prep sheet keyed by shared inventory item.
 * Each line carries the total quantity and the per-brand breakdown (sorted
 * largest contributor first). Ingredients no brand needs are omitted.
 */
export function consolidatePrepDemand(brands: BrandPrepDemand[]): ConsolidatedPrepLine[] {
  const byItem = new Map<
    string,
    { total: number; brands: Map<string, ConsolidatedPrepContribution> }
  >();

  for (const brand of brands) {
    // Reuse the verified consumption math for this brand's demand.
    const consumption = computeOrderStockConsumption(brand.items);
    for (const c of consumption) {
      const entry = byItem.get(c.inventoryItemId) ?? { total: 0, brands: new Map() };
      entry.total += c.quantity;
      const existing = entry.brands.get(brand.storefrontId);
      if (existing) {
        existing.quantity = round4(existing.quantity + c.quantity);
      } else {
        entry.brands.set(brand.storefrontId, {
          storefrontId: brand.storefrontId,
          brandName: brand.brandName,
          quantity: round4(c.quantity),
        });
      }
      byItem.set(c.inventoryItemId, entry);
    }
  }

  return [...byItem.entries()]
    .map(([inventoryItemId, entry]) => ({
      inventoryItemId,
      totalQuantity: round4(entry.total),
      contributingBrands: [...entry.brands.values()].sort((a, b) => b.quantity - a.quantity),
    }))
    .filter((line) => line.totalQuantity > 0)
    .sort((a, b) => b.totalQuantity - a.totalQuantity);
}
