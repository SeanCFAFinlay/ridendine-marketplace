// ==========================================
// SLA CHECKS
// Standalone SLA violation detection functions.
// Can be called from the SLA runner or API endpoints.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SLAViolation {
  entityType: 'order' | 'delivery';
  entityId: string;
  violationType: string;
  elapsedMinutes: number;
  thresholdMinutes: number;
  details: Record<string, unknown>;
}

// ---- helpers ----

function elapsedMinutes(timestamp: string): number {
  return Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000);
}

function cutoffISO(thresholdMinutes: number): string {
  return new Date(Date.now() - thresholdMinutes * 60_000).toISOString();
}

// ---- public functions ----

/**
 * Orders awaiting chef acceptance, older than thresholdMinutes.
 *
 * Canonically PENDING is the "awaiting chef" state, but a real prod order
 * (RD-MP4ZNSEA-AJKX, 2026-05-14) sat in PAYMENT_AUTHORIZED for 12 hours
 * because the upstream payment_authorized → pending auto-transition didn't
 * fire. Defensive: cancel stuck orders in EITHER state so customers don't
 * see "Pending forever" while we trace the upstream transition bug.
 */
export async function checkChefAcceptanceTimeout(
  client: SupabaseClient,
  thresholdMinutes = 5,
): Promise<SLAViolation[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, engine_status, created_at')
    .in('engine_status', ['pending', 'payment_authorized'])
    .lt('created_at', cutoffISO(thresholdMinutes));

  if (error || !data) return [];

  return (data as Array<{ id: string; engine_status: string; created_at: string }>).map((row) => ({
    entityType: 'order',
    entityId: row.id,
    violationType: 'chef_acceptance_timeout',
    elapsedMinutes: elapsedMinutes(row.created_at),
    thresholdMinutes,
    details: { engine_status: row.engine_status },
  }));
}

/**
 * Orders abandoned BEFORE payment.
 *
 * `runCheckout` creates the order row and the Stripe PaymentIntent, then hands
 * a clientSecret to the browser. If the customer simply closes the tab, the
 * order sits in `checkout_pending` forever: nothing ever advances it and
 * nothing ever cancels it. checkChefAcceptanceTimeout does not cover this —
 * it only looks at orders that already reached `pending`/`payment_authorized`.
 *
 * The result was permanently unresolved rows that inflate order counts and
 * make "how many orders did we take today" unanswerable.
 *
 * The threshold is deliberately generous. A customer can legitimately sit on
 * the card form for several minutes, and a Stripe webhook that arrives late
 * must never race a cancellation. 60 minutes is far beyond both.
 */
export async function checkAbandonedCheckouts(
  client: SupabaseClient,
  thresholdMinutes = 60,
): Promise<SLAViolation[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, engine_status, payment_status, created_at')
    .eq('engine_status', 'checkout_pending')
    .lt('created_at', cutoffISO(thresholdMinutes));

  if (error || !data) return [];

  return (
    data as Array<{
      id: string;
      engine_status: string;
      payment_status: string | null;
      created_at: string;
    }>
  )
    // Never touch an order whose payment actually completed — that is a
    // webhook-processing problem, not an abandonment, and cancelling it would
    // strand a paying customer.
    .filter((row) => row.payment_status !== 'completed')
    .map((row) => ({
      entityType: 'order',
      entityId: row.id,
      violationType: 'checkout_abandoned',
      elapsedMinutes: elapsedMinutes(row.created_at),
      thresholdMinutes,
      details: { engine_status: row.engine_status, payment_status: row.payment_status },
    }));
}

/**
 * Deliveries with status='pending', older than thresholdMinutes, not yet escalated.
 */
export async function checkDriverAssignmentTimeout(
  client: SupabaseClient,
  thresholdMinutes = 10,
): Promise<SLAViolation[]> {
  const { data, error } = await client
    .from('deliveries')
    .select('id, status, created_at, escalated_to_ops')
    .in('status', ['pending'])
    .lt('created_at', cutoffISO(thresholdMinutes))
    .eq('escalated_to_ops', false);

  if (error || !data) return [];

  return (data as Array<{ id: string; status: string; created_at: string; escalated_to_ops: boolean }>).map((row) => ({
    entityType: 'delivery',
    entityId: row.id,
    violationType: 'driver_assignment_timeout',
    elapsedMinutes: elapsedMinutes(row.created_at),
    thresholdMinutes,
    details: { status: row.status },
  }));
}

/**
 * Deliveries assigned or en_route_to_pickup with updated_at older than thresholdMinutes.
 */
export async function checkPickupDelay(
  client: SupabaseClient,
  thresholdMinutes = 25,
): Promise<SLAViolation[]> {
  const { data, error } = await client
    .from('deliveries')
    .select('id, status, updated_at')
    .in('status', ['assigned', 'en_route_to_pickup'])
    .lt('updated_at', cutoffISO(thresholdMinutes));

  if (error || !data) return [];

  return (data as Array<{ id: string; status: string; updated_at: string }>).map((row) => ({
    entityType: 'delivery',
    entityId: row.id,
    violationType: 'pickup_delay',
    elapsedMinutes: elapsedMinutes(row.updated_at),
    thresholdMinutes,
    details: { status: row.status },
  }));
}

/**
 * Orders with engine_status='preparing' where prep_started_at is older than thresholdMinutes.
 */
export async function checkStalePreparingOrders(
  client: SupabaseClient,
  thresholdMinutes = 45,
): Promise<SLAViolation[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, engine_status, prep_started_at')
    .eq('engine_status', 'preparing')
    .lt('prep_started_at', cutoffISO(thresholdMinutes));

  if (error || !data) return [];

  return (data as Array<{ id: string; engine_status: string; prep_started_at: string }>).map((row) => ({
    entityType: 'order',
    entityId: row.id,
    violationType: 'stale_preparing_order',
    elapsedMinutes: elapsedMinutes(row.prep_started_at),
    thresholdMinutes,
    details: { engine_status: row.engine_status },
  }));
}

/**
 * Deliveries in transit with updated_at older than thresholdMinutes.
 */
export async function checkDeliveryDelay(
  client: SupabaseClient,
  thresholdMinutes = 35,
): Promise<SLAViolation[]> {
  const { data, error } = await client
    .from('deliveries')
    .select('id, status, updated_at')
    .in('status', ['picked_up', 'en_route_to_dropoff', 'en_route_to_customer'])
    .lt('updated_at', cutoffISO(thresholdMinutes));

  if (error || !data) return [];

  return (data as Array<{ id: string; status: string; updated_at: string }>).map((row) => ({
    entityType: 'delivery',
    entityId: row.id,
    violationType: 'delivery_delay',
    elapsedMinutes: elapsedMinutes(row.updated_at),
    thresholdMinutes,
    details: { status: row.status },
  }));
}
