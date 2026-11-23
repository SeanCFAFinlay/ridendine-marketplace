/**
 * @jest-environment node
 */
import { buildPayoutSummary, payoutBreakdownSince } from '../payout-summary';
import { formatTimeRemaining, nextPayoutDate } from '../payout-schedule';

const order = (subtotal: number, extra: Partial<Record<'tax' | 'service_fee' | 'delivery_fee' | 'tip', number>> = {}) => ({
  id: `o-${subtotal}`,
  created_at: '2026-11-18T12:00:00Z',
  subtotal,
  tax: extra.tax ?? 0,
  service_fee: extra.service_fee ?? 0,
  delivery_fee: extra.delivery_fee ?? 0,
  tip: extra.tip ?? 0,
});

const payout = (status: string, period_end: string, amount = 5000) => ({
  id: `p-${status}-${period_end}`,
  amount,
  status,
  period_start: '2026-11-01T00:00:00Z',
  period_end,
  paid_at: status === 'paid' ? period_end : null,
  created_at: period_end,
});

describe('buildPayoutSummary', () => {
  it('splits food sales with the 15% commission and keeps customer charges separate', () => {
    const s = buildPayoutSummary({
      payouts: [],
      unpaidOrders: [order(40, { tax: 5.2, service_fee: 2, delivery_fee: 5, tip: 3 }), order(10.01)],
      ledgerBalanceCents: null,
      payoutAccountReady: true,
    });
    expect(s.breakdown.foodSalesCents).toBe(5001);
    expect(s.breakdown.platformFeeCents).toBe(600 + 150);
    expect(s.breakdown.chefEarningsCents).toBe(5001 - 750);
    // Fee + earnings fully allocate the subtotal.
    expect(s.breakdown.platformFeeCents + s.breakdown.chefEarningsCents).toBe(s.breakdown.foodSalesCents);
    expect(s.breakdown.collectedNotPaidOut).toEqual({ taxCents: 520, serviceFeeCents: 200, deliveryFeeCents: 500, tipCents: 300 });
    expect(s.expectedSource).toBe('estimate');
    expect(s.expectedPayoutCents).toBe(4251);
    expect(s.breakdown.adjustmentsCents).toBe(0);
    expect(s.status).toBe('pending');
  });

  it('uses the ledger balance as the expected payout and surfaces the gap as adjustments', () => {
    const s = buildPayoutSummary({
      payouts: [],
      unpaidOrders: [order(100)],
      ledgeredOrderIds: new Set(['o-100']),
      ledgerBalanceCents: 8000,
      currency: 'cad',
      payoutAccountReady: false,
    });
    expect(s.expectedSource).toBe('ledger');
    expect(s.expectedPayoutCents).toBe(8000);
    expect(s.breakdown.chefEarningsCents).toBe(8500);
    expect(s.breakdown.adjustmentsCents).toBe(-500);
    expect(s.currency).toBe('CAD');
    expect(s.payoutAccountReady).toBe(false);
  });

  it('keeps fulfilled orders with no ledger line out of the breakdown (Ba Muoi SIM orders)', () => {
    // Production shape for Ryo's storefront: two delivered simulated orders,
    // a chef_payable account at 0, and no ledger lines.
    const sim = { ...order(90, { tax: 13.41, service_fee: 7.2, delivery_fee: 5.99, tip: 5 }) };
    const s = buildPayoutSummary({
      payouts: [],
      unpaidOrders: [{ ...sim, id: 'SIM-1' }, { ...sim, id: 'SIM-2' }],
      ledgeredOrderIds: new Set(),
      ledgerBalanceCents: 0,
      payoutAccountReady: false,
    });
    expect(s.expectedPayoutCents).toBe(0);
    expect(s.breakdown.orderCount).toBe(0);
    expect(s.breakdown.foodSalesCents).toBe(0);
    // No phantom "-$153 adjustment".
    expect(s.breakdown.adjustmentsCents).toBe(0);
    expect(s.breakdown.collectedNotPaidOut.taxCents).toBe(0);
    expect(s.breakdown.unrecorded).toEqual({ orderCount: 2, estimatedEarningsCents: 2 * 7650 });
    expect(s.status).toBe('none');
  });

  it('reports processing when a payout is in flight, paid when settled with no balance', () => {
    const processing = buildPayoutSummary({
      payouts: [payout('scheduled', '2026-11-16T00:00:00Z', 1234)],
      unpaidOrders: [],
      ledgerBalanceCents: 0,
      payoutAccountReady: true,
    });
    expect(processing.status).toBe('processing');
    expect(processing.processing?.amountCents).toBe(1234);

    const paid = buildPayoutSummary({
      payouts: [payout('paid', '2026-11-16T00:00:00Z', 9900)],
      unpaidOrders: [],
      ledgerBalanceCents: 0,
      payoutAccountReady: true,
    });
    expect(paid.status).toBe('paid');
    expect(paid.lastPaid).toEqual({ amountCents: 9900, paidAt: '2026-11-16T00:00:00Z' });

    expect(
      buildPayoutSummary({ payouts: [], unpaidOrders: [], ledgerBalanceCents: null, payoutAccountReady: true }).status
    ).toBe('none');
  });

  it('never reports a negative expected payout', () => {
    const s = buildPayoutSummary({ payouts: [], unpaidOrders: [], ledgerBalanceCents: -200, payoutAccountReady: true });
    expect(s.expectedPayoutCents).toBe(0);
  });
});

describe('payoutBreakdownSince', () => {
  it('takes the latest non-failed period end', () => {
    expect(
      payoutBreakdownSince([
        payout('paid', '2026-11-09T00:00:00Z'),
        payout('failed', '2026-11-20T00:00:00Z'),
        payout('scheduled', '2026-11-16T00:00:00Z'),
      ])
    ).toBe('2026-11-16T00:00:00Z');
    expect(payoutBreakdownSince([])).toBeNull();
  });
});

describe('payout schedule', () => {
  it('returns the next Monday at 09:00 local', () => {
    const sat = new Date(2026, 10, 21, 15, 0); // Sat 21 Nov 2026
    const next = nextPayoutDate(sat);
    expect(next.getDay()).toBe(1);
    expect(next.getDate()).toBe(23);
    expect(next.getHours()).toBe(9);
  });

  it('rolls to the following week once Monday 09:00 has passed', () => {
    expect(nextPayoutDate(new Date(2026, 10, 23, 8, 59)).getDate()).toBe(23);
    expect(nextPayoutDate(new Date(2026, 10, 23, 9, 0)).getDate()).toBe(30);
  });

  it('formats the countdown', () => {
    const now = new Date(2026, 10, 21, 0, 0);
    expect(formatTimeRemaining(new Date(2026, 10, 23, 9, 0), now)).toBe('2d 9h');
    expect(formatTimeRemaining(new Date(2026, 10, 21, 3, 15), now)).toBe('3h 15m');
    expect(formatTimeRemaining(new Date(2026, 10, 21, 0, 0, 30), now)).toBe('less than a minute');
  });
});
