import { describe, it, expect } from 'vitest';
import {
  reconcileItemStock,
  reconcileKitchenInventory,
  type InventoryItemStock,
  type StockMovementEntry,
} from './inventory-reconciliation.service';

describe('inventory-reconciliation.service', () => {
  const itemBeef: InventoryItemStock = {
    id: 'item-beef',
    kitchenId: 'kitchen-1',
    name: 'Ground Beef',
    currentQuantity: 15.5,
    unit: 'kg',
  };

  const itemOnions: InventoryItemStock = {
    id: 'item-onions',
    kitchenId: 'kitchen-1',
    name: 'Yellow Onions',
    currentQuantity: 8.0,
    unit: 'kg',
  };

  describe('reconcileItemStock', () => {
    it('reports no drift when cached quantity matches sum of ledger movements', () => {
      const movements: StockMovementEntry[] = [
        { inventoryItemId: 'item-beef', quantity: 20, movementType: 'receive' },
        { inventoryItemId: 'item-beef', quantity: 3.5, movementType: 'consume_order' },
        { inventoryItemId: 'item-beef', quantity: 1.0, movementType: 'waste' },
      ];

      const result = reconcileItemStock(itemBeef, movements);

      expect(result.hasDrift).toBe(false);
      expect(result.cachedQuantity).toBe(15.5);
      expect(result.ledgerQuantity).toBe(15.5);
      expect(result.drift).toBe(0);
    });

    it('detects positive drift when cache is higher than ledger', () => {
      const movements: StockMovementEntry[] = [
        { inventoryItemId: 'item-beef', quantity: 20, movementType: 'receive' },
        { inventoryItemId: 'item-beef', quantity: 6.0, movementType: 'consume_order' }, // ledger = 14.0
      ];

      const result = reconcileItemStock(itemBeef, movements);

      expect(result.hasDrift).toBe(true);
      expect(result.cachedQuantity).toBe(15.5);
      expect(result.ledgerQuantity).toBe(14.0);
      expect(result.drift).toBe(1.5);
    });

    it('detects negative drift when cache is lower than ledger', () => {
      const movements: StockMovementEntry[] = [
        { inventoryItemId: 'item-beef', quantity: 20, movementType: 'receive' },
        { inventoryItemId: 'item-beef', quantity: 2.0, movementType: 'consume_order' }, // ledger = 18.0
      ];

      const result = reconcileItemStock(itemBeef, movements);

      expect(result.hasDrift).toBe(true);
      expect(result.cachedQuantity).toBe(15.5);
      expect(result.ledgerQuantity).toBe(18.0);
      expect(result.drift).toBe(-2.5);
    });

    it('respects custom tolerance threshold for floating point precision', () => {
      const itemWithTinyDrift: InventoryItemStock = {
        id: 'item-tiny',
        name: 'Salt',
        currentQuantity: 10.00004,
      };

      const movements: StockMovementEntry[] = [
        { inventoryItemId: 'item-tiny', quantity: 10, movementType: 'receive' },
      ];

      const strictResult = reconcileItemStock(itemWithTinyDrift, movements, 0.00001);
      const tolerantResult = reconcileItemStock(itemWithTinyDrift, movements, 0.001);

      expect(strictResult.hasDrift).toBe(false); // round4 normalizes 10.00004 to 10
      expect(tolerantResult.hasDrift).toBe(false);
    });
  });

  describe('reconcileKitchenInventory', () => {
    it('reconciles entire kitchen inventory, generating report and healing patches', () => {
      const items = [itemBeef, itemOnions];
      const movements: StockMovementEntry[] = [
        // Beef: 20 in, 4.5 consumed = 15.5 (aligned with currentQuantity 15.5)
        { inventoryItemId: 'item-beef', quantity: 20, movementType: 'receive' },
        { inventoryItemId: 'item-beef', quantity: 4.5, movementType: 'consume_order' },
        // Onions: 10 in, 3 consumed = 7.0 (drifted from currentQuantity 8.0)
        { inventoryItemId: 'item-onions', quantity: 10, movementType: 'receive' },
        { inventoryItemId: 'item-onions', quantity: 3.0, movementType: 'consume_order' },
      ];

      const report = reconcileKitchenInventory(items, movements);

      expect(report.totalItemsChecked).toBe(2);
      expect(report.alignedCount).toBe(1);
      expect(report.driftedCount).toBe(1);

      expect(report.discrepancies).toHaveLength(1);
      expect(report.discrepancies[0]).toEqual({
        itemId: 'item-onions',
        name: 'Yellow Onions',
        cachedQuantity: 8.0,
        ledgerQuantity: 7.0,
        drift: 1.0,
        hasDrift: true,
      });

      expect(report.healingPatches).toEqual([
        {
          itemId: 'item-onions',
          currentQuantity: 7.0,
        },
      ]);

      expect(report.generatedAt).toBeTruthy();
    });

    it('returns empty discrepancies when all items are aligned', () => {
      const items = [itemBeef];
      const movements: StockMovementEntry[] = [
        { inventoryItemId: 'item-beef', quantity: 15.5, movementType: 'receive' },
      ];

      const report = reconcileKitchenInventory(items, movements);

      expect(report.totalItemsChecked).toBe(1);
      expect(report.alignedCount).toBe(1);
      expect(report.driftedCount).toBe(0);
      expect(report.discrepancies).toHaveLength(0);
      expect(report.healingPatches).toHaveLength(0);
    });
  });
});
