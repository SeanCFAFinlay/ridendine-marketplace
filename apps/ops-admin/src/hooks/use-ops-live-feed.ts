'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createBrowserClient, opsLiveBoardChannel, parseOrdersRealtimeRow } from '@ridendine/db';
import { mapEngineStatusToPublicStage, PublicOrderStage } from '@ridendine/types';
import type {
  OpsLiveBoardPressure,
  OpsLiveChefSnapshot,
  OpsLiveDriverSnapshot,
  OpsLiveOrderSnapshot,
} from '@/lib/ops-live-feed-types';
import { createEmptyLiveFeedState, liveFeedReducer, type LiveFeedAction } from '@/lib/ops-live-feed-reducer';

const IN_FLIGHT_DELIVERY = new Set([
  'assigned',
  'accepted',
  'en_route_to_pickup',
  'picked_up',
  'en_route_to_dropoff',
]);

export type OpsLiveDriverView = {
  id: string;
  displayName: string;
  driverRowStatus: string;
  presenceStatus: string;
  activeDeliveryCount: number;
  lastPingAt: string | null;
  currentDeliveryOrderId: string | null;
  currentDeliveryId: string | null;
  lat: number | null;
  lng: number | null;
};

export type OpsLiveChefView = OpsLiveChefSnapshot & {
  activeOrderCount: number;
  prepDelayWarning: boolean;
};

type SnapshotResponse = {
  orders: OpsLiveOrderSnapshot[];
  drivers: OpsLiveDriverSnapshot[];
  chefs: OpsLiveChefSnapshot[];
  pressure: OpsLiveBoardPressure;
};

function dispatchFromBroadcastPayload(payload: Record<string, unknown>): LiveFeedAction | null {
  const table = typeof payload.table === 'string' ? payload.table : null;
  const record = payload.record;
  if (!table || typeof record !== 'object' || record === null) return null;
  const row = record as Record<string, unknown>;
  if (table === 'orders') return { type: 'ORDER_PATCH', row };
  if (table === 'deliveries') return { type: 'DELIVERY_PATCH', row };
  if (table === 'driver_presence') return { type: 'DRIVER_PRESENCE_PATCH', row };
  if (table === 'chef_storefronts') return { type: 'CHEF_PATCH', row };
  return null;
}

export function useOpsLiveFeed() {
  const [state, dispatch] = useReducer(liveFeedReducer, undefined, createEmptyLiveFeedState);
  const [pressure, setPressure] = useState<OpsLiveBoardPressure | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const supabaseRef = useRef(createBrowserClient());
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSnapshot = useCallback(async () => {
    const res = await fetch('/api/ops/live-board', { credentials: 'include' });
    if (!res.ok) return;
    const body = (await res.json()) as { success?: boolean; data?: SnapshotResponse };
    const data = body.data;
    if (!data) return;
    setPressure(data.pressure);
    dispatch({
      type: 'HYDRATE',
      payload: { orders: data.orders, drivers: data.drivers, chefs: data.chefs },
    });
  }, []);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const clearFallback = () => {
      if (fallbackRef.current) {
        clearInterval(fallbackRef.current);
        fallbackRef.current = null;
      }
    };

    const startFallback = () => {
      clearFallback();
      fallbackRef.current = setInterval(() => {
        void fetchSnapshot();
      }, 60_000);
    };

    const ch = supabase
      .channel(opsLiveBoardChannel())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (payload.eventType === 'DELETE') return;
          const parsed = parseOrdersRealtimeRow(row);
          dispatch({ type: 'ORDER_PATCH', row: parsed ? { ...row, ...parsed } : row });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (payload.eventType === 'DELETE') return;
          dispatch({ type: 'DELIVERY_PATCH', row });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_presence' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (payload.eventType === 'DELETE') return;
          dispatch({ type: 'DRIVER_PRESENCE_PATCH', row });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chef_storefronts' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (payload.eventType === 'DELETE') return;
          dispatch({ type: 'CHEF_PATCH', row });
        }
      )
      .on('broadcast', { event: 'ops.live.patch' }, ({ payload }) => {
        const p = payload as Record<string, unknown>;
        const action = dispatchFromBroadcastPayload(p);
        if (action) dispatch(action);
      })
      .on('broadcast', { event: 'board.refresh' }, () => {
        void fetchSnapshot();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeConnected(true);
          clearFallback();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeConnected(false);
          startFallback();
        }
      });

    return () => {
      clearFallback();
      void supabase.removeChannel(ch);
    };
  }, [fetchSnapshot]);

  const orders = useMemo(() => {
    const list = [...state.ordersById.values()];
    list.sort((a, b) => ts(b.updated_at) - ts(a.updated_at));
    return list;
  }, [state.ordersById]);

  const drivers = useMemo((): OpsLiveDriverView[] => {
    const counts = new Map<string, { n: number; orderId: string | null; deliveryId: string | null }>();
    for (const o of state.ordersById.values()) {
      const d = o.delivery;
      if (!d?.driver_id || !IN_FLIGHT_DELIVERY.has(d.status)) continue;
      const cur = counts.get(d.driver_id) ?? { n: 0, orderId: null, deliveryId: null };
      cur.n += 1;
      cur.orderId = o.id;
      cur.deliveryId = d.id;
      counts.set(d.driver_id, cur);
    }

    return [...state.driversById.values()].map((d) => {
      const c = counts.get(d.id);
      const p = d.presence;
      const lat = p?.current_lat ?? p?.last_location_lat ?? null;
      const lng = p?.current_lng ?? p?.last_location_lng ?? null;
      const lastPing =
        p?.last_location_update ?? p?.last_location_at ?? p?.updated_at ?? null;
      return {
        id: d.id,
        displayName: `${d.first_name} ${d.last_name}`.trim(),
        driverRowStatus: d.driver_status,
        presenceStatus: p?.status ?? 'offline',
        activeDeliveryCount: c?.n ?? 0,
        lastPingAt: lastPing,
        currentDeliveryOrderId: c?.orderId ?? null,
        currentDeliveryId: c?.deliveryId ?? null,
        lat,
        lng,
      };
    });
  }, [state.driversById, state.ordersById]);

  const chefs = useMemo((): OpsLiveChefView[] => {
    const byStore = new Map<string, number>();
    for (const o of state.ordersById.values()) {
      const stage = mapEngineStatusToPublicStage(o.engine_status);
      if (
        stage === PublicOrderStage.DELIVERED ||
        stage === PublicOrderStage.CANCELLED ||
        stage === PublicOrderStage.REFUNDED
      ) {
        continue;
      }
      byStore.set(o.storefront_id, (byStore.get(o.storefront_id) ?? 0) + 1);
    }
    return [...state.chefsById.values()].map((c) => {
      const activeOrderCount = byStore.get(c.id) ?? 0;
      const q = c.current_queue_size ?? 0;
      const maxQ = c.max_queue_size ?? 0;
      const prepDelayWarning =
        !!c.is_overloaded || (maxQ > 0 && q >= Math.ceil(maxQ * 0.85));
      return { ...c, activeOrderCount, prepDelayWarning };
    });
  }, [state.chefsById, state.ordersById]);

  const lastEventAt = state.lastEventAt > 0 ? new Date(state.lastEventAt) : null;

  return {
    orders,
    drivers,
    chefs,
    lastEventAt,
    pressure,
    realtimeConnected,
    refetch: fetchSnapshot,
  };
}

function ts(iso: string): number {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}
