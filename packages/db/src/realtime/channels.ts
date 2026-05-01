/**
 * Supabase Realtime channel naming — Phase 11 contract.
 * Use stable names per subscription surface to avoid duplicate channels on re-render.
 */

/** Customer / guest: single order lifecycle (broadcast + entity channels may both be used). */
export function orderChannel(orderId: string): string {
  return `order:${orderId}`;
}

/** Chef: orders for one storefront only (pair with postgres filter `storefront_id=eq.{id}`). */
export function chefStorefrontOrdersChannel(storefrontId: string): string {
  return `chef:${storefrontId}:orders`;
}

/** Driver: assignment stream for one driver. */
export function driverAssignmentsChannel(driverId: string): string {
  return `driver:${driverId}:assignments`;
}

/** Ops: global orders firehose (RLS must restrict rows to platform roles). */
export function opsOrdersChannel(): string {
  return 'ops:orders';
}

/** Ops: system alerts / SLA inserts. */
export function opsAlertsChannel(): string {
  return 'ops:alerts';
}

/** Ops: live map (driver presence + active deliveries). */
export function opsLiveMapChannel(): string {
  return 'ops:map:presence';
}

/** Support queue (future-dedicated; keep name reserved). */
export function supportTicketsChannel(): string {
  return 'support:tickets';
}

/** Customer web: notification inserts for one user (pair with `user_id=eq.{id}` filter). */
export function customerNotificationsChannel(userId: string): string {
  return `customer:${userId}:notifications`;
}

/** Customer delivery tracking (broadcast payloads, not postgres_changes). */
export function deliveryTrackingChannel(deliveryId: string): string {
  return `delivery:${deliveryId}:tracking`;
}

/** Legacy alias used by live tracker — prefer {@link deliveryTrackingChannel}. */
export function deliveryTrackingChannelLegacy(deliveryId: string): string {
  return `tracking:${deliveryId}`;
}

/** Entity-scoped delivery broadcast bucket. */
export function entityDeliveryChannel(deliveryId: string): string {
  return `entity:delivery:${deliveryId}`;
}

/** Postgres wildcard listener for a table + optional filter (stable id for cleanup). */
export function postgresTableChannelId(
  schema: string,
  table: string,
  event: string,
  filter?: string
): string {
  const f = filter ? encodeURIComponent(filter) : 'all';
  return `pg:${schema}:${table}:${event}:${f}`;
}
