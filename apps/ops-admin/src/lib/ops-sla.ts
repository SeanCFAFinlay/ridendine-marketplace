import { mapEngineStatusToPublicStage, PublicOrderStage } from '@ridendine/types';
import type { OpsLiveDeliverySnapshot, OpsLiveOrderSnapshot } from './ops-live-feed-types';

const COOKING_SLA_MINUTES = 40;
const DRIVER_WAIT_SLA_MINUTES = 18;
const ON_THE_WAY_SLA_MINUTES = 50;

function minutesSince(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (nowMs - t) / 60000;
}

const COOKING_ENGINES = new Set([
  'accepted',
  'preparing',
  'ready',
  'dispatch_pending',
  'driver_offered',
  'driver_assigned',
  'driver_en_route_pickup',
]);

const DRIVER_WAIT_ENGINES = new Set(['ready', 'dispatch_pending', 'driver_offered', 'driver_assigned']);

const ON_THE_WAY_DELIVERY = new Set(['picked_up', 'en_route_to_dropoff']);

export type OrderSlaFlags = {
  slaBreach: boolean;
  delayed: boolean;
  dispatchIssue: boolean;
};

export function computeOrderSlaFlags(
  order: OpsLiveOrderSnapshot,
  delivery: OpsLiveDeliverySnapshot | null | undefined,
  nowMs: number = Date.now()
): OrderSlaFlags {
  const es = order.engine_status ?? '';
  const stage = mapEngineStatusToPublicStage(order.engine_status);

  let slaBreach = false;

  if (COOKING_ENGINES.has(es) && order.prep_started_at) {
    const m = minutesSince(order.prep_started_at, nowMs);
    if (m !== null && m > COOKING_SLA_MINUTES) slaBreach = true;
  }

  if (DRIVER_WAIT_ENGINES.has(es) && order.ready_at) {
    const m = minutesSince(order.ready_at, nowMs);
    if (m !== null && m > DRIVER_WAIT_SLA_MINUTES) slaBreach = true;
  }

  if (delivery && ON_THE_WAY_DELIVERY.has(delivery.status)) {
    const anchor = delivery.updated_at;
    const m = minutesSince(anchor, nowMs);
    if (m !== null && m > ON_THE_WAY_SLA_MINUTES) slaBreach = true;
  }

  const delayed =
    stage === PublicOrderStage.ON_THE_WAY &&
    !!delivery?.estimated_dropoff_at &&
    Date.parse(delivery.estimated_dropoff_at) < nowMs;

  const dispatchIssue =
    !!delivery?.escalated_to_ops || (delivery?.assignment_attempts_count ?? 0) > 2;

  return { slaBreach, delayed, dispatchIssue };
}
