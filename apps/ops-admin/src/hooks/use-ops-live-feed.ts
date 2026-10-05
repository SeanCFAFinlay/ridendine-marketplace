'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createBrowserClient, opsLiveBoardChannel, parseOrdersRealtimeRow } from '@ridendine/db';
import { mapEngineStatusToPublicStage, PublicOrderStage } from '@ridendine/types';
import type { DriverReadinessSignal } from '@ridendine/types';
import type {
  OpsLiveBoardPressure,
  OpsLiveChefSnapshot,
  OpsLiveDriverSnapshot,
  OpsLiveOrderSnapshot,
} from '@/lib/ops-live-feed-types';
import {
  buildOpsDriverReadinessSignal,
  OPS_ACTIVE_DELIVERY_STATUSES,
} from '@/lib/driver-readiness';
import { createEmptyLiveFeedState, liveFeedReducer, type LiveFeedAction } from '@/lib/ops-live-feed-reducer';

const IN_FLIGHT_DELIVERY: ReadonlySet<string> = new Set(OPS_ACTIVE_DELIVERY_STATUSES);

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
  readiness: DriverReadinessSignal;
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

export function buildOpsLiveDriverViews(input: {
  orders: Iterable<OpsLiveOrderSnapshot>;
  drivers: Iterable<OpsLiveDriverSnapshot>;
  now?: Date;
}): OpsLiveDriverView[] {
  const now = input.now ?? new Date();
  const counts = new Map<string, { n: number; orderId: string | null; deliveryId: string | null }>();
  for (const o of input.orders) {
    const d = o.delivery;
    if (!d?.driver_id || !IN_FLIGHT_DELIVERY.has(d.status)) continue;
    const cur = counts.get(d.driver_id) ?? { n: 0, orderId: null, deliveryId: null };
    cur.n += 1;
    cur.orderId = o.id;
    cur.deliveryId = d.id;
    counts.set(d.driver_id, cur);
  }

  return [...input.drivers].map((d) => {
    const c = counts.get(d.id);
    const p = d.presence;
    const lat = p?.current_lat ?? p?.last_location_lat ?? null;
    const lng = p?.current_lng ?? p?.last_location_lng ?? null;
    const lastPing =
      p?.last_location_update ?? p?.last_location_at ?? p?.updated_at ?? null;
    const activeDeliveryCount = c?.n ?? 0;
    return {
      id: d.id,
      displayName: `${d.first_name} ${d.last_name}`.trim(),
      driverRowStatus: d.driver_status,
      presenceStatus: p?.status ?? 'offline',
      activeDeliveryCount,
      lastPingAt: lastPing,
      currentDeliveryOrderId: c?.orderId ?? null,
      currentDeliveryId: c?.deliveryId ?? null,
      lat,
      lng,
      readiness: buildOpsDriverReadinessSignal({
        approvalStatus: d.driver_status,
        presenceStatus: p?.status ?? 'offline',
        lastLocationAt: lastPing,
        activeDeliveryCount,
        payoutConnected: d.payoutConnected ?? false,
        complianceOpenItems: d.complianceOpenItems ?? 0,
        now,
      }),
    };
  });
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSnapshotError, setLastSnapshotError] = useState<string | null>(null);
  const supabaseRef = useRef(createBrowserClient());
  const fallbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/live-board', { credentials: 'include' });
      const body = (await res.json()) as { success?: boolean; data?: SnapshotResponse; error?: string };
      if (!res.ok || body.success === false) {
        throw new Error(body.error || `Snapshot fetch failed (${res.status})`);
      }
      const data = body.data;
      if (!data) throw new Error('Snapshot response was missing data');
      setPressure(data.pressure);
      dispatch({
        type: 'HYDRATE',
        payload: { orders: data.orders, drivers: data.drivers, chefs: data.chefs },
      });
      setError(null);
      setLastSnapshotError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load live board snapshot';
      setError(message);
      setLastSnapshotError(message);
    } finally {
      setLoading(false);
    }
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
    return buildOpsLiveDriverViews({
      orders: state.ordersById.values(),
      drivers: state.driversById.values(),
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
    loading,
    error,
    lastSnapshotError,
    realtimeConnected,
    refetch: fetchSnapshot,
  };
}

function ts(iso: string): number {
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}
