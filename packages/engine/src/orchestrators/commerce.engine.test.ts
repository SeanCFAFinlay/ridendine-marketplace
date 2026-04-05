import { describe, expect, it } from 'vitest';
import { summarizeLedgerEntriesForDashboard } from './commerce.engine';

describe('summarizeLedgerEntriesForDashboard', () => {
  it('calculates revenue, payouts, refunds, and order count correctly', () => {
    const summary = summarizeLedgerEntriesForDashboard([
      { entry_type: 'customer_charge_capture', amount_cents: 10000 },
      { entry_type: 'customer_charge_capture', amount_cents: 5000 },
      { entry_type: 'customer_refund', amount_cents: -2000 },
      { entry_type: 'platform_fee', amount_cents: 2250 },
      { entry_type: 'chef_payable', amount_cents: 9000 },
      { entry_type: 'driver_payable', amount_cents: 1500 },
      { entry_type: 'tip_payable', amount_cents: 500 },
      { entry_type: 'tax_collected', amount_cents: 1950 },
    ]);

    expect(summary.totalRevenue).toBe(150);
    expect(summary.totalRefunds).toBe(20);
    expect(summary.platformFees).toBe(22.5);
    expect(summary.chefPayouts).toBe(90);
    expect(summary.driverPayouts).toBe(20);
    expect(summary.taxCollected).toBe(19.5);
    expect(summary.orderCount).toBe(2);
  });
});
