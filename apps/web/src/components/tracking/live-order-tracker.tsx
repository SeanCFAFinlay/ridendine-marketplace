'use client';

import { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, Button } from '@ridendine/ui';
import { useOrderStream } from '@/lib/orders/use-order-stream';
import { formatScheduledTime, isScheduledOrder } from '@/lib/checkout/scheduling';

const OrderTrackingMap = dynamic(
  () => import('./order-tracking-map'),
  { ssr: false, loading: () => <div className="h-64 rounded-lg bg-surfaceMuted animate-pulse" /> }
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
  /** Driver first name only — no last name, no photo, no coords */
  driverFirstName?: string | null;
  /** Driver contact phone for call-to-action link */
  driverPhone?: string | null;
  /** ISO timestamp of when order was created */
  createdAt?: string | null;
  /** ISO timestamp for scheduled delivery. Null means ASAP. */
  scheduledFor?: string | null;
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
        <p className="text-lg font-semibold text-text">This order was cancelled.</p>
      </div>
    );
  }
  if (terminal === 'refunded') {
    return (
      <div className="p-6 text-center">
        <p className="text-lg font-semibold text-text">Refund in progress or completed.</p>
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
                  ? 'bg-success text-white'
                  : i === currentIndex
                  ? 'bg-primary text-primaryFg'
                  : 'bg-surfaceMuted text-textSubtle'
              }`}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            {i < PUBLIC_STEPS.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 ${i < currentIndex ? 'bg-success' : 'bg-surfaceMuted'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-1">
        {PUBLIC_STEPS.map((step, i) => (
          <span
            key={step.key}
            className={`text-[10px] sm:text-xs ${i <= currentIndex ? 'font-medium text-text' : 'text-textSubtle'}`}
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
      <h3 className="font-semibold text-text">Delivery Details</h3>
      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-success" />
          <div>
            <p className="text-xs text-textMuted">PICKUP</p>
            <p className="text-sm text-text">{pickupAddress}</p>
          </div>
        </div>
        <div className="ml-[5px] h-4 w-px bg-border" />
        <div className="flex items-start gap-3">
          <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-danger" />
          <div>
            <p className="text-xs text-textMuted">DELIVERY</p>
            <p className="text-sm text-text">{dropoffAddress}</p>
          </div>
        </div>
      </div>
      {(etaPickupAt || etaDropoffAt) && !isDelivered && (
        <div className="mt-4 space-y-1 rounded-md bg-primarySoft p-3 text-sm text-primary">
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
        <div className="mt-4 rounded-md bg-primarySoft p-3">
          <p className="text-sm text-primary">
            Estimated delivery in <strong>{estimatedDeliveryMinutes} minutes</strong>
          </p>
        </div>
      )}
    </Card>
  );
}

interface CancelOrderSectionProps {
  orderId: string;
  canCancel: boolean;
}

function CancelOrderSection({ orderId, canCancel }: CancelOrderSectionProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const handleCancelClick = useCallback(() => {
    setCancelError(null);
    setShowDialog(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowDialog(false);
    setCancelError(null);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    setIsLoading(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error?.message ?? 'Something went wrong. Please try again.';
        setCancelError(msg);
        return;
      }
      const successMsg = json?.data?.message ?? 'Your order has been cancelled. Your payment will be refunded.';
      setCancelSuccess(successMsg);
      setShowDialog(false);
    } catch {
      setCancelError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  if (!canCancel && !cancelSuccess) return null;

  if (cancelSuccess) {
    return (
      <Card className="border-success/30 bg-successSoft p-4">
        <p className="text-sm font-medium text-success">{cancelSuccess}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {cancelError && (
        <Card className="border-danger/30 bg-dangerSoft p-3">
          <p className="text-sm text-danger">{cancelError}</p>
        </Card>
      )}
      <Button
        variant="secondary"
        onClick={handleCancelClick}
        fullWidth
        className="border-danger/40 text-danger hover:bg-dangerSoft"
      >
        Cancel Order
      </Button>
      {showDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-modal flex items-center justify-center bg-text/40 backdrop-blur-sm p-4"
        >
          <Card className="w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-text">Are you sure?</h3>
            <p className="mt-2 text-sm text-textMuted">
              Your payment will be refunded within 3–5 business days.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="secondary"
                onClick={handleDismiss}
                disabled={isLoading}
                className="flex-1"
              >
                Keep Order
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmCancel}
                disabled={isLoading}
                loading={isLoading}
                className="flex-1"
              >
                Yes, Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
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
  scheduledFor,
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
  // Only allow cancel when order is still in 'placed' public stage (pending/payment_authorized engine status)
  const canCancel = publicStage === 'placed' && !terminal;

  const heading = terminal
    ? terminal === 'cancelled'
      ? 'Cancelled'
      : 'Refunded'
    : PUBLIC_STEPS[Math.max(0, currentStepIndex)]?.label ?? 'Processing';

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-warning/30 bg-warningSoft p-4">
          <p className="text-sm text-warning">{error}</p>
        </Card>
      )}
      {!isLive && !error && (
        <Card className="border-border bg-surfaceMuted p-3">
          <p className="text-xs text-textMuted">Connecting to live updates…</p>
        </Card>
      )}
      <Card className="overflow-hidden" padding="none">
        <div className="bg-accent p-6 text-white">
          <p className="text-sm font-medium opacity-80">Order #{orderNumber}</p>
          <h2 className="mt-1 font-display text-2xl font-bold">
            {isDelivered ? 'Delivered!' : heading}
          </h2>
          <p className="mt-1 text-sm opacity-80">From {storefrontName}</p>
        </div>
      </Card>

      {isScheduledOrder(scheduledFor) && (
        <Card className="border-info/30 bg-infoSoft p-4">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-info">
              <span className="font-medium">Scheduled for </span>
              {formatScheduledTime(scheduledFor)}
            </p>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden" padding="none">
        <StepIndicator currentIndex={currentStepIndex} terminal={terminal} />
      </Card>

      {showMap && (
        <Card className="overflow-hidden" padding="none">
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <h3 className="font-semibold text-text">Order progress</h3>
            </div>
            {progressPct != null && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surfaceMuted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
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

      <CancelOrderSection orderId={orderId} canCancel={canCancel} />
    </div>
  );
}
