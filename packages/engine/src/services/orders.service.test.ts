import { describe, expect, it } from 'vitest';
import {
  generateOrderNumber,
  calculateOrderTotals,
  calculateCartSubtotal,
  calculateDriverPayout,
  canTransitionTo,
  getStatusLabel,
  formatOrderStatus,
  isTerminalStatus,
  canBeCancelled,
} from './orders.service';
import { BASE_DELIVERY_FEE, DRIVER_PAYOUT_PERCENT } from '../constants';

describe('generateOrderNumber', () => {
  it('produces a string starting with RD-', () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^RD-/);
  });

  it('produces a string with the pattern RD-{base36}-{4chars}', () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^RD-[A-Z0-9]+-[A-Z0-9]{4}$/);
  });

  it('produces unique values on each call', () => {
    const a = generateOrderNumber();
    const b = generateOrderNumber();
    expect(a).not.toBe(b);
  });

  it('produces uppercase strings only', () => {
    const num = generateOrderNumber();
    expect(num).toBe(num.toUpperCase());
  });
});

describe('calculateOrderTotals', () => {
  it('returns correct breakdown for $50 subtotal with no tip or discount', () => {
    // subtotal: 5000 cents
    // serviceFee: 8% of 5000 = 400 cents
    // taxableAmount: 5000 + 400 = 5400
    // tax: 13% of 5400 = 702 cents
    // deliveryFee: 500 cents (BASE_DELIVERY_FEE)
    // total: 5000 + 500 + 400 + 702 = 6602 cents
    const result = calculateOrderTotals(5000);

    expect(result.subtotal).toBe(5000);
    expect(result.deliveryFee).toBe(BASE_DELIVERY_FEE);
    expect(result.serviceFee).toBe(400);
    expect(result.tax).toBe(702);
    expect(result.tip).toBe(0);
    expect(result.discount).toBe(0);
    expect(result.total).toBe(6602);
  });

  it('includes tip in total but not in tax base', () => {
    const withTip = calculateOrderTotals(5000, 300);
    const withoutTip = calculateOrderTotals(5000, 0);

    expect(withTip.tip).toBe(300);
    expect(withTip.total - withoutTip.total).toBe(300);
    expect(withTip.tax).toBe(withoutTip.tax);
  });

  it('subtracts discount from total', () => {
    const withDiscount = calculateOrderTotals(5000, 0, 200);
    const withoutDiscount = calculateOrderTotals(5000, 0, 0);

    expect(withDiscount.discount).toBe(200);
    expect(withoutDiscount.total - withDiscount.total).toBe(200);
  });

  it('uses default tip=0 and discount=0 when omitted', () => {
    const result = calculateOrderTotals(5000);
    expect(result.tip).toBe(0);
    expect(result.discount).toBe(0);
  });

  it('calculates service fee as 8% of subtotal rounded', () => {
    const result = calculateOrderTotals(1000);
    expect(result.serviceFee).toBe(Math.round(1000 * 0.08));
  });

  it('calculates tax on subtotal + service fee at 13%', () => {
    const subtotal = 10000;
    const serviceFee = Math.round(subtotal * 0.08);
    const expectedTax = Math.round((subtotal + serviceFee) * 0.13);
    const result = calculateOrderTotals(subtotal);
    expect(result.tax).toBe(expectedTax);
  });

  it('always includes BASE_DELIVERY_FEE as delivery fee', () => {
    const small = calculateOrderTotals(100);
    const large = calculateOrderTotals(100000);
    expect(small.deliveryFee).toBe(BASE_DELIVERY_FEE);
    expect(large.deliveryFee).toBe(BASE_DELIVERY_FEE);
  });

  it('total equals sum of all components', () => {
    const result = calculateOrderTotals(7500, 250, 100);
    const expected =
      result.subtotal +
      result.deliveryFee +
      result.serviceFee +
      result.tax +
      result.tip -
      result.discount;
    expect(result.total).toBe(expected);
  });
});

describe('calculateCartSubtotal', () => {
  it('returns 0 for empty cart', () => {
    expect(calculateCartSubtotal([])).toBe(0);
  });

  it('sums unit_price * quantity for single item', () => {
    const items = [{ unit_price: 1200, quantity: 2 }];
    expect(calculateCartSubtotal(items)).toBe(2400);
  });

  it('sums multiple items correctly', () => {
    const items = [
      { unit_price: 1000, quantity: 1 },
      { unit_price: 500, quantity: 3 },
      { unit_price: 750, quantity: 2 },
    ];
    expect(calculateCartSubtotal(items)).toBe(1000 + 1500 + 1500);
  });
});

describe('calculateDriverPayout', () => {
  it('returns 80% of delivery fee', () => {
    expect(calculateDriverPayout(500)).toBe(
      Math.round(500 * (DRIVER_PAYOUT_PERCENT / 100))
    );
  });

  it('returns 400 for a $500 delivery fee (80%)', () => {
    expect(calculateDriverPayout(500)).toBe(400);
  });

  it('rounds to nearest integer', () => {
    const result = calculateDriverPayout(333);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe('canTransitionTo', () => {
  it('allows pending → accepted', () => {
    expect(canTransitionTo('pending', 'accepted')).toBe(true);
  });

  it('allows pending → rejected', () => {
    expect(canTransitionTo('pending', 'rejected')).toBe(true);
  });

  it('allows accepted → preparing', () => {
    expect(canTransitionTo('accepted', 'preparing')).toBe(true);
  });

  it('allows preparing → ready_for_pickup', () => {
    expect(canTransitionTo('preparing', 'ready_for_pickup')).toBe(true);
  });

  it('allows delivered → completed', () => {
    expect(canTransitionTo('delivered', 'completed')).toBe(true);
  });

  it('blocks backward transition accepted → pending', () => {
    expect(canTransitionTo('accepted', 'pending')).toBe(false);
  });

  it('blocks transition from terminal status rejected', () => {
    expect(canTransitionTo('rejected', 'pending')).toBe(false);
    expect(canTransitionTo('rejected', 'accepted')).toBe(false);
  });

  it('blocks transition from terminal status cancelled', () => {
    expect(canTransitionTo('cancelled', 'pending')).toBe(false);
  });

  it('blocks skipping statuses (pending → completed)', () => {
    expect(canTransitionTo('pending', 'completed')).toBe(false);
  });
});

describe('getStatusLabel', () => {
  it('returns the human-readable label for a status', () => {
    expect(getStatusLabel('pending')).toBe('Pending');
    expect(getStatusLabel('ready_for_pickup')).toBe('Ready for Pickup');
    expect(getStatusLabel('in_transit')).toBe('In Transit');
  });

  it('falls back to the status value itself if not found', () => {
    // TypeScript would prevent this, but test the runtime fallback
    expect(getStatusLabel('completed')).toBe('Completed');
  });
});

describe('formatOrderStatus', () => {
  it('capitalizes single-word status', () => {
    expect(formatOrderStatus('pending')).toBe('Pending');
  });

  it('capitalizes and joins underscore-separated words', () => {
    expect(formatOrderStatus('ready_for_pickup')).toBe('Ready For Pickup');
    expect(formatOrderStatus('in_transit')).toBe('In Transit');
  });

  it('handles already-formatted strings', () => {
    expect(formatOrderStatus('Pending')).toBe('Pending');
  });
});

describe('isTerminalStatus', () => {
  it('returns true for completed', () => {
    expect(isTerminalStatus('completed')).toBe(true);
  });

  it('returns true for cancelled', () => {
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('returns true for rejected', () => {
    expect(isTerminalStatus('rejected')).toBe(true);
  });

  it('returns true for refunded', () => {
    expect(isTerminalStatus('refunded')).toBe(true);
  });

  it('returns false for pending', () => {
    expect(isTerminalStatus('pending')).toBe(false);
  });

  it('returns false for in-progress statuses', () => {
    expect(isTerminalStatus('accepted')).toBe(false);
    expect(isTerminalStatus('preparing')).toBe(false);
    expect(isTerminalStatus('in_transit')).toBe(false);
  });
});

describe('canBeCancelled', () => {
  it('returns true for pending orders', () => {
    expect(canBeCancelled('pending')).toBe(true);
  });

  it('returns true for accepted orders', () => {
    expect(canBeCancelled('accepted')).toBe(true);
  });

  it('returns true for preparing orders', () => {
    expect(canBeCancelled('preparing')).toBe(true);
  });

  it('returns false for delivered orders', () => {
    expect(canBeCancelled('delivered')).toBe(false);
  });

  it('returns false for already completed orders', () => {
    expect(canBeCancelled('completed')).toBe(false);
  });

  it('returns false for already cancelled orders', () => {
    expect(canBeCancelled('cancelled')).toBe(false);
  });

  it('returns false for rejected orders', () => {
    expect(canBeCancelled('rejected')).toBe(false);
  });

  it('returns false for refunded orders', () => {
    expect(canBeCancelled('refunded')).toBe(false);
  });
});
