'use client';

import { useMemo, useState } from 'react';
import { Badge, Card } from '@ridendine/ui';
import { DeliveryMap } from '@/components/map/delivery-map';
import { useOpsLiveFeed } from '@/hooks/use-ops-live-feed';
import { computeOrderSlaFlags } from '@/lib/ops-sla';
import { ChefsColumn } from './chefs-column';
import { DriversColumn } from './drivers-column';
import { OrdersColumn } from './orders-column';

const IN_FLIGHT = new Set([
  'assigned',
  'accepted',
  'en_route_to_pickup',
  'picked_up',
  'en_route_to_dropoff',
]);

export function LiveBoard() {
  const { orders, drivers, chefs, lastEventAt, pressure, realtimeConnected } = useOpsLiveFeed();
  const [highlightDeliveryId, setHighlightDeliveryId] = useState<string | null>(null);

  const highlightOrderId = useMemo(() => {
    if (!highlightDeliveryId) return null;
    const o = orders.find((x) => x.delivery?.id === highlightDeliveryId);
    return o?.id ?? null;
  }, [orders, highlightDeliveryId]);

  const mapDeliveries = useMemo(
    () =>
      orders
        .filter((o) => o.delivery && IN_FLIGHT.has(o.delivery.status))
        .map((o) => {
          const d = o.delivery!;
          return {
            id: d.id,
            order_number: o.order_number,
            status: d.status,
            pickup_lat: d.pickup_lat,
            pickup_lng: d.pickup_lng,
            pickup_address: d.pickup_address,
            dropoff_lat: d.dropoff_lat,
            dropoff_lng: d.dropoff_lng,
            dropoff_address: d.dropoff_address,
            driver_name: drivers.find((dr) => dr.id === d.driver_id)?.displayName,
            route_polyline: d.route_polyline ?? null,
          };
        }),
    [orders, drivers]
  );

  const driverPins = useMemo(
    () =>
      drivers
        .filter((d) => d.lat != null && d.lng != null && Number.isFinite(d.lat) && Number.isFinite(d.lng))
        .map((d) => ({
          id: d.id,
          lat: d.lat as number,
          lng: d.lng as number,
          label: d.displayName,
        })),
    [drivers]
  );

  const slaBoardCount = useMemo(
    () => orders.filter((o) => computeOrderSlaFlags(o, o.delivery).slaBreach).length,
    [orders]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-[#121c2c] px-4 py-3 text-sm">
        <span className="text-textMuted">Live feed</span>
        <Badge className={realtimeConnected ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}>
          {realtimeConnected ? 'Realtime' : 'Reconnecting · 60s backup'}
        </Badge>
        {lastEventAt && (
          <span className="text-textMuted">Last event {lastEventAt.toLocaleTimeString()}</span>
        )}
        {pressure && (
          <>
            <span className="text-textMuted">|</span>
            <span className="text-textSubtle">Exceptions {pressure.openExceptions}</span>
            <span className="text-textSubtle">Escalations {pressure.deliveryEscalations}</span>
            <span className="text-textSubtle">Pending dispatch {pressure.pendingDispatch}</span>
            <span className="text-danger/90">SLA flags (board) {slaBoardCount}</span>
          </>
        )}
      </div>

      <OrdersColumn orders={orders} highlightedOrderId={highlightOrderId} />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <DriversColumn drivers={drivers} />
        </div>
        <div className="lg:col-span-3">
          <ChefsColumn chefs={chefs} />
        </div>
        <div className="lg:col-span-6">
          <Card className="h-[420px] overflow-hidden border-border bg-[#121c2c] p-2">
            <p className="mb-2 px-1 text-xs text-textMuted">Internal map · driver positions (ops only)</p>
            <div className="h-[360px] w-full">
              <DeliveryMap
                className="h-full w-full"
                deliveries={mapDeliveries}
                driverPins={driverPins}
                highlightedDeliveryId={highlightDeliveryId}
                onDeliveryClick={(id) => setHighlightDeliveryId((prev) => (prev === id ? null : id))}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
