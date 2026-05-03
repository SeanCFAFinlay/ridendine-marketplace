'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient, orderChannel } from '@ridendine/db';

export interface UseOrderStreamOptions {
  orderId: string;
  initialPublicStage?: string | null;
  initialEtaPickupAt?: string | null;
  initialEtaDropoffAt?: string | null;
  initialProgressPct?: number | null;
  initialRemainingSeconds?: number | null;
  initialRoutePolyline?: string | null;
  /** Legacy `orders.status` — used only if `public_stage` is missing from poll response */
  initialLegacyStatus?: string | null;
  pollIntervalMs?: number;
}

function numOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function applyBroadcastPayload(
  p: Record<string, unknown>,
  setters: {
    setStage: (s: string | null) => void;
    setEtaPickupAt: (s: string | null) => void;
    setEtaDropoffAt: (s: string | null) => void;
    setProgressPct: (n: number | null) => void;
    setRemainingSeconds: (n: number | null) => void;
    setRoutePolyline: (s: string | null) => void;
    setLegacyStatus: (s: string | null) => void;
  }
): void {
  if (typeof p.public_stage === 'string') setters.setStage(p.public_stage);
  if (typeof p.eta_pickup_at === 'string') setters.setEtaPickupAt(p.eta_pickup_at);
  if (p.eta_pickup_at === null) setters.setEtaPickupAt(null);
  if (typeof p.eta_dropoff_at === 'string') setters.setEtaDropoffAt(p.eta_dropoff_at);
  if (p.eta_dropoff_at === null) setters.setEtaDropoffAt(null);
  const pct = numOrNull(p.route_progress_pct);
  if (pct !== null) setters.setProgressPct(pct);
  const rem = numOrNull(p.route_remaining_seconds);
  if (rem !== null) setters.setRemainingSeconds(rem);
  if (typeof p.route_to_dropoff_polyline === 'string')
    setters.setRoutePolyline(p.route_to_dropoff_polyline);
  if (p.route_to_dropoff_polyline === null) setters.setRoutePolyline(null);
}

/**
 * Customer-safe order realtime: `order:{orderId}` + `order_update` (Phase 2).
 * Polling runs only as fallback while realtime is disconnected.
 */
export function useOrderStream(options: UseOrderStreamOptions) {
  const {
    orderId,
    initialPublicStage,
    initialEtaPickupAt,
    initialEtaDropoffAt,
    initialProgressPct,
    initialRemainingSeconds,
    initialRoutePolyline,
    initialLegacyStatus,
    pollIntervalMs = 30000,
  } = options;

  const [stage, setStage] = useState<string | null>(initialPublicStage ?? null);
  const [etaPickupAt, setEtaPickupAt] = useState<string | null>(initialEtaPickupAt ?? null);
  const [etaDropoffAt, setEtaDropoffAt] = useState<string | null>(initialEtaDropoffAt ?? null);
  const [progressPct, setProgressPct] = useState<number | null>(initialProgressPct ?? null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    initialRemainingSeconds ?? null
  );
  const [routePolyline, setRoutePolyline] = useState<string | null>(initialRoutePolyline ?? null);
  const [legacyStatus, setLegacyStatus] = useState<string | null>(initialLegacyStatus ?? null);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = useMemo(() => createBrowserClient(), []);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const setters = useMemo(
    () => ({
      setStage,
      setEtaPickupAt,
      setEtaDropoffAt,
      setProgressPct,
      setRemainingSeconds,
      setRoutePolyline,
      setLegacyStatus,
    }),
    []
  );

  const pollOnce = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        setError(`Poll failed (${res.status})`);
        return;
      }
      const json = (await res.json()) as {
        data?: {
          tracking?: Record<string, unknown>;
          order?: {
            public_stage?: string | null;
            status?: string;
          };
        };
      };
      const tr = json.data?.tracking;
      if (tr) {
        applyBroadcastPayload(tr, setters);
        setError(null);
      }
      const order = json.data?.order;
      if (order?.public_stage) {
        setStage(order.public_stage);
        setError(null);
      } else if (order?.status) {
        setLegacyStatus(order.status);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Poll error');
    }
  }, [orderId, setters]);

  const pollOnceRef = useRef(pollOnce);
  pollOnceRef.current = pollOnce;

  const startPoll = useCallback(() => {
    clearPoll();
    pollRef.current = setInterval(() => {
      void pollOnceRef.current();
    }, pollIntervalMs);
  }, [clearPoll, pollIntervalMs]);

  useEffect(() => {
    if (!orderId || !supabase) return;

    const ch = supabase
      .channel(orderChannel(orderId))
      .on(
        'broadcast',
        { event: 'order_update' },
        (msg: { payload?: Record<string, unknown> }) => {
          const payload = msg.payload;
          if (payload && typeof payload === 'object') {
            applyBroadcastPayload(payload, setters);
            setError(null);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
          clearPoll();
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsLive(false);
          setError('Realtime disconnected; using periodic refresh.');
          startPoll();
          void pollOnceRef.current();
        }
      });

    return () => {
      clearPoll();
      void supabase.removeChannel(ch);
    };
  }, [orderId, supabase, clearPoll, startPoll, setters]);

  return {
    stage,
    etaPickupAt,
    etaDropoffAt,
    progressPct,
    remainingSeconds,
    routePolyline,
    legacyStatus,
    isLive,
    error,
    refresh: pollOnce,
  };
}
