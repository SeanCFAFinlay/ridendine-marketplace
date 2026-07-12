import { describe, it, expect } from 'vitest';
import { consolidatePrepDemand, type BrandPrepDemand } from './prep-consolidation.service';

const FLOUR = '1a170000-0001-4000-8000-000000000001';
const CHICKEN = '1a170000-0003-4000-8000-000000000003';
const EBY = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const SAIGON = 'd5000000-0002-4000-8000-000000000002';

describe('consolidatePrepDemand', () => {
  it('aggregates a shared ingredient across brands with per-brand contributions', () => {
    const brands: BrandPrepDemand[] = [
      {
        storefrontId: EBY,
        brandName: 'Every Bite Yum',
        items: [{ quantity: 3, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } }], // 1.5
      },
      {
        storefrontId: SAIGON,
        brandName: 'Saigon Pho House',
        items: [{ quantity: 2, recipe: { batchYield: 10, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 5 }] } }], // 1.0
      },
    ];
    const sheet = consolidatePrepDemand(brands);
    expect(sheet).toHaveLength(1);
    expect(sheet[0]!.inventoryItemId).toBe(FLOUR);
    expect(sheet[0]!.totalQuantity).toBe(2.5);
    expect(sheet[0]!.contributingBrands).toEqual([
      { storefrontId: EBY, brandName: 'Every Bite Yum', quantity: 1.5 },
      { storefrontId: SAIGON, brandName: 'Saigon Pho House', quantity: 1 },
    ]);
  });

  it('sorts lines by total quantity and brands by contribution', () => {
    const brands: BrandPrepDemand[] = [
      {
        storefrontId: EBY,
        brandName: 'Every Bite Yum',
        items: [
          { quantity: 1, recipe: { batchYield: 1, ingredients: [{ inventoryItemId: FLOUR, quantityPerBatch: 1 }] } }, // flour 1
          { quantity: 1, recipe: { batchYield: 1, ingredients: [{ inventoryItemId: CHICKEN, quantityPerBatch: 5 }] } }, // chicken 5
        ],
      },
      {
        storefrontId: SAIGON,
        brandName: 'Saigon Pho House',
        items: [{ quantity: 1, recipe: { batchYield: 1, ingredients: [{ inventoryItemId: CHICKEN, quantityPerBatch: 2 }] } }], // chicken 2
      },
    ];
    const sheet = consolidatePrepDemand(brands);
    // chicken (7) before flour (1)
    expect(sheet.map((l) => l.inventoryItemId)).toEqual([CHICKEN, FLOUR]);
    expect(sheet[0]!.totalQuantity).toBe(7);
    // chicken contributors: EBY 5 before Saigon 2
    expect(sheet[0]!.contributingBrands.map((b) => b.storefrontId)).toEqual([EBY, SAIGON]);
  });

  it('omits brands/lines with no recipe or no demand', () => {
    const brands: BrandPrepDemand[] = [
      { storefrontId: EBY, brandName: 'Every Bite Yum', items: [{ quantity: 5, recipe: null }] },
      { storefrontId: SAIGON, brandName: 'Saigon Pho House', items: [] },
    ];
    expect(consolidatePrepDemand(brands)).toEqual([]);
  });
});
