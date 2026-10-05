// ==========================================
// ORDER SPLIT — the single implementation of how one order's money divides
// between the platform, the chef and the driver.
//
// This arithmetic previously existed twice: as helpers in
// orchestrators/payout-engine.ts and inline at the ledger-write site in
// orchestrators/commerce.engine.ts. They used the same constants but rounded
// in a DIFFERENT ORDER —
//     payout-engine:   round(round(dollars * 100) * 15 / 100)
//     commerce.engine: round(dollars * (15 / 100) * 100)
// — which can disagree by a cent on some inputs, and would silently fork the
// platform's economics if either were changed without the other.
//
// All money math here is integer cents. Callers convert once, at the boundary,
// with toCents(). Never do percentage math on dollar floats.
// ==========================================

import { PLATFORM_FEE_PERCENT, DRIVER_PAYOUT_PERCENT } from '../constants';

/**
 * `orders.*` amounts are DOLLAR floats in the database. Convert to integer
 * cents before any percentage math.
 */
export function toCents(dollars: number | null | undefined): number {
  return Math.round((dollars ?? 0) * 100);
}

/** Platform commission, in cents, from an order subtotal in cents. */
export function platformFeeCents(subtotalCents: number): number {
  return Math.round((subtotalCents * PLATFORM_FEE_PERCENT) / 100);
}

/** Driver earnings, in cents, from a delivery fee in cents. */
export function driverPayoutCents(deliveryFeeCents: number): number {
  return Math.round((deliveryFeeCents * DRIVER_PAYOUT_PERCENT) / 100);
}

/** Chef earnings, in cents: the order subtotal less the platform commission. */
export function chefPayableCents(subtotalCents: number): number {
  return subtotalCents - platformFeeCents(subtotalCents);
}

export interface OrderSplit {
  subtotalCents: number;
  deliveryFeeCents: number;
  platformFeeCents: number;
  chefPayableCents: number;
  driverPayoutCents: number;
}

/**
 * Full split for one order. Takes cents, returns cents.
 *
 * Invariant, asserted by order-split.test.ts:
 *   platformFeeCents + chefPayableCents === subtotalCents
 * i.e. the subtotal is fully allocated and no cent is created or lost.
 */
export function computeOrderSplit(input: {
  subtotalCents: number;
  deliveryFeeCents: number;
}): OrderSplit {
  const subtotalCents = Math.round(input.subtotalCents);
  const deliveryFeeCents = Math.round(input.deliveryFeeCents);
  const platform = platformFeeCents(subtotalCents);

  return {
    subtotalCents,
    deliveryFeeCents,
    platformFeeCents: platform,
    chefPayableCents: subtotalCents - platform,
    driverPayoutCents: driverPayoutCents(deliveryFeeCents),
  };
}
