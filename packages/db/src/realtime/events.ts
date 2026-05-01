/**
 * Typed parsing for realtime payloads (broadcast + postgres_changes `new` rows).
 * Fail closed: malformed payloads return null and must be ignored by callers.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Minimal safe shape for order rows delivered over Realtime `payload.new`. */
export interface RealtimeOrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  storefront_id?: string;
  customer_id?: string;
  delivery_address_id?: string;
  special_instructions?: string | null;
  updated_at?: string;
}

export function parseOrdersRealtimeRow(row: unknown): RealtimeOrderRow | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const order_number = row.order_number;
  const status = row.status;
  const total = row.total;
  const created_at = row.created_at;
  if (typeof id !== 'string' || typeof order_number !== 'string' || typeof status !== 'string') {
    return null;
  }
  if (typeof created_at !== 'string') return null;
  const n = typeof total === 'number' ? total : Number(total);
  if (!Number.isFinite(n)) return null;

  const out: RealtimeOrderRow = {
    id,
    order_number,
    status,
    total: n,
    created_at,
  };
  if (typeof row.storefront_id === 'string') out.storefront_id = row.storefront_id;
  if (typeof row.customer_id === 'string') out.customer_id = row.customer_id;
  if (typeof row.delivery_address_id === 'string') out.delivery_address_id = row.delivery_address_id;
  if (row.special_instructions === null || typeof row.special_instructions === 'string') {
    out.special_instructions = row.special_instructions as string | null;
  }
  if (typeof row.updated_at === 'string') out.updated_at = row.updated_at;
  return out;
}

/** Broadcast envelope from engine / custom senders (`payload` field on message). */
export interface ParsedBroadcastEvent {
  event: string;
  payload: Record<string, unknown>;
}

/**
 * Parses Supabase broadcast callback payloads where `payload` may be nested.
 * Unknown shapes return null (caller ignores).
 */
export function parseBroadcastEnvelope(raw: unknown): ParsedBroadcastEvent | null {
  if (!isRecord(raw)) return null;
  const inner = raw.payload;
  if (!isRecord(inner)) return null;
  const event = inner.event ?? raw.event;
  if (typeof event !== 'string' || event.length === 0 || event.length > 128) return null;
  const data = inner.payload;
  if (!isRecord(data)) return null;
  return { event, payload: data };
}

/** Domain-style event ids aligned with `DomainEventType` strings (see `@ridendine/types`). */
export const KNOWN_REALTIME_EVENT_IDS = [
  'order.created',
  'order.accepted',
  'order.rejected',
  'order.prep_started',
  'order.ready',
  'driver.assigned',
  'delivery.picked_up',
  'driver_location_updated',
  'delivery.completed',
  'payment.confirmed',
  'refund.requested',
  'refund.processed',
  'storefront.closed',
  'menu.item.sold_out',
  'ops.override.executed',
] as const;

export type KnownRealtimeEventId = (typeof KNOWN_REALTIME_EVENT_IDS)[number];

export function isKnownRealtimeEventId(id: string): id is KnownRealtimeEventId {
  return (KNOWN_REALTIME_EVENT_IDS as readonly string[]).includes(id);
}
