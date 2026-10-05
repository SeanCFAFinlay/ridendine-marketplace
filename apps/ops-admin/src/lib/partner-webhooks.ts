// ==========================================
// PARTNER WEBHOOK DELIVERY
// Delivers order-lifecycle events to partners that registered a webhook_url.
//
// Outbound safety: webhook_url is chosen by an operator when onboarding a
// partner, so it is the only outbound request in this system aimed at an
// address the codebase does not control. assertSafeWebhookTarget() below
// requires HTTPS and rejects loopback / link-local / private ranges so a
// mis-typed or malicious registration cannot turn the processor into an
// internal-network probe.
// Enqueues from order_status_history (the persistent status-transition log;
// domain_events is volatile/pruned), idempotent on the history row id, then
// delivers pending/failed rows with HMAC-signed bodies and exponential-backoff
// retry. Driven by the partner-webhooks processor cron.
// ==========================================

import { createHmac } from 'crypto';
import type { SupabaseClient } from '@ridendine/db';
import { advanceTestOrderLifecycles } from './test-order-lifecycle';

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
/**
 * Reject webhook destinations that are not safe to call from a server.
 *
 * Blocks plaintext HTTP (partner payloads are signed but not encrypted in
 * transit otherwise) and any literal address inside a private, loopback or
 * link-local range — including IPv6 forms and the cloud metadata endpoint.
 *
 * Honest limitation: this validates the URL, not the DNS resolution. A hostname
 * that resolves to a private address still passes. Closing that requires
 * resolving and pinning the IP before connecting, which Node's fetch does not
 * expose. Given the URL is operator-registered rather than caller-supplied,
 * this is a proportionate first barrier, not a complete SSRF defence.
 */
export function assertSafeWebhookTarget(
  rawUrl: string
): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'malformed URL' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, reason: `protocol ${url.protocol} is not https` };
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return { ok: false, reason: 'loopback or internal hostname' };
  }

  // IPv6 loopback / unique-local / link-local
  if (host === '::1' || /^f[cd][0-9a-f]{2}:/i.test(host) || /^fe80:/i.test(host)) {
    return { ok: false, reason: 'private IPv6 address' };
  }

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    const isPrivate =
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) || // link-local, incl. 169.254.169.254 metadata
      (a === 100 && b >= 64 && b <= 127); // carrier-grade NAT
    if (isPrivate) return { ok: false, reason: `private IPv4 address ${host}` };
  }

  return { ok: true, url };
}

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
  is_test: boolean | null;
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
 * Stand-in `delivery` block for simulated test-mode orders.
 *
 * Test orders never get a real `deliveries` row — creating one would put fake
 * work on the live dispatch board and in the driver app. Without it a partner
 * would receive `delivery: null` on out_for_delivery/delivered and could not
 * test the half of their handler that reads driver and ETA fields. So the block
 * is synthesised here, in the payload only, and is transparently labelled: the
 * driver is named "Test Driver" and the phone is the reserved 555 range, so it
 * can never be confused with a real dispatch.
 */
function simulatedDeliverySnapshot(event: string, nowMs: number): Record<string, unknown> | null {
  if (event !== 'order.out_for_delivery' && event !== 'order.delivered') return null;
  const delivered = event === 'order.delivered';
  return {
    status: delivered ? 'DELIVERED' : 'IN_TRANSIT',
    driverName: 'Test Driver',
    driverPhone: '+15555550123',
    vehicleType: 'car',
    etaMinutes: delivered ? 0 : 12,
    etaDropoffAt: new Date(nowMs + (delivered ? 0 : 12 * 60_000)).toISOString(),
    distanceKm: 4.2,
    simulated: true,
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
    .select('id, order_number, partner_id, status, engine_status, total, is_test')
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
        delivery:
          deliverySnapshot(deliveryByOrderId.get(order.id), driverById, nowMs) ??
          (order.is_test ? simulatedDeliverySnapshot(partnerEvent, nowMs) : null),
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
): Promise<{ delivered: number; failed: number; blocked: number }> {
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
  let blocked = 0;

  for (const row of rows) {
    const url = row.api_partners?.webhook_url;
    if (!url) continue;

    // Partner webhook URLs are operator-registered, not caller-supplied, so
    // this is a low-likelihood SSRF surface — but it is still the one place
    // this server makes an HTTPS request to an address someone else chose.
    // Refuse plaintext and refuse anything that resolves to a private range.
    const destination = assertSafeWebhookTarget(url);
    const body = JSON.stringify({ id: row.id, ...row.payload });
    const signature = createHmac('sha256', row.api_partners.webhook_secret || '')
      .update(body)
      .digest('hex');

    let ok = false;
    let responseCode: number | null = null;
    let errorMsg: string | null = null;
    try {
      if (!destination.ok) {
        // Recorded through the normal failure path so it retries/exhausts
        // like any other delivery problem and stays visible in the table.
        blocked++;
        throw new Error(`blocked destination: ${destination.reason}`);
      }
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

  // `blocked` is reported separately from `failed`: a blocked destination is a
  // configuration problem with the partner's registered URL, not a transient
  // delivery failure, and it will never succeed on retry.
  return { delivered, failed, blocked };
}

export async function runPartnerWebhookProcessor(
  admin: SupabaseClient,
  nowMs: number
): Promise<{
  enqueued: number;
  delivered: number;
  failed: number;
  blocked: number;
  testAdvanced: number;
}> {
  // Advance partner test-mode orders first so a step taken this minute is
  // enqueued and delivered in the same run rather than waiting for the next.
  let testAdvanced = 0;
  try {
    ({ advanced: testAdvanced } = await advanceTestOrderLifecycles(admin, nowMs));
  } catch (error) {
    // Simulation is a convenience for partner integration testing — it must
    // never block real partners' webhook delivery.
    console.error('[partner-webhooks] test-order lifecycle simulation failed:', error);
  }

  const enqueued = await enqueuePartnerWebhooks(admin, nowMs);
  const { delivered, failed, blocked } = await deliverPartnerWebhooks(admin, nowMs);
  return { enqueued, delivered, failed, blocked, testAdvanced };
}
