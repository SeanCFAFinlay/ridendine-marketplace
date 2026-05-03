'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@ridendine/ui';
import { useOrderStream } from '@/lib/orders/use-order-stream';

const OrderTrackingMap = dynamic(
  () => import('./order-tracking-map'),
  { ssr: false, loading: () => <div className="h-64 rounded-lg bg-gray-100 animate-pulse" /> }
);

export interface LiveOrderTrackerProps {
  orderId: string;
  orderNumber: string;
  /** Legacy `orders.status` — fallback only */
  initialStatus: string;
  initialPublicStage?: string | null;
  deliveryId: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedDeliveryMinutes: number | null;
  storefrontName: string;
  initialEtaPickupAt?: string | null;
  initialEtaDropoffAt?: string | null;
  initialProgressPct?: number | null;
  initialRemainingSeconds?: number | null;
  initialRoutePolyline?: string | null;
}

const PUBLIC_STEPS = [
  { key: 'placed', label: 'Order placed' },
  { key: 'cooking', label: 'Preparing' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
] as const;

const LEGACY_TO_PUBLIC: Record<string, string> = {
  pending: 'placed',
  checkout_pending: 'placed',
  payment_authorized: 'placed',
  accepted: 'cooking',
  preparing: 'cooking',
  ready_for_pickup: 'cooking',
  ready: 'cooking',
  dispatch_pending: 'cooking',
  picked_up: 'on_the_way',
  in_transit: 'on_the_way',
  driver_en_route_dropoff: 'on_the_way',
  driver_en_route_customer: 'on_the_way',
  delivered: 'delivered',
  completed: 'delivered',
  cancelled: 'cancelled',
  failed: 'cancelled',
  refunded: 'refunded',
};

function resolvePublicStage(
  stage: string | null,
  legacyStatus: string | null,
  initialPublicStage: string | null | undefined,
  initialStatus: string
): string {
  if (stage) return stage;
  if (initialPublicStage) return initialPublicStage;
  if (legacyStatus && LEGACY_TO_PUBLIC[legacyStatus]) {
    return LEGACY_TO_PUBLIC[legacyStatus]!;
  }
  return LEGACY_TO_PUBLIC[initialStatus] ?? 'placed';
}

function publicStageIndex(publicStage: string): number {
  if (publicStage === 'cancelled' || publicStage === 'refunded') return -1;
  const idx = PUBLIC_STEPS.findIndex((s) => s.key === publicStage);
  return idx >= 0 ? idx : 0;
}

function StepIndicator({ currentIndex, terminal }: { currentIndex: number; terminal: string | null }) {
  if (terminal === 'cancelled') {
    return (
      <div className="p-6 text-center">
        <p className="text-lg font-semibold text-gray-800">This order was cancelled.</p>
      </div>
    );
  }
  if (terminal === 'refunded') {
    return (
      <div className="p-6 text-center">
        <p className="text-lg font-semibold text-gray-800">Refund in progress or completed.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        {PUBLIC_STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < currentIndex
                  ? 'bg-green-500 text-white'
                  : i === currentIndex
                    ? 'bg-[#E85D26] text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            {i < PUBLIC_STEPS.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 ${i < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-1">
        {PUBLIC_STEPS.map((step, i) => (
          <span
            key={step.key}
            className={`text-[10px] sm:text-xs ${i <= currentIndex ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DeliveryDetails({
  pickupAddress,
  dropoffAddress,
  estimatedDeliveryMinutes,
  isDelivered,
  etaPickupAt,
  etaDropoffAt,
  remainingSeconds,
}: {
  pickupAddress: string;
  dropoffAddress: string;
  estimatedDeliveryMinutes: number | null;
  isDelivered: boolean;
  etaPickupAt: string | null;
  etaDropoffAt: string | null;
  remainingSeconds: number | null;
}) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-gray-900">Delivery Details</h3>
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-green-500" />
          <div>
            <p className="text-xs text-gray-500">PICKUP</p>
            <p className="text-sm text-gray-900">{pickupAddress}</p>
          </div>
        </div>
        <div className="ml-[5px] h-4 w-px bg-gray-200" />
        <div className="flex items-start gap-3">
          <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-red-500" />
          <div>
            <p className="text-xs text-gray-500">DELIVERY</p>
            <p className="text-sm text-gray-900">{dropoffAddress}</p>
          </div>
        </div>
      </div>
      {(etaPickupAt || etaDropoffAt) && !isDelivered && (
        <div className="mt-4 space-y-1 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
          {etaPickupAt && (
            <p>
              Pickup ETA: <strong>{fmt(etaPickupAt)}</strong>
            </p>
          )}
          {etaDropoffAt && (
            <p>
              Delivery ETA: <strong>{fmt(etaDropoffAt)}</strong>
            </p>
          )}
          {remainingSeconds != null && remainingSeconds > 0 && (
            <p className="text-xs opacity-90">About {Math.round(remainingSeconds / 60)} min remaining (estimate)</p>
          )}
        </div>
      )}
      {estimatedDeliveryMinutes && !isDelivered && !etaDropoffAt && (
        <div className="mt-4 rounded-lg bg-orange-50 p-3">
          <p className="text-sm text-orange-800">
            Estimated delivery in <strong>{estimatedDeliveryMinutes} minutes</strong>
          </p>
        </div>
      )}
    </Card>
  );
}

export function LiveOrderTracker({
  orderId,
  orderNumber,
  initialStatus,
  initialPublicStage,
  deliveryId,
  pickupAddress,
  dropoffAddress,
  estimatedDeliveryMinutes,
  storefrontName,
  initialEtaPickupAt,
  initialEtaDropoffAt,
  initialProgressPct,
  initialRemainingSeconds,
  initialRoutePolyline,
}: LiveOrderTrackerProps) {
  const {
    stage,
    etaPickupAt,
    etaDropoffAt,
    progressPct,
    remainingSeconds,
    routePolyline,
    legacyStatus,
    isLive,
    error,
  } = useOrderStream({
    orderId,
    initialPublicStage: initialPublicStage ?? null,
    initialEtaPickupAt: initialEtaPickupAt ?? null,
    initialEtaDropoffAt: initialEtaDropoffAt ?? null,
    initialProgressPct: initialProgressPct ?? null,
    initialRemainingSeconds: initialRemainingSeconds ?? null,
    initialRoutePolyline: initialRoutePolyline ?? null,
    initialLegacyStatus: initialStatus,
  });

  const publicStage = useMemo(
    () => resolvePublicStage(stage, legacyStatus, initialPublicStage, initialStatus),
    [stage, legacyStatus, initialPublicStage, initialStatus]
  );

  const terminal =
    publicStage === 'cancelled' || publicStage === 'refunded' ? publicStage : null;
  const currentStepIndex = terminal ? -1 : publicStageIndex(publicStage);
  const isDelivered = publicStage === 'delivered';
  const onTheWay = publicStage === 'on_the_way';
  const showMap = Boolean(deliveryId) && onTheWay && !isDelivered;

  const heading = terminal
    ? terminal === 'cancelled'
      ? 'Cancelled'
      : 'Refunded'
    : PUBLIC_STEPS[Math.max(0, currentStepIndex)]?.label ?? 'Processing';

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">{error}</p>
        </Card>
      )}
      {!isLive && !error && (
        <Card className="border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-600">Connecting to live updates…</p>
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a7a6e] to-[#22a196] p-6 text-white">
          <p className="text-sm font-medium opacity-80">Order #{orderNumber}</p>
          <h2 className="mt-1 text-2xl font-bold">
            {isDelivered ? 'Delivered!' : heading}
          </h2>
          <p className="mt-1 text-sm opacity-80">From {storefrontName}</p>
        </div>
        <StepIndicator currentIndex={currentStepIndex} terminal={terminal} />
      </Card>

      {showMap && (
        <Card className="overflow-hidden">
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <h3 className="font-semibold text-gray-900">Order progress</h3>
            </div>
            {progressPct != null && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#E85D26] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
                />
              </div>
            )}
          </div>
          <div className="h-64 px-2 pb-4">
            <OrderTrackingMap
              polyline={routePolyline}
              progressPct={progressPct}
              etaDropoffAt={etaDropoffAt}
              dropoffAddress={dropoffAddress}
            />
          </div>
        </Card>
      )}

      <DeliveryDetails
        pickupAddress={pickupAddress}
        dropoffAddress={dropoffAddress}
        estimatedDeliveryMinutes={estimatedDeliveryMinutes}
        isDelivered={isDelivered}
        etaPickupAt={etaPickupAt}
        etaDropoffAt={etaDropoffAt}
        remainingSeconds={remainingSeconds}
      />
    </div>
  );
}
