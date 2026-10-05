import { describe, it, expect } from 'vitest';
import {
  toCents,
  platformFeeCents,
  driverPayoutCents,
  chefPayableCents,
  computeOrderSplit,
} from './order-split';
import { PLATFORM_FEE_PERCENT, DRIVER_PAYOUT_PERCENT } from '../constants';

/**
 * The split arithmetic used to exist twice — in payout-engine.ts and inline in
 * commerce.engine.ts — rounding in different orders. These tests pin the one
 * remaining implementation, including the invariant that made the duplication
 * dangerous: the subtotal must be fully allocated, with no cent created or lost.
 */
describe('order split', () => {
  it('uses the platform constants, not hard-coded numbers', () => {
    expect(PLATFORM_FEE_PERCENT).toBe(15);
    expect(DRIVER_PAYOUT_PERCENT).toBe(80);
  });

  it('converts dollar floats to integer cents', () => {
    expect(toCents(10)).toBe(1000);
    expect(toCents(10.99)).toBe(1099);
    expect(toCents(0)).toBe(0);
    expect(toCents(null)).toBe(0);
    expect(toCents(undefined)).toBe(0);
  });

  it('computes the platform fee as 15% of the subtotal in cents', () => {
    expect(platformFeeCents(10000)).toBe(1500);
    expect(platformFeeCents(3333)).toBe(500);
    expect(platformFeeCents(0)).toBe(0);
  });

  it('computes driver earnings as 80% of the delivery fee', () => {
    expect(driverPayoutCents(399)).toBe(319);
    expect(driverPayoutCents(999)).toBe(799);
    expect(driverPayoutCents(0)).toBe(0);
  });

  it('never creates or loses a cent — subtotal is fully allocated', () => {
    // The invariant that duplicated, differently-rounded implementations
    // could have broken without anything noticing.
    for (let subtotal = 0; subtotal <= 20000; subtotal += 7) {
      const split = computeOrderSplit({ subtotalCents: subtotal, deliveryFeeCents: 399 });
      expect(split.platformFeeCents + split.chefPayableCents).toBe(subtotal);
    }
  });

  it('keeps chef payable consistent with the platform fee', () => {
    expect(chefPayableCents(10000)).toBe(10000 - platformFeeCents(10000));
  });

  it('returns a complete split', () => {
    expect(computeOrderSplit({ subtotalCents: 10000, deliveryFeeCents: 599 })).toEqual({
      subtotalCents: 10000,
      deliveryFeeCents: 599,
      platformFeeCents: 1500,
      chefPayableCents: 8500,
      driverPayoutCents: 479,
    });
  });

  it('produces non-negative values across the realistic order range', () => {
    for (let subtotal = 0; subtotal <= 50000; subtotal += 137) {
      const split = computeOrderSplit({ subtotalCents: subtotal, deliveryFeeCents: 999 });
      expect(split.platformFeeCents).toBeGreaterThanOrEqual(0);
      expect(split.chefPayableCents).toBeGreaterThanOrEqual(0);
      expect(split.driverPayoutCents).toBeGreaterThanOrEqual(0);
      expect(split.platformFeeCents).toBeLessThanOrEqual(subtotal);
    }
  });
});
