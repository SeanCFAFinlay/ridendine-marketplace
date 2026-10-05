/**
 * @jest-environment node
 */

// ==========================================
// TEST-ORDER LIFECYCLE SIMULATION TESTS
// A partner test-key order never reaches a kitchen, so nothing advances it and
// the partner never sees a lifecycle webhook. This simulates the transitions.
// The safety property under test throughout: it can only ever touch orders that
// are is_test AND partner-owned.
// ==========================================

import {
  advanceTestOrderLifecycles,
  nextLifecycleStep,
  TEST_LIFECYCLE_STEPS,
  STEP_INTERVAL_MS,
} from '../test-order-lifecycle';

interface Calls {
  filters: Record<string, Array<[string, unknown]>>;
  inserts: Record<string, unknown[]>;
  updates: Record<string, unknown[]>;
}

/**
 * Chainable Supabase mock that records the filters applied per table, so tests
 * can assert the query is actually scoped to test orders.
 */
function makeAdmin(results: Record<string, unknown>, calls: Calls) {
  function builder(table: string) {
    const b: any = {
      select: () => b,
      in: () => b,
      gte: () => b,
      lte: () => b,
      order: () => b,
      limit: () => b,
      eq: (col: string, val: unknown) => {
        (calls.filters[table] ??= []).push([col, val]);
        return b;
      },
      not: (col: string, op: string, val: unknown) => {
        (calls.filters[table] ??= []).push([`not:${col}:${op}`, val]);
        return b;
      },
      insert: (rows: unknown) => {
        (calls.inserts[table] ??= []).push(rows);
        return b;
      },
      update: (patch: unknown) => {
        (calls.updates[table] ??= []).push(patch);
        return b;
      },
      then: (resolve: (v: unknown) => void) =>
        resolve({ data: (results[table] as unknown) ?? null, error: null }),
    };
    return b;
  }
  return { from: (table: string) => builder(table) } as any;
}

function freshCalls(): Calls {
  return { filters: {}, inserts: {}, updates: {} };
}

const NOW = 1_800_000_000_000;
const LONG_AGO = new Date(NOW - 10 * 60_000).toISOString();

function paidTestOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-test-1',
    order_number: 'RD-TEST-1',
    partner_id: 'partner-cooco',
    status: 'pending',
    engine_status: 'pending',
    payment_status: 'completed',
    updated_at: LONG_AGO,
    created_at: LONG_AGO,
    ...overrides,
  };
}

describe('nextLifecycleStep', () => {
  it('starts a paid order at accepted', () => {
    expect(nextLifecycleStep('pending')).toBe('accepted');
    expect(nextLifecycleStep('payment_authorized')).toBe('accepted');
    expect(nextLifecycleStep('confirmed')).toBe('accepted');
  });

  it('walks the full progression in order', () => {
    const walked: string[] = [];
    let current: string | null = 'pending';
    for (let i = 0; i < 10; i++) {
      const next: string | null = nextLifecycleStep(current);
      if (!next) break;
      walked.push(next);
      current = next;
    }
    expect(walked).toEqual([...TEST_LIFECYCLE_STEPS]);
  });

  it('stops at delivered rather than looping', () => {
    expect(nextLifecycleStep('delivered')).toBeNull();
  });

  it('never resurrects a terminal order', () => {
    expect(nextLifecycleStep('cancelled')).toBeNull();
    expect(nextLifecycleStep('rejected')).toBeNull();
    expect(nextLifecycleStep('refunded')).toBeNull();
  });

  it('ignores unknown or empty statuses', () => {
    expect(nextLifecycleStep('something_else')).toBeNull();
    expect(nextLifecycleStep(null)).toBeNull();
    expect(nextLifecycleStep('')).toBeNull();
  });
});

describe('advanceTestOrderLifecycles', () => {
  it('only ever queries test orders that belong to a partner and are paid', async () => {
    const calls = freshCalls();
    const admin = makeAdmin({ orders: [], order_status_history: [] }, calls);

    await advanceTestOrderLifecycles(admin, NOW);

    expect(calls.filters.orders).toEqual(
      expect.arrayContaining([
        ['is_test', true],
        ['payment_status', 'completed'],
        ['not:partner_id:is', null],
      ])
    );
  });

  it('advances a paid test order to accepted and logs the transition', async () => {
    const calls = freshCalls();
    const admin = makeAdmin(
      { orders: [paidTestOrder()], order_status_history: [] },
      calls
    );

    const { advanced } = await advanceTestOrderLifecycles(admin, NOW);

    expect(advanced).toBe(1);

    const history = calls.inserts.order_status_history?.[0] as Record<string, unknown>;
    expect(history).toMatchObject({
      order_id: 'order-test-1',
      previous_status: 'pending',
      new_status: 'accepted',
    });

    expect(calls.updates.orders?.[0]).toMatchObject({
      status: 'accepted',
      engine_status: 'accepted',
    });
  });

  it('scopes the order write to is_test so a live order can never be hit', async () => {
    const calls = freshCalls();
    const admin = makeAdmin({ orders: [paidTestOrder()], order_status_history: [] }, calls);

    await advanceTestOrderLifecycles(admin, NOW);

    expect(calls.filters.orders).toEqual(
      expect.arrayContaining([['is_test', true]])
    );
  });

  it('advances only one step per run', async () => {
    const calls = freshCalls();
    const admin = makeAdmin(
      { orders: [paidTestOrder({ engine_status: 'accepted' })], order_status_history: [] },
      calls
    );

    await advanceTestOrderLifecycles(admin, NOW);

    expect(calls.inserts.order_status_history).toHaveLength(1);
    expect(calls.inserts.order_status_history?.[0]).toMatchObject({ new_status: 'preparing' });
  });

  it('waits out the step interval before advancing again', async () => {
    const calls = freshCalls();
    const admin = makeAdmin(
      {
        orders: [paidTestOrder({ engine_status: 'accepted' })],
        order_status_history: [
          {
            order_id: 'order-test-1',
            new_status: 'accepted',
            // Transitioned a moment ago — too soon for the next step.
            created_at: new Date(NOW - STEP_INTERVAL_MS / 2).toISOString(),
          },
        ],
      },
      calls
    );

    const { advanced } = await advanceTestOrderLifecycles(admin, NOW);

    expect(advanced).toBe(0);
    expect(calls.inserts.order_status_history).toBeUndefined();
  });

  it('advances once the interval has elapsed', async () => {
    const calls = freshCalls();
    const admin = makeAdmin(
      {
        orders: [paidTestOrder({ engine_status: 'accepted' })],
        order_status_history: [
          {
            order_id: 'order-test-1',
            new_status: 'accepted',
            created_at: new Date(NOW - STEP_INTERVAL_MS - 1000).toISOString(),
          },
        ],
      },
      calls
    );

    const { advanced } = await advanceTestOrderLifecycles(admin, NOW);

    expect(advanced).toBe(1);
    expect(calls.inserts.order_status_history?.[0]).toMatchObject({ new_status: 'preparing' });
  });

  it('leaves a delivered order alone', async () => {
    const calls = freshCalls();
    const admin = makeAdmin(
      { orders: [paidTestOrder({ engine_status: 'delivered' })], order_status_history: [] },
      calls
    );

    const { advanced } = await advanceTestOrderLifecycles(admin, NOW);

    expect(advanced).toBe(0);
    expect(calls.inserts.order_status_history).toBeUndefined();
    expect(calls.updates.orders).toBeUndefined();
  });

  it('leaves a cancelled test order alone', async () => {
    const calls = freshCalls();
    const admin = makeAdmin(
      { orders: [paidTestOrder({ engine_status: 'cancelled' })], order_status_history: [] },
      calls
    );

    const { advanced } = await advanceTestOrderLifecycles(admin, NOW);

    expect(advanced).toBe(0);
    expect(calls.updates.orders).toBeUndefined();
  });

  it('does nothing when there are no test orders', async () => {
    const calls = freshCalls();
    const admin = makeAdmin({ orders: [] }, calls);

    await expect(advanceTestOrderLifecycles(admin, NOW)).resolves.toEqual({ advanced: 0 });
    expect(calls.inserts.order_status_history).toBeUndefined();
  });

  it('paces each order off its own last transition', async () => {
    const calls = freshCalls();
    const admin = makeAdmin(
      {
        orders: [
          paidTestOrder({ id: 'ready-order', engine_status: 'accepted' }),
          paidTestOrder({ id: 'waiting-order', engine_status: 'accepted' }),
        ],
        order_status_history: [
          {
            order_id: 'waiting-order',
            new_status: 'accepted',
            created_at: new Date(NOW - 1000).toISOString(),
          },
          {
            order_id: 'ready-order',
            new_status: 'accepted',
            created_at: new Date(NOW - STEP_INTERVAL_MS - 5000).toISOString(),
          },
        ],
      },
      calls
    );

    const { advanced } = await advanceTestOrderLifecycles(admin, NOW);

    expect(advanced).toBe(1);
    expect(calls.inserts.order_status_history?.[0]).toMatchObject({ order_id: 'ready-order' });
  });
});
