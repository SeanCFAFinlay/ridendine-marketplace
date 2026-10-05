// ==========================================
// TEST-ORDER LIFECYCLE SIMULATION
//
// A partner test-key order is deliberately kept out of the kitchen queue, so no
// chef ever accepts it and its status never moves. That made a partner's webhook
// handler untestable: they could take a test payment but would never receive
// order.accepted / preparing / ready / out_for_delivery / delivered.
//
// This walks paid test orders through the same status transitions a real order
// makes, one step per processor run. It writes ONLY order_status_history + the
// order's own status columns — never the engine, deliveries, finance, loyalty or
// payouts. The existing partner-webhook enqueue reads order_status_history, so
// the events reach the partner through exactly the same path, signed with the
// same secret, in the same shape as production traffic.
//
// Scope guard: an order is only ever touched when is_test = true AND it belongs
// to a partner. Nothing here can select a real order.
// ==========================================

import type { SupabaseClient } from '@ridendine/db';

/**
 * The progression, in order. Values match the `new_status` keys the partner
 * webhook enqueue maps to events, so each step emits exactly one webhook.
 */
export const TEST_LIFECYCLE_STEPS = [
  'accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
] as const;

export type TestLifecycleStep = (typeof TEST_LIFECYCLE_STEPS)[number];

/** Statuses a paid-but-not-yet-started test order can be sitting in. */
const PRE_LIFECYCLE_STATUSES = new Set(['pending', 'payment_authorized', 'confirmed', 'paid']);

/**
 * Minimum gap between simulated transitions. With the per-minute processor cron
 * a partner sees a full lifecycle over ~5 minutes — slow enough to observe each
 * webhook arriving separately, fast enough to iterate on.
 */
export const STEP_INTERVAL_MS = 60_000;

/** How far back to look for test orders still mid-lifecycle. */
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

const BATCH = 50;

interface TestOrderRow {
  id: string;
  order_number: string | null;
  partner_id: string | null;
  status: string | null;
  engine_status: string | null;
  payment_status: string | null;
  updated_at: string | null;
  created_at: string | null;
}

/**
 * The step that follows `current`, or null when the order is finished (or in a
 * terminal state such as cancelled/rejected, which must never be resurrected).
 */
export function nextLifecycleStep(current: string | null): TestLifecycleStep | null {
  const status = (current ?? '').trim();

  if (PRE_LIFECYCLE_STATUSES.has(status)) return TEST_LIFECYCLE_STEPS[0];

  const index = (TEST_LIFECYCLE_STEPS as readonly string[]).indexOf(status);
  if (index === -1) return null; // cancelled, rejected, refunded, unknown → leave alone
  if (index >= TEST_LIFECYCLE_STEPS.length - 1) return null; // delivered → done

  return TEST_LIFECYCLE_STEPS[index + 1] ?? null;
}

/**
 * Advance every due paid test order by exactly one step.
 *
 * One step per run (rather than racing through the whole lifecycle) keeps the
 * partner's webhook stream ordered and observable, and means a slow or failing
 * partner endpoint never has more than one event of backlog per order.
 */
export async function advanceTestOrderLifecycles(
  admin: SupabaseClient,
  nowMs: number
): Promise<{ advanced: number }> {
  const since = new Date(nowMs - LOOKBACK_MS).toISOString();

  const { data: orders } = await (admin as any)
    .from('orders')
    .select('id, order_number, partner_id, status, engine_status, payment_status, updated_at, created_at')
    .eq('is_test', true)
    .not('partner_id', 'is', null)
    .eq('payment_status', 'completed')
    .gte('created_at', since)
    .limit(BATCH);

  const rows = (orders ?? []) as TestOrderRow[];
  if (rows.length === 0) return { advanced: 0 };

  // Pace off the last real transition, not the order's updated_at — unrelated
  // column writes (payment_status, etc.) would otherwise keep pushing the next
  // step out and stall the lifecycle.
  const { data: history } = await (admin as any)
    .from('order_status_history')
    .select('order_id, new_status, created_at')
    .in('order_id', rows.map((o) => o.id))
    .order('created_at', { ascending: false })
    .limit(1000);

  const lastTransitionAt = new Map<string, number>();
  for (const h of (history ?? []) as Array<{ order_id: string; created_at: string }>) {
    if (lastTransitionAt.has(h.order_id)) continue; // rows are newest-first
    const t = new Date(h.created_at).getTime();
    if (Number.isFinite(t)) lastTransitionAt.set(h.order_id, t);
  }

  let advanced = 0;

  for (const order of rows) {
    const current = order.engine_status ?? order.status;
    const next = nextLifecycleStep(current);
    if (!next) continue;

    const last = lastTransitionAt.get(order.id);
    if (last !== undefined && nowMs - last < STEP_INTERVAL_MS) continue;

    const nowIso = new Date(nowMs).toISOString();

    // History first: it is what the partner-webhook enqueue reads. If the order
    // update below fails, the worst case is a re-emitted event, which the
    // enqueue already de-duplicates on the history row id.
    const { error: historyError } = await (admin as any)
      .from('order_status_history')
      .insert({
        order_id: order.id,
        previous_status: current,
        new_status: next,
        status: next,
        notes: 'Simulated transition for partner test-mode order (no kitchen, no finance).',
        created_at: nowIso,
      });

    if (historyError) {
      console.error('[test-order-lifecycle] history insert failed', {
        orderId: order.id,
        next,
        error: historyError.message,
      });
      continue;
    }

    const { error: orderError } = await (admin as any)
      .from('orders')
      .update({ status: next, engine_status: next, updated_at: nowIso })
      .eq('id', order.id)
      .eq('is_test', true); // belt and braces: never touch a live order

    if (orderError) {
      console.error('[test-order-lifecycle] order update failed', {
        orderId: order.id,
        next,
        error: orderError.message,
      });
      continue;
    }

    advanced++;
  }

  return { advanced };
}
