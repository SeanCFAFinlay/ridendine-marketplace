import { describe, expect, it, vi } from 'vitest';
import { createCommerceLedgerEngine, summarizeLedgerEntriesForDashboard } from './commerce.engine';

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

describe('CommerceLedgerEngine.createStripeRefund', () => {
  it('creates Stripe refund inside engine before processing refund case', async () => {
    const refundCreate = vi.fn().mockResolvedValue({ id: 're_engine_123' });
    const inserts: Record<string, unknown>[] = [];
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'refund_cases') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'refund-1',
                    order_id: 'order-1',
                    approved_amount_cents: 1800,
                    status: 'approved',
                    orders: { id: 'order-1', total: 25, payment_intent_id: 'pi_123' },
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn((row: Record<string, unknown>) => ({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'refund-1', ...row }, error: null }),
                }),
              }),
            })),
          };
        }
        if (table === 'ledger_entries' || table === 'payout_adjustments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
            insert: vi.fn((row: Record<string, unknown>) => {
              inserts.push(row);
              return Promise.resolve({ data: row, error: null });
            }),
          };
        }
        if (table === 'orders') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return {};
      }),
    };
    const audit = { logStatusChange: vi.fn(), log: vi.fn() };
    const events = { emit: vi.fn(), flush: vi.fn() };
    const engine = createCommerceLedgerEngine(client as never, events as never, audit as never, {
      getStripe: () => ({ refunds: { create: refundCreate } }) as never,
    });

    const result = await engine.createStripeRefund('refund-1', {
      userId: 'ops-1',
      role: 'finance_admin',
    });

    expect(result.success).toBe(true);
    expect(refundCreate).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_123',
        amount: 1800,
        metadata: { refund_case_id: 'refund-1', order_id: 'order-1' },
      },
      { idempotencyKey: 'refund_case_refund-1' }
    );
    expect(inserts).toContainEqual(
      expect.objectContaining({ entry_type: 'customer_partial_refund', stripe_id: 're_engine_123' })
    );
  });
});
