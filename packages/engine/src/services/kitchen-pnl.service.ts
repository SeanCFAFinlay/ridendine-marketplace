// ==========================================
// KITCHEN P&L SERVICE (Ghost-Kitchen Phase C.2 / C.3)
//
// Pure per-brand and per-kitchen profit math for a commissary. No DB access —
// callers pass each brand's already-fetched period figures (sales, food cost
// from recipe_cost_snapshots, packaging, ALLOCATED labour from
// labor-allocation.service, platform/delivery fees) plus the kitchen's overhead
// for the period. Returns per-brand contribution + ratios and the kitchen
// rollup with prime-cost %, a target check, and best/worst brand.
//
// Honesty: a brand with no recipe/labour data (all cost inputs null) is marked
// needsSetup and its contribution is null — never zero-as-fact. Overhead is
// apportioned by sales share in whole cents so the split sums exactly.
// ==========================================

import { computeCostSummary } from './costing.service';

export interface BrandPnlInput {
  storefrontId: string;
  sales: number;
  /** From recipe_cost_snapshots for the period; null when unknown. */
  foodCost?: number | null;
  packagingCost?: number | null;
  /** Allocated labour for the brand (see allocateLaborByOrderCount). */
  laborCost?: number | null;
  /** Platform + delivery fees attributable to the brand. */
  platformFees?: number | null;
}

export interface BrandPnl {
  storefrontId: string;
  sales: number;
  foodCost: number | null;
  packagingCost: number | null;
  laborCost: number | null;
  platformFees: number | null;
  /** Allocated share of kitchen overhead for the period. */
  overhead: number;
  /** sales − food − packaging − labour − fees (pre-overhead); null if no cost data. */
  contributionMargin: number | null;
  /** contribution − allocated overhead; null if no cost data. */
  netMargin: number | null;
  foodCostPct: number | null;
  laborCostPct: number | null;
  primeCostPct: number | null;
  /** True when neither food nor labour cost is known — show a setup state. */
  needsSetup: boolean;
}

export interface KitchenPnl {
  brands: BrandPnl[];
  sales: number;
  foodCost: number;
  packagingCost: number;
  laborCost: number;
  platformFees: number;
  overhead: number;
  /** Σ brand contribution (pre-overhead). */
  contributionMargin: number;
  /** contribution − overhead. */
  netMargin: number;
  /** (Σ food + Σ labour) / Σ sales. */
  primeCostPct: number | null;
  primeTargetPct: number;
  /** True when the kitchen's prime cost % exceeds the target. */
  primeWarning: boolean;
  /** Storefront ids of the highest / lowest contribution brands (null if none costed). */
  bestBrandId: string | null;
  worstBrandId: string | null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Split a total across brands by SALES share, in whole cents with
 * largest-remainder rounding so the parts sum exactly to the total. Brands with
 * no sales get nothing; if no brand has sales, everyone gets 0.
 */
export function allocateBySalesShare(
  total: number,
  brands: { storefrontId: string; sales: number }[],
): { storefrontId: string; amount: number }[] {
  const totalSalesCents = brands.reduce((s, b) => s + Math.max(0, Math.round(b.sales * 100)), 0);
  const totalCents = Math.round(total * 100);
  if (totalSalesCents <= 0 || totalCents <= 0) {
    return brands.map((b) => ({ storefrontId: b.storefrontId, amount: 0 }));
  }
  const rows = brands.map((b, index) => {
    const weight = Math.max(0, Math.round(b.sales * 100));
    const exact = (totalCents * weight) / totalSalesCents;
    const cents = Math.floor(exact);
    return { storefrontId: b.storefrontId, index, cents, remainder: exact - cents };
  });
  let leftover = totalCents - rows.reduce((s, r) => s + r.cents, 0);
  const byRemainder = [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const row of byRemainder) {
    if (leftover <= 0) break;
    row.cents += 1;
    leftover--;
  }
  return rows.map((r) => ({ storefrontId: r.storefrontId, amount: r.cents / 100 }));
}

export function computeKitchenPnl(
  inputs: BrandPnlInput[],
  opts?: { overhead?: number; primeTargetPct?: number },
): KitchenPnl {
  const overheadTotal = Math.max(0, opts?.overhead ?? 0);
  const primeTargetPct = opts?.primeTargetPct ?? 0.6;

  const overheadByBrand = new Map(
    allocateBySalesShare(overheadTotal, inputs.map((i) => ({ storefrontId: i.storefrontId, sales: i.sales }))).map(
      (a) => [a.storefrontId, a.amount],
    ),
  );

  const brands: BrandPnl[] = inputs.map((i) => {
    const cs = computeCostSummary({
      sales: i.sales,
      foodCost: i.foodCost ?? null,
      packagingCost: i.packagingCost ?? null,
      laborCost: i.laborCost ?? null,
    });
    const fees = i.platformFees ?? null;
    const overhead = overheadByBrand.get(i.storefrontId) ?? 0;
    const contribution =
      cs.contributionMargin === null ? null : round2(cs.contributionMargin - (fees ?? 0));
    const netMargin = contribution === null ? null : round2(contribution - overhead);
    return {
      storefrontId: i.storefrontId,
      sales: i.sales,
      foodCost: cs.foodCost,
      packagingCost: cs.packagingCost,
      laborCost: cs.laborCost,
      platformFees: fees,
      overhead,
      contributionMargin: contribution,
      netMargin,
      foodCostPct: cs.foodCostPct,
      laborCostPct: cs.laborCostPct,
      primeCostPct: cs.primeCostPct,
      needsSetup: (i.foodCost ?? null) === null && (i.laborCost ?? null) === null,
    };
  });

  const sales = round2(inputs.reduce((s, i) => s + i.sales, 0));
  const foodCost = round2(inputs.reduce((s, i) => s + (i.foodCost ?? 0), 0));
  const packagingCost = round2(inputs.reduce((s, i) => s + (i.packagingCost ?? 0), 0));
  const laborCost = round2(inputs.reduce((s, i) => s + (i.laborCost ?? 0), 0));
  const platformFees = round2(inputs.reduce((s, i) => s + (i.platformFees ?? 0), 0));
  const contributionMargin = round2(sales - foodCost - packagingCost - laborCost - platformFees);
  const netMargin = round2(contributionMargin - overheadTotal);
  const primeCostPct = sales > 0 ? Math.round(((foodCost + laborCost) / sales) * 10000) / 10000 : null;

  // Best/worst by contribution, considering only brands that are actually costed.
  const costed = brands.filter((b) => b.contributionMargin !== null);
  let bestBrandId: string | null = null;
  let worstBrandId: string | null = null;
  if (costed.length > 0) {
    bestBrandId = costed.reduce((a, b) => (b.contributionMargin! > a.contributionMargin! ? b : a)).storefrontId;
    worstBrandId = costed.reduce((a, b) => (b.contributionMargin! < a.contributionMargin! ? b : a)).storefrontId;
  }

  return {
    brands,
    sales,
    foodCost,
    packagingCost,
    laborCost,
    platformFees,
    overhead: round2(overheadTotal),
    contributionMargin,
    netMargin,
    primeCostPct,
    primeTargetPct,
    primeWarning: primeCostPct !== null && primeCostPct > primeTargetPct,
    bestBrandId,
    worstBrandId,
  };
}
