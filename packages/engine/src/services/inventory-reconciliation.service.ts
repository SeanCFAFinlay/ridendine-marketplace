// ==========================================
// INVENTORY RECONCILIATION SERVICE
//
// Authoritative inventory ledger reconciliation.
// On-hand stock in RideNDine is formally defined as the signed sum of
// `inventory_stock_movements`. `inventory_items.current_quantity` acts as a fast
// denormalized cache for queries and order validation.
//
// This service reconciles the cache against the immutable ledger, detecting
// any cache drift (from concurrency races, direct DB updates, or partial failures),
// computing discrepancy reports, and generating safe healing patches.
// ==========================================

import { type MovementType, signedMovementQuantity } from '../orchestrators/inventory.engine';

export interface InventoryItemStock {
  id: string;
  kitchenId?: string;
  name: string;
  currentQuantity: number;
  unit?: string;
}

export interface StockMovementEntry {
  id?: string;
  inventoryItemId: string;
  quantity: number;
  movementType?: MovementType | string;
}

export interface ItemReconciliationDiscrepancy {
  itemId: string;
  name: string;
  cachedQuantity: number;
  ledgerQuantity: number;
  drift: number;
  hasDrift: boolean;
}

export interface InventoryReconciliationReport {
  totalItemsChecked: number;
  alignedCount: number;
  driftedCount: number;
  discrepancies: ItemReconciliationDiscrepancy[];
  healingPatches: Array<{ itemId: string; currentQuantity: number }>;
  generatedAt: string;
}

const DEFAULT_DRIFT_TOLERANCE = 0.0001;

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

/**
 * Reconcile a single inventory item against its ledger movements.
 */
export function reconcileItemStock(
  item: InventoryItemStock,
  movements: StockMovementEntry[],
  tolerance = DEFAULT_DRIFT_TOLERANCE
): ItemReconciliationDiscrepancy {
  let ledgerSum = 0;

  for (const m of movements) {
    if (m.inventoryItemId !== item.id) continue;
    const movementType = (m.movementType ?? 'adjustment') as MovementType;
    const signedQty = signedMovementQuantity(movementType, m.quantity);
    ledgerSum += signedQty;
  }

  const roundedLedger = round4(ledgerSum);
  const roundedCached = round4(item.currentQuantity);
  const drift = round4(roundedCached - roundedLedger);
  const hasDrift = Math.abs(drift) > tolerance;

  return {
    itemId: item.id,
    name: item.name,
    cachedQuantity: roundedCached,
    ledgerQuantity: roundedLedger,
    drift,
    hasDrift,
  };
}

/**
 * Reconcile a collection of items against their associated ledger movements.
 */
export function reconcileKitchenInventory(
  items: InventoryItemStock[],
  movements: StockMovementEntry[],
  tolerance = DEFAULT_DRIFT_TOLERANCE
): InventoryReconciliationReport {
  const movementsByItem = new Map<string, StockMovementEntry[]>();

  for (const m of movements) {
    const list = movementsByItem.get(m.inventoryItemId) ?? [];
    list.push(m);
    movementsByItem.set(m.inventoryItemId, list);
  }

  const discrepancies: ItemReconciliationDiscrepancy[] = [];
  const healingPatches: Array<{ itemId: string; currentQuantity: number }> = [];

  for (const item of items) {
    const itemMovements = movementsByItem.get(item.id) ?? [];
    const result = reconcileItemStock(item, itemMovements, tolerance);

    if (result.hasDrift) {
      discrepancies.push(result);
      healingPatches.push({
        itemId: item.id,
        currentQuantity: result.ledgerQuantity,
      });
    }
  }

  const totalItemsChecked = items.length;
  const driftedCount = discrepancies.length;
  const alignedCount = totalItemsChecked - driftedCount;

  return {
    totalItemsChecked,
    alignedCount,
    driftedCount,
    discrepancies,
    healingPatches,
    generatedAt: new Date().toISOString(),
  };
}
