// ==========================================
// PARTNER WEBHOOK DELIVERY
// Delivers order-lifecycle events to partners that registered a webhook_url.
// Enqueues from order_status_history (the persistent status-transition log;
// domain_events is volatile/pruned), idempotent on the history row id, then
// delivers pending/failed rows with HMAC-signed bodies and exponential-backoff
// retry. Driven by the partner-webhooks processor cron.
// ==========================================

import { createHmac } from 'crypto';
import type { SupabaseClient } from '@ridendine/db';

/** order status (new_status) -> partner-facing event name. Only these deliver. */
const STATUS_EVENTS: Record<string, string> = {
  accepted: 'order.accepted',
  preparing: 'order.preparing',
  ready_for_pickup: 'order.ready',
  out_for_delivery: 'order.out_for_delivery',
  delivered: 'order.delivered',
  completed: 'order.delivered',
  cancelled: 'order.cancelled',
  rejected: 'order.rejected',
};

const ENQUEUE_WINDOW_MS = 48 * 60 * 60 * 1000;
const DELIVER_BATCH = 100;
const REQUEST_TIMEOUT_MS = 8000;

function backoffMs(attempts: number): number {
  // 1, 2, 4, 8, 16, 32 minutes
  return Math.min(2 ** attempts, 32) * 60 * 1000;
}

interface PartnerRow {
  id: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
}
interface OrderRow {
  id: string;
  order_number: string | null;
  partner_id: string | null;
  status: string | null;
  engine_status: string | null;
  total: number | null;
}
interface StatusRow {
  id: string;
  order_id: string;
  new_status: string;
  created_at: string;
}
interface DeliveryRow {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: string | null;
  eta_dropoff_at: string | null;
  estimated_dropoff_at: string | null;
  distance_km: number | null;
}
interface DriverRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  vehicle_type: string | null;
}

/**
 * Build the partner-facing `delivery` block for a webhook payload from the
 * order's current delivery + assigned driver, or null when no delivery exists
 * yet (e.g. at order.accepted). `etaMinutes` is relative to the event time.
 */
function deliverySnapshot(
  delivery: DeliveryRow | undefined,
  driverById: Map<string, DriverRow>,
  nowMs: number
): Record<string, unknown> | null {
  if (!delivery) return null;
  const driver = delivery.driver_id ? driverById.get(delivery.driver_id) : undefined;
  const etaIso = delivery.eta_dropoff_at ?? delivery.estimated_dropoff_at ?? null;
  const etaMs = etaIso ? new Date(etaIso).getTime() : NaN;
  const etaMinutes = Number.isFinite(etaMs) ? Math.max(0, Math.round((etaMs - nowMs) / 60000)) : null;
  const driverName = driver
    ? `${driver.first_name ?? ''} ${driver.last_name ?? ''}`.trim() || null
    : null;
  return {
    status: delivery.status ?? null,
    driverName,
    driverPhone: driver?.phone ?? null,
    vehicleType: driver?.vehicle_type ?? null,
    etaMinutes,
    etaDropoffAt: etaIso,
    distanceKm: delivery.distance_km ?? null,
  };
}

/**
 * Create pending delivery rows for new deliverable order events that belong to a
 * partner with a webhook_url. Idempotent: domain_event_id is unique.
 */
export async function enqueuePartnerWebhooks(
  admin: SupabaseClient,
  nowMs: number
): Promise<number> {
  const since = new Date(nowMs - ENQUEUE_WINDOW_MS).toISOString();
  const { data: events } = await (admin as any)
    .from('order_status_history')
    .select('id, order_id, new_status, created_at')
    .in('new_status', Object.keys(STATUS_EVENTS))
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(1000);

  const eventRows = (events ?? []) as StatusRow[];
  if (eventRows.length === 0) return 0;

  const orderIds = Array.from(new Set(eventRows.map((e) => e.order_id)));
  const { data: orders } = await (admin as any)
    .from('orders')
    .select('id, order_number, partner_id, status, engine_status, total')
    .in('id', orderIds);
  const orderById = new Map<string, OrderRow>(((orders ?? []) as OrderRow[]).map((o) => [o.id, o]));

  const partnerIds = Array.from(
    new Set(((orders ?? []) as OrderRow[]).map((o) => o.partner_id).filter(Boolean) as string[])
  );
  if (partnerIds.length === 0) return 0;

  // Enrich with the current delivery + assigned driver so partners receive
  // driver name/phone/ETA on out_for_delivery / delivered events (snapshot at
  // event time). Absent for pre-dispatch events -> delivery is null.
  const { data: deliveries } = await (admin as any)
    .from('deliveries')
    .select('id, order_id, driver_id, status, eta_dropoff_at, estimated_dropoff_at, distance_km')
    .in('order_id', orderIds);
  const deliveryRows = (deliveries ?? []) as DeliveryRow[];
  const deliveryByOrderId = new Map<string, DeliveryRow>();
  for (const d of deliveryRows) deliveryByOrderId.set(d.order_id, d);

  const driverIds = Array.from(
    new Set(deliveryRows.map((d) => d.driver_id).filter(Boolean) as string[])
  );
  let driverById = new Map<string, DriverRow>();
  if (driverIds.length > 0) {
    const { data: drivers } = await (admin as any)
      .from('drivers')
      .select('id, first_name, last_name, phone, vehicle_type')
      .in('id', driverIds);
    driverById = new Map<string, DriverRow>(((drivers ?? []) as DriverRow[]).map((d) => [d.id, d]));
  }
  const { data: partners } = await (admin as any)
    .from('api_partners')
    .select('id, webhook_url, webhook_secret, is_active')
    .in('id', partnerIds);
  const partnerById = new Map<string, PartnerRow>(
    ((partners ?? []) as PartnerRow[])
      .filter((p) => p.is_active && p.webhook_url)
      .map((p) => [p.id, p])
  );
  if (partnerById.size === 0) return 0;

  // Skip events that already have a delivery row.
  const { data: existing } = await (admin as any)
    .from('partner_webhook_deliveries')
    .select('domain_event_id')
    .in('domain_event_id', eventRows.map((e) => e.id));
  const seen = new Set(((existing ?? []) as { domain_event_id: string }[]).map((r) => r.domain_event_id));

  const toInsert: Record<string, unknown>[] = [];
  for (const ev of eventRows) {
    if (seen.has(ev.id)) continue;
    const partnerEvent = STATUS_EVENTS[ev.new_status];
    if (!partnerEvent) continue;
    const order = orderById.get(ev.order_id);
    if (!order?.partner_id) continue;
    const partner = partnerById.get(order.partner_id);
    if (!partner) continue;

    toInsert.push({
      partner_id: partner.id,
      order_id: order.id,
      domain_event_id: ev.id,
      event_type: partnerEvent,
      payload: {
        event: partnerEvent,
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          engineStatus: order.engine_status,
          total: order.total,
        },
        delivery: deliverySnapshot(deliveryByOrderId.get(order.id), driverById, nowMs),
        occurredAt: ev.created_at,
      },
      status: 'pending',
      next_attempt_at: new Date(nowMs).toISOString(),
    });
  }

  if (toInsert.length > 0) {
    await (admin as any).from('partner_webhook_deliveries').insert(toInsert);
  }
  return toInsert.length;
}

/**
 * Deliver due pending/failed rows. Signs the body with the partner's secret
 * (HMAC-SHA256) and applies exponential backoff; rows past max_attempts go dead.
 */
export async function deliverPartnerWebhooks(
  admin: SupabaseClient,
  nowMs: number
): Promise<{ delivered: number; failed: number }> {
  const nowIso = new Date(nowMs).toISOString();
  const { data: due } = await (admin as any)
    .from('partner_webhook_deliveries')
    .select('id, partner_id, event_type, payload, attempts, max_attempts, api_partners!inner(webhook_url, webhook_secret)')
    .in('status', ['pending', 'failed'])
    .lte('next_attempt_at', nowIso)
    .order('next_attempt_at', { ascending: true })
    .limit(DELIVER_BATCH);

  const rows = (due ?? []) as Array<{
    id: string;
    event_type: string;
    payload: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
    api_partners: { webhook_url: string | null; webhook_secret: string | null };
  }>;

  let delivered = 0;
  let failed = 0;

  for (const row of rows) {
    const url = row.api_partners?.webhook_url;
    if (!url) continue;
    const body = JSON.stringify({ id: row.id, ...row.payload });
    const signature = createHmac('sha256', row.api_partners.webhook_secret || '')
      .update(body)
      .digest('hex');

    let ok = false;
    let responseCode: number | null = null;
    let errorMsg: string | null = null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-RideNDine-Event': row.event_type,
          'X-RideNDine-Delivery': row.id,
          'X-RideNDine-Signature': `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      responseCode = res.status;
      ok = res.ok;
      if (!ok) errorMsg = `HTTP ${res.status}`;
    } catch (err) {
      errorMsg = err instanceof Error ? err.message.slice(0, 300) : 'request failed';
    }

    if (ok) {
      delivered++;
      await (admin as any)
        .from('partner_webhook_deliveries')
        .update({
          status: 'delivered',
          attempts: row.attempts + 1,
          response_code: responseCode,
          last_error: null,
          delivered_at: nowIso,
        })
        .eq('id', row.id);
    } else {
      failed++;
      const nextAttempts = row.attempts + 1;
      const dead = nextAttempts >= row.max_attempts;
      await (admin as any)
        .from('partner_webhook_deliveries')
        .update({
          status: dead ? 'dead' : 'failed',
          attempts: nextAttempts,
          response_code: responseCode,
          last_error: errorMsg,
          next_attempt_at: new Date(nowMs + backoffMs(nextAttempts)).toISOString(),
        })
        .eq('id', row.id);
    }
  }

  return { delivered, failed };
}

export async function runPartnerWebhookProcessor(
  admin: SupabaseClient,
  nowMs: number
): Promise<{ enqueued: number; delivered: number; failed: number }> {
  const enqueued = await enqueuePartnerWebhooks(admin, nowMs);
  const { delivered, failed } = await deliverPartnerWebhooks(admin, nowMs);
  return { enqueued, delivered, failed };
}
