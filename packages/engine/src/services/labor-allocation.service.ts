// ==========================================
// LABOUR ALLOCATION SERVICE (Ghost-Kitchen Phase C)
//
// Pure split of a commissary's SHARED daily labour cost across its brands. The
// locked driver is order-count share:
//   brandLabor = totalLaborCost × (brandOrders / Σ brandOrders)
//
// No DB access — callers pass the day's per-brand order counts and the day's
// total labour cost. Money is apportioned in whole cents with largest-remainder
// rounding so the per-brand amounts sum EXACTLY to totalLaborCost (no drift, no
// invented pennies). The writer job persists each result as a labor_allocations
// row { kitchen_id, storefront_id, amount }.
// ==========================================

export interface BrandLaborDriver {
  storefrontId: string;
  /** Orders the brand completed that day (the allocation weight). */
  orderCount: number;
}

export interface BrandLaborAllocation {
  storefrontId: string;
  /** Dollars of shared labour attributed to this brand. */
  amount: number;
}

/**
 * Split totalLaborCost across brands by order-count share. When there are no
 * orders (or no cost), every brand gets 0 — labour is never attributed to a
 * brand that sold nothing. Amounts are in dollars, rounded to whole cents, and
 * are guaranteed to sum to totalLaborCost (rounded to cents).
 */
export function allocateLaborByOrderCount(
  totalLaborCost: number,
  brands: BrandLaborDriver[],
): BrandLaborAllocation[] {
  const totalOrders = brands.reduce((sum, b) => sum + Math.max(0, b.orderCount), 0);
  const totalCents = Math.round(totalLaborCost * 100);

  if (totalOrders <= 0 || totalCents <= 0) {
    return brands.map((b) => ({ storefrontId: b.storefrontId, amount: 0 }));
  }

  // Exact fractional cents per brand, then floor and hand out the leftover cents
  // to the largest remainders (deterministic tie-break) so the total is exact.
  const rows = brands.map((b, index) => {
    const weight = Math.max(0, b.orderCount);
    const exact = (totalCents * weight) / totalOrders;
    const cents = Math.floor(exact);
    return { storefrontId: b.storefrontId, index, cents, remainder: exact - cents };
  });

  let leftover = totalCents - rows.reduce((sum, r) => sum + r.cents, 0);
  const byRemainder = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  for (let i = 0; i < byRemainder.length && leftover > 0; i++) {
    byRemainder[i].cents += 1;
    leftover--;
  }

  return rows.map((r) => ({ storefrontId: r.storefrontId, amount: r.cents / 100 }));
}
