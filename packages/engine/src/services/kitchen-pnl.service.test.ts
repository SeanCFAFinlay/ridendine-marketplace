import { describe, it, expect } from 'vitest';
import { allocateBySalesShare, computeKitchenPnl } from './kitchen-pnl.service';

const A = 'aaaa0000-0000-4000-8000-000000000001';
const B = 'bbbb0000-0000-4000-8000-000000000002';

describe('allocateBySalesShare', () => {
  it('splits by sales and sums exactly to the total', () => {
    const rows = allocateBySalesShare(300, [
      { storefrontId: A, sales: 1000 },
      { storefrontId: B, sales: 500 },
    ]);
    expect(rows).toEqual([
      { storefrontId: A, amount: 200 },
      { storefrontId: B, amount: 100 },
    ]);
  });

  it('gives nothing to a brand with no sales', () => {
    const rows = allocateBySalesShare(100, [
      { storefrontId: A, sales: 800 },
      { storefrontId: B, sales: 0 },
    ]);
    expect(rows).toEqual([
      { storefrontId: A, amount: 100 },
      { storefrontId: B, amount: 0 },
    ]);
  });

  it('all-zero when no brand has sales', () => {
    const rows = allocateBySalesShare(100, [
      { storefrontId: A, sales: 0 },
      { storefrontId: B, sales: 0 },
    ]);
    expect(rows.every((r) => r.amount === 0)).toBe(true);
  });
});

describe('computeKitchenPnl', () => {
  it('computes per-brand contribution and kitchen prime cost %', () => {
    const pnl = computeKitchenPnl(
      [
        { storefrontId: A, sales: 1000, foodCost: 300, packagingCost: 50, laborCost: 200, platformFees: 100 },
        { storefrontId: B, sales: 500, foodCost: 150, packagingCost: 25, laborCost: 120, platformFees: 50 },
      ],
      { overhead: 150 },
    );

    const a = pnl.brands.find((b) => b.storefrontId === A)!;
    // 1000 − 300 − 50 − 200 − 100 = 350
    expect(a.contributionMargin).toBe(350);
    expect(a.primeCostPct).toBe(0.5); // (300+200)/1000
    // overhead 150 split by sales 1000:500 → 100 to A
    expect(a.overhead).toBe(100);
    expect(a.netMargin).toBe(250); // 350 − 100

    // Kitchen prime = (450 food + 320 labour) / 1500 = 0.51333…, rounded to 4dp.
    expect(pnl.primeCostPct).toBe(0.5133);
    expect(pnl.contributionMargin).toBe(350 + 155); // A 350, B: 500-150-25-120-50 = 155
    expect(pnl.netMargin).toBe(505 - 150);
    expect(pnl.bestBrandId).toBe(A);
    expect(pnl.worstBrandId).toBe(B);
  });

  it('flags a prime-cost breach against the target', () => {
    const pnl = computeKitchenPnl(
      [{ storefrontId: A, sales: 100, foodCost: 45, laborCost: 25 }], // prime 70%
      { primeTargetPct: 0.6 },
    );
    expect(pnl.primeCostPct).toBe(0.7);
    expect(pnl.primeWarning).toBe(true);
  });

  it('marks a brand with no recipe/labour data as needsSetup, contribution null', () => {
    const pnl = computeKitchenPnl([
      { storefrontId: A, sales: 400 }, // no cost data at all
      { storefrontId: B, sales: 600, foodCost: 180, laborCost: 150 },
    ]);
    const a = pnl.brands.find((b) => b.storefrontId === A)!;
    expect(a.needsSetup).toBe(true);
    expect(a.contributionMargin).toBeNull();
    expect(a.netMargin).toBeNull();
    // best/worst only consider costed brands → both point at B
    expect(pnl.bestBrandId).toBe(B);
    expect(pnl.worstBrandId).toBe(B);
  });

  it('defaults the prime target to 60% and returns null prime % with no sales', () => {
    const pnl = computeKitchenPnl([{ storefrontId: A, sales: 0, foodCost: 0, laborCost: 0 }]);
    expect(pnl.primeTargetPct).toBe(0.6);
    expect(pnl.primeCostPct).toBeNull();
    expect(pnl.primeWarning).toBe(false);
  });
});
