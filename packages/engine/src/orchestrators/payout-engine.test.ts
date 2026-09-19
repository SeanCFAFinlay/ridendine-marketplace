// ==========================================
// PAYOUT ENGINE TESTS
// TDD: Red-Green-Refactor
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PayoutEngine, createPayoutEngine } from './payout-engine';
import { PLATFORM_FEE_PERCENT, DRIVER_PAYOUT_PERCENT } from '../constants';

// ---------------------------------------------------------------------------
// Helpers: minimal Supabase mock builder
// ---------------------------------------------------------------------------

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'in', 'single', 'insert', 'update', 'not'];
  for (const m of methods) {
    chain[m] = () => chain;
  }
  // terminal: return the result
  chain['single'] = () => Promise.resolve(result);
  chain['insert'] = () => ({ select: () => ({ single: () => Promise.resolve(result) }), ...terminalInsert(result) });
  chain['select'] = () => ({ ...chain, single: () => Promise.resolve(result), eq: () => chain });
  return chain;
}

function terminalInsert(result: { data: unknown; error: unknown }) {
  return { then: (fn: (v: unknown) => unknown) => Promise.resolve(fn(result)) };
}

function makeSupabase(responses: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: (table: string) => {
      const res = responses[table] ?? { data: null, error: { message: `No mock for ${table}` } };
      const term = {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve(res),
              in: () => Promise.resolve(res),
              not: () => Promise.resolve(res),
            }),
            single: () => Promise.resolve(res),
            in: () => Promise.resolve(res),
            not: () => Promise.resolve(res),
          }),
          single: () => Promise.resolve(res),
        }),
        insert: () => Promise.resolve(res),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({ single: () => Promise.resolve(res) }),
            }),
            select: () => ({ single: () => Promise.resolve(res) }),
          }),
        }),
        eq: () => ({
          eq: () => Promise.resolve(res),
          single: () => Promise.resolve(res),
        }),
      };
      return term;
    },
  };
}

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

const mockAudit = {
  log: vi.fn().mockResolvedValue(null),
  logStatusChange: vi.fn().mockResolvedValue(null),
};

const mockEvents = {
  emit: vi.fn(),
  flush: vi.fn().mockResolvedValue({ success: true, events: [] }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// calculateChefPayout
// ---------------------------------------------------------------------------

describe('PayoutEngine.calculateChefPayout', () => {
  it('returns correct subtotal, platformFee and chefGross', async () => {
    const order = {
      id: 'order-1',
      subtotal: 40,
      delivery_fee: 5,
      service_fee: 3.2,
      tax: 5.2,
      tip: 2,
      total: 55.4,
    };

    const client = makeSupabase({ orders: { data: order, error: null } });
    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);

    const result = await engine.calculateChefPayout({ orderId: 'order-1' });

    const expectedPlatformFee = Math.round(4000 * PLATFORM_FEE_PERCENT / 100) / 100;
    expect(result.subtotal).toBe(40);
    expect(result.platformFee).toBe(expectedPlatformFee);
    expect(result.chefGross).toBe(40 - expectedPlatformFee);
  });

  it('keeps cent precision for non-round subtotals (43.50 → 6.53 fee, not $7)', async () => {
    const order = {
      id: 'order-1b',
      subtotal: 43.5,
      delivery_fee: 5,
      service_fee: 3.48,
      tax: 6.76,
      tip: 2,
      total: 60.74,
    };

    const client = makeSupabase({ orders: { data: order, error: null } });
    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);

    const result = await engine.calculateChefPayout({ orderId: 'order-1b' });

    // 4350 cents * 15% = 652.5 → 653 cents = $6.53 (NOT Math.round(6.525) = $7)
    expect(result.subtotal).toBe(43.5);
    expect(result.platformFee).toBe(6.53);
    expect(result.chefGross).toBe(36.97);
  });

  it('throws when order is not found', async () => {
    const client = makeSupabase({ orders: { data: null, error: { message: 'Not found' } } });
    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);

    await expect(engine.calculateChefPayout({ orderId: 'missing' })).rejects.toThrow('Order not found');
  });
});

// ---------------------------------------------------------------------------
// calculateDriverEarnings
// ---------------------------------------------------------------------------

describe('PayoutEngine.calculateDriverEarnings', () => {
  it('returns deliveryFee, driverPayout and tip', async () => {
    const order = {
      id: 'order-2',
      subtotal: 30,
      delivery_fee: 8,
      service_fee: 2.4,
      tax: 3.9,
      tip: 3,
      total: 47.3,
    };

    const client = makeSupabase({ orders: { data: order, error: null } });
    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);

    const result = await engine.calculateDriverEarnings({ orderId: 'order-2' });

    const expectedPayout = Math.round(800 * DRIVER_PAYOUT_PERCENT / 100) / 100;
    expect(result.deliveryFee).toBe(8);
    expect(result.driverPayout).toBe(expectedPayout);
    expect(result.tip).toBe(3);
  });

  it('keeps cent precision for non-round delivery fees (7.55 → 6.04 payout)', async () => {
    const order = {
      id: 'order-2b',
      subtotal: 30,
      delivery_fee: 7.55,
      service_fee: 2.4,
      tax: 3.9,
      tip: 0,
      total: 43.85,
    };

    const client = makeSupabase({ orders: { data: order, error: null } });
    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);

    const result = await engine.calculateDriverEarnings({ orderId: 'order-2b' });

    // 755 cents * 80% = 604 cents = $6.04 (old code: Math.round(6.04) = $6)
    expect(result.driverPayout).toBe(6.04);
  });

  it('returns 0 tip when no tip present', async () => {
    const order = {
      id: 'order-3',
      subtotal: 20,
      delivery_fee: 5,
      service_fee: 1.6,
      tax: 2.6,
      tip: 0,
      total: 29.2,
    };

    const client = makeSupabase({ orders: { data: order, error: null } });
    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);

    const result = await engine.calculateDriverEarnings({ orderId: 'order-3' });
    expect(result.tip).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// markPayoutEligible
// ---------------------------------------------------------------------------

describe('PayoutEngine.markPayoutEligible', () => {
  const validOrder = {
    id: 'order-4',
    subtotal: 43.5,
    delivery_fee: 7.55,
    service_fee: 3.48,
    tax: 7.09,
    tip: 2,
    total: 63.62,
    engine_status: 'completed',
    payment_status: 'completed',
  };

  function makeLedgerInsert(entryId: string, captured?: { payload: unknown }) {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      insert: (payload: unknown) => {
        if (captured) captured.payload = payload;
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: entryId }, error: null }),
          }),
        };
      },
    };
  }

  it('returns success when order is completed and no open exceptions', async () => {
    // We need a richer mock that handles different table calls
    const fromCalls: Record<string, unknown>[] = [];

    const client = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: validOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'order_exceptions') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'ledger_entries') {
          return makeLedgerInsert('le-1');
        }
        if (table === 'audit_logs') {
          return {
            insert: () => Promise.resolve({ data: null, error: null }),
          };
        }
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);

    const result = await engine.markPayoutEligible({
      orderId: 'order-4',
      payeeType: 'chef',
      payeeId: 'chef-1',
      actorId: 'actor-1',
    });

    expect(result.success).toBe(true);
    expect(mockAudit.log).toHaveBeenCalledOnce();
    // Audit and event must reference the REAL ledger entry id, not the order id.
    expect(mockAudit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'ledger_entry', entityId: 'le-1' })
    );
    expect(mockEvents.emit).toHaveBeenCalledWith(
      'payout.scheduled',
      'ledger_entry',
      'le-1',
      expect.objectContaining({ orderId: 'order-4', payeeType: 'chef' }),
      expect.objectContaining({ userId: 'actor-1' })
    );
  });

  it('returns error when order engine_status is not completed', async () => {
    const client = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { ...validOrder, engine_status: 'delivering' }, error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    const result = await engine.markPayoutEligible({ orderId: 'order-4', payeeType: 'driver', payeeId: 'd-1', actorId: 'a-1' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not completed/i);
  });

  it('returns error when payment_status is not completed', async () => {
    const client = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { ...validOrder, payment_status: 'pending' }, error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    const result = await engine.markPayoutEligible({ orderId: 'order-4', payeeType: 'chef', payeeId: 'c-1', actorId: 'a-1' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/payment not completed/i);
  });

  it('returns error when open exceptions exist', async () => {
    const client = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: validOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'order_exceptions') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: [{ id: 'exc-1' }], error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    const result = await engine.markPayoutEligible({ orderId: 'order-4', payeeType: 'chef', payeeId: 'c-1', actorId: 'a-1' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/open exception/i);
  });

  it('inserts chef_payable entry with cent-precise amount for chef payeeType', async () => {
    const captured: { payload: unknown } = { payload: null };

    const client = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: validOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'order_exceptions') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'ledger_entries') {
          return makeLedgerInsert('le-2', captured);
        }
        return {};
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    await engine.markPayoutEligible({ orderId: 'order-4', payeeType: 'chef', payeeId: 'chef-99', actorId: 'a-1' });

    const payload = captured.payload as Record<string, unknown>;
    expect(payload.entry_type).toBe('chef_payable');
    // subtotal $43.50 → 4350 cents; platform fee 15% = 653 cents; chef = 3697 cents
    expect(payload.amount_cents).toBe(3697);
    expect(payload.entity_type).toBe('chef');
    expect(payload.entity_id).toBe('chef-99');
  });

  it('inserts driver_payable entry with cent-precise amount for driver payeeType', async () => {
    const captured: { payload: unknown } = { payload: null };

    const client = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: validOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'order_exceptions') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === 'ledger_entries') {
          return makeLedgerInsert('le-3', captured);
        }
        return {};
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    await engine.markPayoutEligible({ orderId: 'order-4', payeeType: 'driver', payeeId: 'drv-99', actorId: 'a-1' });

    const payload = captured.payload as Record<string, unknown>;
    expect(payload.entry_type).toBe('driver_payable');
    // delivery fee $7.55 → 755 cents; driver 80% = 604 cents
    expect(payload.amount_cents).toBe(604);
  });
});

// ---------------------------------------------------------------------------
// markPayoutProcessing
// ---------------------------------------------------------------------------

describe('PayoutEngine.markPayoutProcessing', () => {
  it('updates chef_payouts to processing and audits', async () => {
    let updatedTable = '';
    const client = {
      from: (table: string) => {
        updatedTable = table;
        return {
          update: () => ({
            eq: () => Promise.resolve({ data: { id: 'po-1' }, error: null }),
          }),
        };
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    const result = await engine.markPayoutProcessing({ payoutId: 'po-1', payeeType: 'chef', actorId: 'a-1' });

    expect(result.success).toBe(true);
    expect(updatedTable).toBe('chef_payouts');
    expect(mockAudit.log).toHaveBeenCalledOnce();
  });

  it('updates driver_payouts for driver payeeType (not hardcoded chef_payouts)', async () => {
    let updatedTable = '';
    const client = {
      from: (table: string) => {
        updatedTable = table;
        return {
          update: () => ({
            eq: () => Promise.resolve({ data: { id: 'po-1d' }, error: null }),
          }),
        };
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    const result = await engine.markPayoutProcessing({ payoutId: 'po-1d', payeeType: 'driver', actorId: 'a-1' });

    expect(result.success).toBe(true);
    expect(updatedTable).toBe('driver_payouts');
  });
});

// ---------------------------------------------------------------------------
// markPayoutPaid
// ---------------------------------------------------------------------------

describe('PayoutEngine.markPayoutPaid', () => {
  it('updates chef_payouts to completed and emits payout.processed', async () => {
    const client = {
      from: () => ({
        update: () => ({
          eq: () => Promise.resolve({ data: { id: 'po-2' }, error: null }),
        }),
      }),
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);

    const result = await engine.markPayoutPaid({
      payoutId: 'po-2',
      payeeType: 'chef',
      stripeTransferId: 'tr_123',
      actorId: 'a-1',
    });

    expect(result.success).toBe(true);
    expect(mockAudit.log).toHaveBeenCalledOnce();
    expect(mockEvents.emit).toHaveBeenCalledWith(
      'payout.processed',
      expect.any(String),
      'po-2',
      expect.objectContaining({ stripeTransferId: 'tr_123' }),
      expect.objectContaining({ userId: 'a-1' })
    );
  });

  it('updates driver_payouts for driver payeeType', async () => {
    let calledTable = '';
    const client = {
      from: (table: string) => {
        calledTable = table;
        return {
          update: () => ({
            eq: () => Promise.resolve({ data: { id: 'po-3' }, error: null }),
          }),
        };
      },
    };

    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    await engine.markPayoutPaid({ payoutId: 'po-3', payeeType: 'driver', stripeTransferId: 'tr_456', actorId: 'a-1' });

    expect(calledTable).toBe('driver_payouts');
  });
});

// ---------------------------------------------------------------------------
// createPayoutEngine factory
// ---------------------------------------------------------------------------

describe('createPayoutEngine', () => {
  it('returns a PayoutEngine instance', () => {
    const client = { from: () => ({}) };
    const engine = createPayoutEngine(client as never, mockAudit as never, mockEvents as never);
    expect(engine).toBeInstanceOf(PayoutEngine);
  });
});
