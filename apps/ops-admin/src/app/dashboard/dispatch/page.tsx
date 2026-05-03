'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { DispatchCommandCenterReadModel, DispatchQueueItem } from '@ridendine/types';
import { Button, Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DeliveryMap } from '@/components/map/delivery-map';

function formatEtaMinutes(distanceKm: number | null | undefined) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return '—';
  const mins = Math.max(1, Math.round((distanceKm / 30) * 60));
  return `~${mins} min`;
}

type OfferHistoryRow = {
  id: string;
  driver_id: string;
  response: string;
  offered_at: string;
  responded_at?: string | null;
  responseTimeMs?: number | null;
  successRate?: number;
};

export default function DispatchConsolePage() {
  const [board, setBoard] = useState<DispatchCommandCenterReadModel | undefined>(undefined);
  const [history, setHistory] = useState<OfferHistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [boardRes, histRes] = await Promise.all([
        fetch('/api/engine/dispatch'),
        fetch('/api/engine/dispatch/offer-history'),
      ]);
      const boardJson = await boardRes.json();
      const histJson = await histRes.json();
      if (!boardRes.ok || !boardJson.success) {
        setBoard(undefined);
        setError(boardJson.error?.message || 'Failed to load dispatch board');
        return;
      }
      if (histRes.ok && histJson.success && histJson.data?.attempts) {
        setHistory(histJson.data.attempts as OfferHistoryRow[]);
      }
      setBoard(boardJson.data as DispatchCommandCenterReadModel);
      setError(null);
    } catch {
      setError('Network error loading dispatch');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [load]);

  const mapDeliveries = useMemo(() => {
    if (!board) return [];
    return board.activeQueue.map((d: DispatchQueueItem) => ({
      id: d.deliveryId,
      order_number: d.orderNumber,
      status: d.status,
      pickup_lat: d.pickupLat ?? null,
      pickup_lng: d.pickupLng ?? null,
      pickup_address: d.pickupAddress,
      dropoff_lat: d.dropoffLat ?? null,
      dropoff_lng: d.dropoffLng ?? null,
      dropoff_address: d.dropoffAddress,
      driver_name: d.assignedDriver?.name,
      route_polyline: d.routeToDropoffPolyline ?? null,
    }));
  }, [board]);

  async function forceAssign(deliveryId: string, driverId: string) {
    const reason = window.prompt('Reason for force assign (required)', 'Manual dispatch override');
    if (!reason || reason.trim().length < 3) return;
    setBusyId(deliveryId);
    try {
      const res = await fetch('/api/engine/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force_assign',
          deliveryId,
          driverId,
          reason: reason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        window.alert(json.error?.message || json.message || 'Force assign failed');
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function holdDelivery(deliveryId: string) {
    const note = window.prompt('Hold note (min 3 chars)', 'Dispatch hold — do not auto-offer');
    if (!note || note.trim().length < 3) return;
    setBusyId(deliveryId);
    try {
      await fetch('/api/engine/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_ops_note',
          deliveryId,
          note: note.trim(),
        }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (board === undefined && !error) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[40vh] items-center justify-center text-gray-400">Loading dispatch…</div>
      </DashboardLayout>
    );
  }

  if (error && board === undefined) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg p-6 text-red-400">{error}</div>
      </DashboardLayout>
    );
  }

  if (!board) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1600px] space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dispatch console</h1>
          <p className="mt-1 text-sm text-gray-400">
            Auto-dispatch queue, active routes, and last 24h offer outcomes. Refreshes every 30s.
          </p>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-gray-800 bg-[#16213e] p-4 text-gray-100 lg:col-span-1">
            <h2 className="mb-3 text-lg font-semibold text-white">Awaiting driver</h2>
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              {board?.pendingQueue?.length ? (
                board.pendingQueue.map((item) => (
                  <div key={item.deliveryId} className="rounded-lg border border-gray-700 p-3 text-sm">
                    <div className="font-medium text-white">
                      #{item.orderNumber} · {item.storefrontName}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{item.pickupAddress}</p>
                    <p className="text-xs text-gray-500">Attempts: {item.assignmentAttemptsCount}</p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-gray-300">Ranked drivers (ETA)</p>
                      {item.topCandidates.map((c) => (
                        <div
                          key={c.driverId}
                          className="flex items-center justify-between rounded bg-gray-900/60 px-2 py-1 text-xs"
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="shrink-0 text-gray-400">{formatEtaMinutes(c.distanceKm)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.topCandidates[0] && (
                        <Button
                          size="sm"
                          className="bg-[#E85D26] text-white"
                          disabled={busyId === item.deliveryId}
                          onClick={() => forceAssign(item.deliveryId, item.topCandidates[0]!.driverId)}
                        >
                          Force assign #1
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.deliveryId}
                        onClick={() => holdDelivery(item.deliveryId)}
                      >
                        Hold
                      </Button>
                      {item.topCandidates[0] && (
                        <Link
                          href={`/dashboard/drivers/${item.topCandidates[0]!.driverId}`}
                          className="inline-flex items-center rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-200 hover:bg-gray-800"
                        >
                          Contact
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No deliveries pending assignment.</p>
              )}
            </div>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-4 text-gray-100 lg:col-span-1">
            <h2 className="mb-3 text-lg font-semibold text-white">Active deliveries</h2>
            <div className="h-[420px] overflow-hidden rounded-lg border border-gray-800">
              {mapDeliveries.length ? (
                <DeliveryMap deliveries={mapDeliveries} className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  No active deliveries in queue.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-4 text-gray-100 lg:col-span-1">
            <h2 className="mb-3 text-lg font-semibold text-white">Offer history (24h)</h2>
            <div className="max-h-[70vh] overflow-x-auto overflow-y-auto text-xs">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-[#16213e] text-gray-400">
                  <tr>
                    <th className="p-2">Driver</th>
                    <th className="p-2">Response</th>
                    <th className="p-2">Δ ms</th>
                    <th className="p-2">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-t border-gray-800">
                      <td className="p-2 font-mono text-[11px] text-gray-300">{row.driver_id.slice(0, 8)}…</td>
                      <td className="p-2">{row.response}</td>
                      <td className="p-2 text-gray-400">
                        {row.responseTimeMs != null ? row.responseTimeMs : '—'}
                      </td>
                      <td className="p-2 text-gray-400">
                        {row.successRate != null ? `${Math.round(row.successRate * 100)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!history.length && <p className="p-3 text-gray-500">No attempts in the last 24 hours.</p>}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
