'use client';

import { DEFAULT_SERVICE_REGION_CENTER } from '@ridendine/engine';

interface Delivery {
  id: string;
  order_number?: string;
  status: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_address: string;
  driver_name?: string;
  route_polyline?: string | null;
}

export type OpsDriverPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
};

interface DeliveryMapProps {
  deliveries: Delivery[];
  className?: string;
  driverPins?: OpsDriverPin[];
  highlightedDeliveryId?: string | null;
  onDeliveryClick?: (deliveryId: string) => void;
}

function formatCoord(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return 'No coordinates';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function statusClass(status: string) {
  if (status === 'delivered' || status === 'completed') return 'border-success/40 bg-success/10 text-success';
  if (status.includes('route') || status.includes('picked')) return 'border-primary/40 bg-primary/10 text-primary';
  return 'border-border bg-text/60 text-textSubtle';
}

export function DeliveryMap({
  deliveries,
  className,
  driverPins = [],
  highlightedDeliveryId = null,
  onDeliveryClick,
}: DeliveryMapProps) {
  const hasPins = deliveries.length > 0 || driverPins.length > 0;

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-text ${className ?? ''}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Live coordinate map</p>
          <p className="text-xs text-textMuted">
            Service center {formatCoord(DEFAULT_SERVICE_REGION_CENTER[0], DEFAULT_SERVICE_REGION_CENTER[1])}
          </p>
        </div>
        <span className="rounded-full bg-surface px-2 py-1 text-xs text-textSubtle">
          {deliveries.length} deliveries · {driverPins.length} drivers
        </span>
      </div>

      {!hasPins ? (
        <div className="flex h-full min-h-64 items-center justify-center p-6 text-sm text-textMuted">
          No delivery or driver coordinates available.
        </div>
      ) : (
        <div className="grid h-full min-h-64 gap-3 overflow-y-auto p-4 lg:grid-cols-2">
          {deliveries.map((delivery) => {
            const isHighlighted = highlightedDeliveryId === delivery.id;
            return (
              <button
                key={delivery.id}
                type="button"
                onClick={() => onDeliveryClick?.(delivery.id)}
                className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/60 ${
                  isHighlighted ? 'border-primary bg-primary/10' : statusClass(delivery.status)
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-textMuted">
                    {delivery.order_number ?? delivery.id.slice(0, 8)}
                  </p>
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                    {delivery.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-success">Pickup</p>
                    <p className="text-textSubtle">{delivery.pickup_address}</p>
                    <p className="font-mono text-textMuted">{formatCoord(delivery.pickup_lat, delivery.pickup_lng)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-danger">Dropoff</p>
                    <p className="text-textSubtle">{delivery.dropoff_address}</p>
                    <p className="font-mono text-textMuted">{formatCoord(delivery.dropoff_lat, delivery.dropoff_lng)}</p>
                  </div>
                  {delivery.driver_name && (
                    <p className="text-textMuted">Driver: <span className="text-textSubtle">{delivery.driver_name}</span></p>
                  )}
                  {delivery.route_polyline && (
                    <p className="text-textMuted">Route polyline attached</p>
                  )}
                </div>
              </button>
            );
          })}

          {driverPins.map((pin) => (
            <div key={pin.id} className="rounded-lg border border-info/40 bg-info/10 p-3 text-xs">
              <p className="font-semibold text-info">{pin.label}</p>
              <p className="mt-1 font-mono text-info/70">{formatCoord(pin.lat, pin.lng)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
