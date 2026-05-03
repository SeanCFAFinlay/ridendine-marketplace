/**
 * Customer-safe order lifecycle projection (Phase 0).
 * Must stay in sync with `orders_public_stage_from_engine()` in
 * `supabase/migrations/00019_business_engine.sql`.
 *
 * Privacy: this enum is what customer UIs should use — never expose raw
 * driver or chef coordinates on public channels; use progress/ETA fields only (Phase 2+).
 */

export const PublicOrderStage = {
  PLACED: 'placed',
  COOKING: 'cooking',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type PublicOrderStage = (typeof PublicOrderStage)[keyof typeof PublicOrderStage];

/** Fixed UUID for platform_revenue row in platform_accounts (see migration 00019). */
export const PLATFORM_ACCOUNT_SENTINEL_OWNER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Maps `orders.engine_status` → `orders.public_stage`.
 * Unknown / empty engine values default to `placed` (same as SQL CASE ELSE).
 */
export function mapEngineStatusToPublicStage(engineStatus: string | null | undefined): PublicOrderStage {
  const s = (engineStatus ?? '').trim();
  switch (s) {
    case 'draft':
    case 'checkout_pending':
    case 'payment_authorized':
    case 'pending':
      return PublicOrderStage.PLACED;

    case 'payment_failed':
    case 'rejected':
    case 'cancel_requested':
    case 'cancelled':
    case 'failed':
    case 'exception':
      return PublicOrderStage.CANCELLED;

    case 'accepted':
    case 'preparing':
    case 'ready':
    case 'dispatch_pending':
    case 'driver_offered':
    case 'driver_assigned':
    case 'driver_en_route_pickup':
      return PublicOrderStage.COOKING;

    case 'picked_up':
    case 'driver_en_route_dropoff':
    case 'driver_en_route_customer':
      return PublicOrderStage.ON_THE_WAY;

    case 'delivered':
    case 'completed':
      return PublicOrderStage.DELIVERED;

    case 'refund_pending':
    case 'refunded':
    case 'partially_refunded':
      return PublicOrderStage.REFUNDED;

    default:
      return PublicOrderStage.PLACED;
  }
}
