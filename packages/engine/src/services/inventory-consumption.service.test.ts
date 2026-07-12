import { describe, it, expect } from 'vitest';
import {
  perPortionIngredientUsage,
  computeOrderStockConsumption,
  buildConsumeOrderMovements,
  type OrderLineConsumptionInput,
} from './inventory-consumption.service';
import { computeOnHand, applyMovementToQuantity } from '../orchestrators/inventory.engine';

const FLOUR = '1a170000-0001-4000-8000-000000000001';
const CHICKEN = '1a170000-0003-4000-8000-000000000003';
const NOODLES = '1a170000-0004-4000-8000-000000000004';

describe('perPortionIngredientUsage', () => {
  it('spreads a per-batch amount across the batch yield', () => {
    expect(perPortionIngredientUsage({ inventoryItemId: FLOUR, quantityPerBatch: 5 }, 10)).toBe(0.5);
  });

  it('grosses up for waste before spreading', () => {
    // 10 per batch, 10% waste, yield 10 → 10*1.1/10 = 1.1 per portion
    expect(
      perPortionIngredientUsage({ inventoryItemId: FLOUR, quantityPerBatch: 10, wasteFactor: 0.1 }, 10),
    ).toBeCloseTo(1.1, 10);
  });

  it('treats a non-positive batch yield as a single portion (no divide-by-zero)', () => {
    expect(perPortionIngredientUsage({ inventoryItemId: FLOUR, quantityPerBatch: 3 }, 0)).toBe(3);
  });
});

describe('computeOrderStockConsumption', () => {
  it('multiplies per-portion usage by the ordered quantity', () => {
    const lines: OrderLineConsumptionInput[] = [
      { quantity: 3, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } },
    ];
    expect(computeOrderStockConsumption(lines)).toEqual([{ inventoryItemId: FLOUR, quantity: 1.5 }]);
  });

  it('sums the same inventory item used across multiple lines', () => {
    const lines: OrderLineConsumptionInput[] = [
      { quantity: 2, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } }, // 1.0
      { quantity: 4, recipe: { batchYield: 20, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } }, // 1.0
    ];
    expect(computeOrderStockConsumption(lines)).toEqual([{ inventoryItemId: FLOUR, quantity: 2 }]);
  });

  it('aggregates several ingredients from one line', () => {
    const lines: OrderLineConsumptionInput[] = [
      {
        quantity: 2,
        recipe: {
          batchYield: 1,
          ingredients: [
            { inventoryItemId: CHICKEN, quantityPerBatch: 0.2 },
            { inventoryItemId: NOODLES, quantityPerBatch: 0.15 },
          ],
        },
      },
    ];
    const result = computeOrderStockConsumption(lines);
    expect(result).toContainEqual({ inventoryItemId: CHICKEN, quantity: 0.4 });
    expect(result).toContainEqual({ inventoryItemId: NOODLES, quantity: 0.3 });
  });

  it('skips lines with no recipe, non-positive quantity, or blank/zero ingredient', () => {
    const lines: OrderLineConsumptionInput[] = [
      { quantity: 3, recipe: null },
      { quantity: 0, recipe: { batchYield: 5, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } },
      { quantity: 2, recipe: { batchYield: 5, ingredients: [{ inventoryItemId: '', quantityPerBatch: 5 }] } },
      { quantity: 2, recipe: { batchYield: 5, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 0 }] } },
    ];
    expect(computeOrderStockConsumption(lines)).toEqual([]);
  });

  it('is brand-agnostic: two brands consuming the same shared item both decrement it', () => {
    // Every Bite Yum order (uses flour) and Saigon Pho House order (uses flour):
    // the pool item id is the kitchen's, not a brand's.
    const everyBiteYum = computeOrderStockConsumption([
      { quantity: 3, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } },
    ]);
    const saigon = computeOrderStockConsumption([
      { quantity: 2, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } },
    ]);
    expect(everyBiteYum).toEqual([{ inventoryItemId: FLOUR, quantity: 1.5 }]);
    expect(saigon).toEqual([{ inventoryItemId: FLOUR, quantity: 1 }]);

    // Shared on-hand after BOTH brands' orders complete = start − 1.5 − 1.0.
    const movements = [...buildConsumeOrderMovements([
      { quantity: 3, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } },
    ]), ...buildConsumeOrderMovements([
      { quantity: 2, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } },
    ])];
    const start = 40;
    const onHand = movements.reduce((qty, m) => applyMovementToQuantity(qty, m.quantity), start);
    expect(onHand).toBe(40 - 1.5 - 1);
  });
});

describe('buildConsumeOrderMovements', () => {
  const lines: OrderLineConsumptionInput[] = [
    { quantity: 3, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } },
  ];

  it('signs consume_order movements negative', () => {
    expect(buildConsumeOrderMovements(lines)).toEqual([
      { inventoryItemId: FLOUR, quantity: -1.5, movementType: 'consume_order' },
    ]);
  });

  it('applied once decrements by exactly the consumption (the DB guard prevents a second apply)', () => {
    const movements = buildConsumeOrderMovements(lines);
    const start = 40;
    const once = movements.reduce((qty, m) => applyMovementToQuantity(qty, m.quantity), start);
    expect(once).toBe(38.5);

    // Re-applying the SAME movement set (what a duplicate order.completed would
    // do without the metadata->>'order_id' idempotency guard) double-decrements —
    // which is exactly why the subscriber must dedupe on order_id.
    const twice = movements.reduce((qty, m) => applyMovementToQuantity(qty, m.quantity), once);
    expect(twice).toBe(37);
    expect(computeOnHand(movements)).toBe(-1.5);
  });
});
