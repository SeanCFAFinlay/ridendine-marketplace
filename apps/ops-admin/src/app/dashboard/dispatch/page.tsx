'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { DispatchCommandCenterReadModel, DispatchQueueItem } from '@ridendine/types';
import { Button, Card, Modal, PageHeader, DataTable, EmptyState, StatusBadge } from '@ridendine/ui';
import type { ColumnDef } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DeliveryMap } from '@/components/map/delivery-map';
import { Clock, Truck, Users } from 'lucide-react';

function formatEtaMinutes(distanceKm: number | null | undefined) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return '—';
  const mins = Math.max(1, Math.round((distanceKm / 30) * 60));
  return `~${mins} min`;
}

type OfferHistoryRow = {
  id: string;
  driver_id: string;
  driver_name?: string;
  response: string;
  offered_at: string;
  responded_at?: string | null;
  responseTimeMs?: number | null;
  successRate?: number;
};

type PendingAction = {
  type: 'force_assign' | 'add_ops_note';
  deliveryId: string;
  driverId?: string;
};

export default function DispatchConsolePage() {
  const [board, setBoard] = useState<DispatchCommandCenterReadModel | undefined>(undefined);
  const [history, setHistory] = useState<OfferHistoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionReason, setActionReason] = useState('');

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

  async function forceAssign(deliveryId: string, driverId: string, reason: string) {
    if (!reason || reason.trim().length < 3) return;
    setBusyId(deliveryId);
    try {
      const res = await fetch('/api/engine/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force_assign', deliveryId, driverId, reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || json.message || 'Force assign failed');
        return;
      }
      setPendingAction(null);
      setActionReason('');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function holdDelivery(deliveryId: string, note: string) {
    if (!note || note.trim().length < 3) return;
    setBusyId(deliveryId);
    try {
      await fetch('/api/engine/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_ops_note', deliveryId, note: note.trim() }),
      });
      setPendingAction(null);
      setActionReason('');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const historyColumns: ColumnDef<OfferHistoryRow>[] = [
    {
      key: 'offered_at',
      header: 'Time',
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-gray-400">
          {new Date(row.offered_at).toLocaleTimeString()}
        </span>
      ),
    },
    {
      key: 'driver_name',
      header: 'Driver',
      cell: (row) => (
        <span className="font-medium text-gray-200">
          {row.driver_name ?? row.driver_id.slice(0, 8) + '…'}
        </span>
      ),
    },
    {
      key: 'response',
      header: 'Response',
      cell: (row) => (
        <StatusBadge
          status={row.response === 'accepted' ? 'success' : row.response === 'rejected' ? 'danger' : 'warning'}
          label={row.response}
        />
      ),
    },
    {
      key: 'responseTimeMs',
      header: 'Latency (ms)',
      sortable: true,
      cell: (row) => (
        <span className="text-gray-400">
          {row.responseTimeMs != null ? row.responseTimeMs : '—'}
        </span>
      ),
    },
    {
      key: 'successRate',
      header: 'Win %',
      sortable: true,
      cell: (row) => (
        <span className="text-gray-400">
          {row.successRate != null ? `${Math.round(row.successRate * 100)}%` : '—'}
        </span>
      ),
    },
  ];

  const isModalOpen = pendingAction !== null;

  const handleModalConfirm = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'force_assign' && pendingAction.driverId) {
      void forceAssign(pendingAction.deliveryId, pendingAction.driverId, actionReason);
    } else {
      void holdDelivery(pendingAction.deliveryId, actionReason);
    }
  };

  if (board === undefined && !error) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
          Loading dispatch…
        </div>
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

  if (!board) return null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1600px] space-y-6">
        <PageHeader
          title="Dispatch Console"
          subtitle="Auto-dispatch queue, active routes, and last 24h offer outcomes. Refreshes every 30s."
        />
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Pending queue */}
          <Card className="border-gray-800 bg-opsPanel p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-white">Awaiting Driver</h2>
              <span className="ml-auto rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                {board.pendingQueue?.length ?? 0}
              </span>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
              {board.pendingQueue?.length ? (
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
                          className="bg-[#E85D26] text-white hover:bg-[#d54d1a]"
                          disabled={busyId === item.deliveryId}
                          onClick={() => {
                            setActionReason('Manual dispatch override');
                            setPendingAction({
                              type: 'force_assign',
                              deliveryId: item.deliveryId,
                              driverId: item.topCandidates[0]!.driverId,
                            });
                          }}
                        >
                          Force assign #1
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.deliveryId}
                        onClick={() => {
                          setActionReason('Dispatch hold - do not auto-offer');
                          setPendingAction({ type: 'add_ops_note', deliveryId: item.deliveryId });
                        }}
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
                <EmptyState
                  icon={<Truck className="h-8 w-8" />}
                  title="No pending dispatches"
                  description="All deliveries have been assigned."
                />
              )}
            </div>
          </Card>

          {/* Map */}
          <Card className="border-gray-800 bg-opsPanel p-4">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-white">Active Deliveries</h2>
            </div>
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

          {/* Offer history */}
          <Card className="border-gray-800 bg-opsPanel p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-white">Offer History (24h)</h2>
            </div>
            <DataTable
              columns={historyColumns}
              data={history}
              keyExtractor={(r) => r.id}
              emptyState={
                <EmptyState
                  title="No offers in the last 24 hours"
                  description="Dispatch activity will appear here."
                />
              }
              className="border-gray-800 bg-transparent"
            />
          </Card>
        </div>

        {/* Force assign / Hold modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => { setPendingAction(null); setActionReason(''); }}
          title={pendingAction?.type === 'force_assign' ? 'Force Assign Driver' : 'Hold Delivery'}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              {pendingAction?.type === 'force_assign'
                ? 'Provide a reason for the manual override. This is audit-logged.'
                : 'Add an ops note explaining the hold reason.'}
            </p>
            <textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#E85D26] focus:outline-none"
              placeholder="Enter reason (min 3 chars)…"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setPendingAction(null); setActionReason(''); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-[#E85D26] text-white hover:bg-[#d54d1a]"
                disabled={Boolean(busyId) || actionReason.trim().length < 3}
                onClick={handleModalConfirm}
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
