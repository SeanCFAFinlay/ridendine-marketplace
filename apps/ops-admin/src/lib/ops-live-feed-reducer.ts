import type {
  OpsLiveChefSnapshot,
  OpsLiveDeliverySnapshot,
  OpsLiveDriverSnapshot,
  OpsLiveOrderSnapshot,
} from './ops-live-feed-types';

export type LiveFeedState = {
  ordersById: Map<string, OpsLiveOrderSnapshot>;
  driversById: Map<string, OpsLiveDriverSnapshot>;
  chefsById: Map<string, OpsLiveChefSnapshot>;
  lastEventAt: number;
};

export type LiveFeedAction =
  | { type: 'HYDRATE'; payload: { orders: OpsLiveOrderSnapshot[]; drivers: OpsLiveDriverSnapshot[]; chefs: OpsLiveChefSnapshot[] } }
  | { type: 'ORDER_PATCH'; row: Record<string, unknown> }
  | { type: 'DELIVERY_PATCH'; row: Record<string, unknown> }
  | { type: 'DRIVER_PRESENCE_PATCH'; row: Record<string, unknown> }
  | { type: 'CHEF_PATCH'; row: Record<string, unknown> }
  | { type: 'BROADCAST_ORDER_HINT'; orderId: string; engine_status?: string | null; updated_at?: string };

const initialState = (): LiveFeedState => ({
  ordersById: new Map(),
  driversById: new Map(),
  chefsById: new Map(),
  lastEventAt: 0,
});

function tsMs(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function isIncomingStale(existingIso: string | undefined, incomingIso: string | undefined): boolean {
  if (!incomingIso) return false;
  if (!existingIso) return false;
  return tsMs(incomingIso) < tsMs(existingIso);
}

function pickStr(r: Record<string, unknown>, k: string): string | undefined {
  const v = r[k];
  return typeof v === 'string' ? v : undefined;
}

function pickStrNull(r: Record<string, unknown>, k: string): string | null | undefined {
  const v = r[k];
  if (v === null) return null;
  return typeof v === 'string' ? v : undefined;
}

function pickNumNull(r: Record<string, unknown>, k: string): number | null | undefined {
  const v = r[k];
  if (v === null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function pickBoolNull(r: Record<string, unknown>, k: string): boolean | null | undefined {
  const v = r[k];
  if (v === null) return null;
  if (typeof v === 'boolean') return v;
  return undefined;
}

function mergeDeliveryFromRow(row: Record<string, unknown>): OpsLiveDeliverySnapshot | null {
  const id = pickStr(row, 'id');
  const order_id = pickStr(row, 'order_id');
  const status = pickStr(row, 'status');
  const updated_at = pickStr(row, 'updated_at');
  if (!id || !order_id || !status || !updated_at) return null;
  const driver_id = pickStrNull(row, 'driver_id') ?? null;
  const pickup_address = pickStr(row, 'pickup_address') ?? '';
  const dropoff_address = pickStr(row, 'dropoff_address') ?? '';
  return {
    id,
    order_id,
    status,
    driver_id,
    updated_at,
    estimated_dropoff_at: pickStrNull(row, 'estimated_dropoff_at') ?? null,
    escalated_to_ops: pickBoolNull(row, 'escalated_to_ops') ?? null,
    assignment_attempts_count: pickNumNull(row, 'assignment_attempts_count') ?? null,
    pickup_lat: pickNumNull(row, 'pickup_lat') ?? null,
    pickup_lng: pickNumNull(row, 'pickup_lng') ?? null,
    dropoff_lat: pickNumNull(row, 'dropoff_lat') ?? null,
    dropoff_lng: pickNumNull(row, 'dropoff_lng') ?? null,
    pickup_address,
    dropoff_address,
    route_polyline: pickStrNull(row, 'route_polyline') ?? undefined,
  };
}

function patchOrderFromRow(
  existing: OpsLiveOrderSnapshot | undefined,
  row: Record<string, unknown>
): OpsLiveOrderSnapshot | null {
  const id = pickStr(row, 'id');
  if (!id) return null;
  const incomingUpdated = pickStr(row, 'updated_at');
  if (existing && isIncomingStale(existing.updated_at, incomingUpdated)) {
    return existing;
  }

  const order_number = pickStr(row, 'order_number') ?? existing?.order_number ?? '';
  const engine_status =
    row.engine_status === null || typeof row.engine_status === 'string'
      ? (row.engine_status as string | null)
      : (existing?.engine_status ?? null);
  const status = pickStr(row, 'status') ?? existing?.status ?? '';
  const created_at = pickStr(row, 'created_at') ?? existing?.created_at ?? new Date(0).toISOString();
  const updated_at = incomingUpdated ?? existing?.updated_at ?? created_at;
  const estimated_ready_at =
    pickStrNull(row, 'estimated_ready_at') !== undefined
      ? (pickStrNull(row, 'estimated_ready_at') as string | null)
      : (existing?.estimated_ready_at ?? null);
  const ready_at =
    pickStrNull(row, 'ready_at') !== undefined
      ? (pickStrNull(row, 'ready_at') as string | null)
      : (existing?.ready_at ?? null);
  const prep_started_at =
    pickStrNull(row, 'prep_started_at') !== undefined
      ? (pickStrNull(row, 'prep_started_at') as string | null)
      : (existing?.prep_started_at ?? null);
  const storefront_id = pickStr(row, 'storefront_id') ?? existing?.storefront_id ?? '';
  const customer_id = pickStr(row, 'customer_id') ?? existing?.customer_id ?? '';

  return {
    id,
    order_number,
    engine_status,
    status,
    created_at,
    updated_at,
    estimated_ready_at,
    ready_at,
    prep_started_at,
    storefront_id,
    customer_id,
    chef_name: existing?.chef_name ?? '—',
    customer_name: existing?.customer_name ?? '—',
    delivery: existing?.delivery ?? null,
  };
}

export function liveFeedReducer(state: LiveFeedState, action: LiveFeedAction): LiveFeedState {
  const now = Date.now();
  switch (action.type) {
    case 'HYDRATE': {
      const ordersById = new Map<string, OpsLiveOrderSnapshot>();
      for (const o of action.payload.orders) ordersById.set(o.id, o);
      const driversById = new Map<string, OpsLiveDriverSnapshot>();
      for (const d of action.payload.drivers) driversById.set(d.id, d);
      const chefsById = new Map<string, OpsLiveChefSnapshot>();
      for (const c of action.payload.chefs) chefsById.set(c.id, c);
      return { ordersById, driversById, chefsById, lastEventAt: now };
    }
    case 'ORDER_PATCH': {
      const oid = pickStr(action.row, 'id');
      if (!oid) return state;
      const next = new Map(state.ordersById);
      const merged = patchOrderFromRow(next.get(oid), action.row);
      if (!merged) return { ...state, lastEventAt: now };
      next.set(merged.id, merged);
      return { ...state, ordersById: next, lastEventAt: now };
    }
    case 'DELIVERY_PATCH': {
      const delivery = mergeDeliveryFromRow(action.row);
      if (!delivery) return state;
      const next = new Map(state.ordersById);
      const orderId = delivery.order_id;
      const existing = next.get(orderId);
      if (!existing) return { ...state, lastEventAt: now };
      if (existing.delivery && isIncomingStale(existing.delivery.updated_at, delivery.updated_at)) {
        return { ...state, lastEventAt: now };
      }
      next.set(orderId, { ...existing, delivery });
      return { ...state, ordersById: next, lastEventAt: now };
    }
    case 'DRIVER_PRESENCE_PATCH': {
      const driverId = pickStr(action.row, 'driver_id');
      if (!driverId) return state;
      const driver = state.driversById.get(driverId);
      if (!driver) return { ...state, lastEventAt: now };
      const pUpdated = pickStr(action.row, 'updated_at');
      if (
        driver.presence &&
        pUpdated &&
        isIncomingStale(driver.presence.updated_at, pUpdated)
      ) {
        return state;
      }
      const nextDrivers = new Map(state.driversById);
      nextDrivers.set(driverId, {
        ...driver,
        presence: {
          status: pickStr(action.row, 'status') ?? driver.presence?.status ?? 'offline',
          updated_at: pUpdated ?? driver.presence?.updated_at ?? driver.updated_at,
          current_lat: pickNumNull(action.row, 'current_lat') ?? driver.presence?.current_lat ?? null,
          current_lng: pickNumNull(action.row, 'current_lng') ?? driver.presence?.current_lng ?? null,
          last_location_lat:
            pickNumNull(action.row, 'last_location_lat') ?? driver.presence?.last_location_lat ?? null,
          last_location_lng:
            pickNumNull(action.row, 'last_location_lng') ?? driver.presence?.last_location_lng ?? null,
          last_location_at: pickStrNull(action.row, 'last_location_at') ?? driver.presence?.last_location_at ?? null,
          last_location_update:
            pickStrNull(action.row, 'last_location_update') ?? driver.presence?.last_location_update ?? null,
        },
      });
      return { ...state, driversById: nextDrivers, lastEventAt: now };
    }
    case 'CHEF_PATCH': {
      const id = pickStr(action.row, 'id');
      if (!id) return state;
      const existing = state.chefsById.get(id);
      const rowUpdated = pickStr(action.row, 'updated_at');
      if (existing && isIncomingStale(existing.updated_at, rowUpdated)) return state;
      const name = pickStr(action.row, 'name') ?? existing?.name ?? '';
      const merged: OpsLiveChefSnapshot = {
        id,
        name,
        chef_display_name: existing?.chef_display_name ?? name,
        storefront_state:
          pickStrNull(action.row, 'storefront_state') !== undefined
            ? (pickStrNull(action.row, 'storefront_state') as string | null)
            : (existing?.storefront_state ?? null),
        is_paused:
          pickBoolNull(action.row, 'is_paused') !== undefined
            ? (pickBoolNull(action.row, 'is_paused') as boolean | null)
            : (existing?.is_paused ?? null),
        current_queue_size:
          pickNumNull(action.row, 'current_queue_size') !== undefined
            ? (pickNumNull(action.row, 'current_queue_size') as number | null)
            : (existing?.current_queue_size ?? null),
        max_queue_size:
          pickNumNull(action.row, 'max_queue_size') !== undefined
            ? (pickNumNull(action.row, 'max_queue_size') as number | null)
            : (existing?.max_queue_size ?? null),
        is_overloaded:
          pickBoolNull(action.row, 'is_overloaded') !== undefined
            ? (pickBoolNull(action.row, 'is_overloaded') as boolean | null)
            : (existing?.is_overloaded ?? null),
        estimated_prep_time_max:
          (pickNumNull(action.row, 'estimated_prep_time_max') as number | undefined) ??
          existing?.estimated_prep_time_max ??
          60,
        updated_at: rowUpdated ?? existing?.updated_at ?? new Date(0).toISOString(),
      };
      const next = new Map(state.chefsById);
      next.set(id, merged);
      return { ...state, chefsById: next, lastEventAt: now };
    }
    case 'BROADCAST_ORDER_HINT': {
      const existing = state.ordersById.get(action.orderId);
      if (!existing) return { ...state, lastEventAt: now };
      if (action.updated_at && isIncomingStale(existing.updated_at, action.updated_at)) {
        return state;
      }
      const next = new Map(state.ordersById);
      next.set(action.orderId, {
        ...existing,
        engine_status: action.engine_status !== undefined ? action.engine_status : existing.engine_status,
        updated_at: action.updated_at ?? existing.updated_at,
      });
      return { ...state, ordersById: next, lastEventAt: now };
    }
    default:
      return state;
  }
}

export function createEmptyLiveFeedState(): LiveFeedState {
  return initialState();
}
