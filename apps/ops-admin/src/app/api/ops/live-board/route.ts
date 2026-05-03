import { createAdminClient } from '@ridendine/db';
import { mapEngineStatusToPublicStage, PublicOrderStage } from '@ridendine/types';
import {
  getEngine,
  getOpsActorContext,
  guardPlatformApi,
  successResponse,
  errorResponse,
} from '@/lib/engine';
import type {
  OpsLiveChefSnapshot,
  OpsLiveDeliverySnapshot,
  OpsLiveDriverSnapshot,
  OpsLiveOrderSnapshot,
  OpsLiveBoardPressure,
} from '@/lib/ops-live-feed-types';

export const dynamic = 'force-dynamic';

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? x[0] ?? null : x;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function mapOrderRow(
  row: Record<string, unknown>,
  delivery: OpsLiveDeliverySnapshot | null
): OpsLiveOrderSnapshot | null {
  const id = row.id as string;
  const storefront = one(row.storefront as Record<string, unknown> | Record<string, unknown>[] | null);
  const customer = one(row.customer as Record<string, unknown> | Record<string, unknown>[] | null);
  const chefName = (storefront?.name as string | undefined) ?? '—';
  const cfn = (customer?.first_name as string | undefined) ?? '';
  const cln = (customer?.last_name as string | undefined) ?? '';
  const customerName = `${cfn} ${cln}`.trim() || '—';

  return {
    id,
    order_number: row.order_number as string,
    engine_status: (row.engine_status as string | null) ?? null,
    status: row.status as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    estimated_ready_at: (row.estimated_ready_at as string | null) ?? null,
    ready_at: (row.ready_at as string | null) ?? null,
    prep_started_at: (row.prep_started_at as string | null) ?? null,
    storefront_id: row.storefront_id as string,
    customer_id: row.customer_id as string,
    chef_name: chefName,
    customer_name: customerName,
    delivery,
  };
}

function mapDeliveryNested(row: Record<string, unknown> | null): OpsLiveDeliverySnapshot | null {
  if (!row || typeof row !== 'object') return null;
  const id = row.id as string;
  if (!id) return null;
  return {
    id,
    order_id: row.order_id as string,
    status: row.status as string,
    driver_id: (row.driver_id as string | null) ?? null,
    updated_at: row.updated_at as string,
    estimated_dropoff_at: (row.estimated_dropoff_at as string | null) ?? null,
    escalated_to_ops: (row.escalated_to_ops as boolean | null) ?? null,
    assignment_attempts_count: (row.assignment_attempts_count as number | null) ?? null,
    pickup_lat: (row.pickup_lat as number | null) ?? null,
    pickup_lng: (row.pickup_lng as number | null) ?? null,
    dropoff_lat: (row.dropoff_lat as number | null) ?? null,
    dropoff_lng: (row.dropoff_lng as number | null) ?? null,
    pickup_address: (row.pickup_address as string) ?? '',
    dropoff_address: (row.dropoff_address as string) ?? '',
    route_polyline: (row.route_polyline as string | null | undefined) ?? undefined,
  };
}

/**
 * GET /api/ops/live-board
 * Initial snapshot for the live operations board (admin only).
 */
export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'dashboard_read');
  if (denied) return denied;

  const admin = createAdminClient();
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

  try {
    const [ordersRes, driversRes, chefsRes, dash] = await Promise.all([
      admin
        .from('orders')
        .select(
          `
          id, order_number, engine_status, status, created_at, updated_at, completed_at,
          estimated_ready_at, ready_at, prep_started_at, storefront_id, customer_id,
          storefront:chef_storefronts ( id, name ),
          customer:customers ( first_name, last_name ),
          deliveries (
            id, order_id, status, driver_id, updated_at,
            estimated_dropoff_at, escalated_to_ops, assignment_attempts_count,
            pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
            pickup_address, dropoff_address
          )
        `
        )
        .gte('updated_at', since)
        .order('updated_at', { ascending: false })
        .limit(400),
      admin
        .from('drivers')
        .select(
          `
          id, first_name, last_name, status, updated_at,
          driver_presence (
            status, updated_at,
            current_lat, current_lng,
            last_location_lat, last_location_lng,
            last_location_at, last_location_update
          )
        `
        )
        .eq('status', 'approved'),
      admin
        .from('chef_storefronts')
        .select(
          `
          id, name, storefront_state, is_paused,
          current_queue_size, max_queue_size, is_overloaded,
          estimated_prep_time_max, updated_at,
          chef_profiles ( display_name )
        `
        )
        .eq('is_active', true)
        .limit(300),
      getEngine().ops.getDashboard(),
    ]);

    if (ordersRes.error) {
      return errorResponse('QUERY_FAILED', ordersRes.error.message, 500);
    }

    const todayStart = startOfTodayIso();
    const ordersRaw = (ordersRes.data ?? []) as Record<string, unknown>[];
    const orders: OpsLiveOrderSnapshot[] = [];

    for (const row of ordersRaw) {
      const del = mapDeliveryNested(one(row.deliveries as Record<string, unknown> | Record<string, unknown>[] | null));
      const mapped = mapOrderRow(row, del);
      if (!mapped) continue;
      const stage = mapEngineStatusToPublicStage(mapped.engine_status);
      if (stage === PublicOrderStage.DELIVERED) {
        const doneAt = (row.completed_at as string | undefined) || mapped.updated_at;
        if (doneAt < todayStart) continue;
      }
      orders.push(mapped);
    }

    const driversData = (driversRes.error ? [] : driversRes.data ?? []) as Record<string, unknown>[];
    const drivers: OpsLiveDriverSnapshot[] = driversData.map((d) => {
      const p = one(d.driver_presence as Record<string, unknown> | Record<string, unknown>[] | null);
      return {
        id: d.id as string,
        first_name: d.first_name as string,
        last_name: d.last_name as string,
        driver_status: d.status as string,
        updated_at: d.updated_at as string,
        presence: p
          ? {
              status: (p.status as string) ?? 'offline',
              updated_at: (p.updated_at as string) ?? (d.updated_at as string),
              current_lat: (p.current_lat as number | null) ?? null,
              current_lng: (p.current_lng as number | null) ?? null,
              last_location_lat: (p.last_location_lat as number | null) ?? null,
              last_location_lng: (p.last_location_lng as number | null) ?? null,
              last_location_at: (p.last_location_at as string | null) ?? null,
              last_location_update: (p.last_location_update as string | null) ?? null,
            }
          : null,
      };
    });

    const chefsData = (chefsRes.error ? [] : chefsRes.data ?? []) as Record<string, unknown>[];
    const chefs: OpsLiveChefSnapshot[] = chefsData.map((c) => {
      const prof = one(c.chef_profiles as Record<string, unknown> | Record<string, unknown>[] | null);
      const dn = (prof?.display_name as string | undefined) ?? '';
      return {
        id: c.id as string,
        name: c.name as string,
        chef_display_name: dn || (c.name as string),
        storefront_state: (c.storefront_state as string | null) ?? null,
        is_paused: (c.is_paused as boolean | null) ?? null,
        current_queue_size: (c.current_queue_size as number | null) ?? null,
        max_queue_size: (c.max_queue_size as number | null) ?? null,
        is_overloaded: (c.is_overloaded as boolean | null) ?? null,
        estimated_prep_time_max: (c.estimated_prep_time_max as number) ?? 60,
        updated_at: c.updated_at as string,
      };
    });

    const pressure: OpsLiveBoardPressure = {
      openExceptions: dash.openExceptions,
      slaBreaches: dash.slaBreaches,
      pendingDispatch: dash.pendingDispatch,
      deliveryEscalations: dash.deliveryEscalations,
    };

    return successResponse({ orders, drivers, chefs, pressure });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return errorResponse('LIVE_BOARD_FAILED', msg, 500);
  }
}
