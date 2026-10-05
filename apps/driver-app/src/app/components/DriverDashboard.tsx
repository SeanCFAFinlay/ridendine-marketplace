'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Driver, Delivery } from '@ridendine/db';
import type { DriverOperationsSummary, DriverShiftOperationsSummary } from '@ridendine/types';
import { DELIVERY_STATUS_LABELS } from '@ridendine/ui';
import { formatCurrency } from '@ridendine/utils';
import { OfferAlert } from '@/components/offer-alert';
import { useLocationTracker } from '@/hooks/use-location-tracker';
import { RouteMap } from '@/components/map/route-map';

interface DriverDashboardProps {
  driver: Driver;
  activeDeliveries: Delivery[];
}

type DashboardOffer = {
  attemptId: string;
  deliveryId: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedDistanceKm: number | null;
  estimatedRouteSeconds: number | null;
  estimatedPayout: number | null;
  customerTip: number | null;
  orderNumber: string | null;
  storefrontName: string | null;
  expiresAt: string | null;
};

function formatDeliveryStatus(status?: string | null) {
  if (!status) return 'In progress';
  return DELIVERY_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

function formatStatusLabel(status?: string | null) {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseReadinessSummary(json: unknown): DriverOperationsSummary | null {
  if (!json || typeof json !== 'object') return null;

  const root = json as Record<string, unknown>;
  const payload = root.success === true && root.data && typeof root.data === 'object'
    ? (root.data as Record<string, unknown>)
    : root;

  return payload.readiness && typeof payload.readiness === 'object'
    ? (payload as unknown as DriverOperationsSummary)
    : null;
}

function parseShiftSummary(json: unknown): DriverShiftOperationsSummary | null {
  if (!json || typeof json !== 'object') return null;

  const root = json as Record<string, unknown>;
  const payload = root.success === true && root.data && typeof root.data === 'object'
    ? (root.data as Record<string, unknown>)
    : root;

  return typeof payload.isOnShift === 'boolean'
    ? (payload as unknown as DriverShiftOperationsSummary)
    : null;
}

function formatGpsFreshness(
  serverLastLocationAt: string | null | undefined,
  clientLastPostedAt: string | null | undefined,
  hasClientFix: boolean
) {
  const timestamp = clientLastPostedAt ?? serverLastLocationAt;

  if (!timestamp) {
    return hasClientFix ? 'GPS fix captured, waiting to post' : 'No GPS fix yet';
  }

  const postedAt = Date.parse(timestamp);
  if (!Number.isFinite(postedAt)) {
    return 'GPS freshness unknown';
  }

  const ageMs = Date.now() - postedAt;
  if (ageMs < 0) return 'GPS timestamp is ahead of device time';
  if (ageMs < 60_000) return 'GPS refreshed just now';

  const ageMinutes = Math.round(ageMs / 60_000);
  if (ageMinutes < 60) return `GPS refreshed ${ageMinutes} min ago`;

  const ageHours = Math.round(ageMinutes / 60);
  return `GPS refreshed ${ageHours} hr ago`;
}

function shouldShowRetryLocation(
  summary: DriverOperationsSummary | null,
  permissionState: string,
  locationError: string | null,
  isOnline: boolean
) {
  if (!isOnline) return false;

  const readiness = summary?.readiness;
  const detail = readiness?.detail.toLowerCase() ?? '';

  return (
    Boolean(locationError) ||
    permissionState === 'denied' ||
    readiness?.status === 'needs_location' ||
    detail.includes('gps') ||
    detail.includes('location')
  );
}

function numericOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseOffersPayload(json: unknown): DashboardOffer[] {
  if (!json || typeof json !== 'object') return [];
  const root = json as Record<string, unknown>;
  const data = root.success === true && root.data && typeof root.data === 'object'
    ? (root.data as Record<string, unknown>)
    : root;
  const offers = Array.isArray(data.offers) ? data.offers : [];

  return offers
    .map((offer) => {
      if (!offer || typeof offer !== 'object') return null;
      const row = offer as Record<string, unknown>;
      const attemptId = typeof row.attemptId === 'string' ? row.attemptId : '';
      const deliveryId = typeof row.deliveryId === 'string' ? row.deliveryId : '';
      if (!attemptId || !deliveryId) return null;

      return {
        attemptId,
        deliveryId,
        pickupAddress: typeof row.pickupAddress === 'string' ? row.pickupAddress : '',
        dropoffAddress: typeof row.dropoffAddress === 'string' ? row.dropoffAddress : '',
        estimatedDistanceKm: numericOrNull(row.estimatedDistanceKm),
        estimatedRouteSeconds: numericOrNull(row.estimatedRouteSeconds),
        estimatedPayout: numericOrNull(row.estimatedPayout),
        customerTip: numericOrNull(row.customerTip),
        orderNumber: typeof row.orderNumber === 'string' ? row.orderNumber : null,
        storefrontName: typeof row.storefrontName === 'string' ? row.storefrontName : null,
        expiresAt: typeof row.expiresAt === 'string' ? row.expiresAt : null,
      };
    })
    .filter((offer): offer is DashboardOffer => offer !== null);
}

// Driver earnings/payout amounts from the earnings + offers APIs are dollars
// (deliveries.driver_payout); only fields explicitly suffixed *Cents are cents.
function formatMoney(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not available';
  return formatCurrency(value);
}

function formatDistance(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not available';
  return `${value.toFixed(1)} km`;
}

function formatRouteTime(seconds: number | null | undefined) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return 'Route time pending';
  }
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min route`;
}

function formatShiftDuration(startedAt: string | null | undefined, nowMs: number) {
  if (!startedAt) return 'Not started';
  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) return 'Unknown';

  const elapsedMinutes = Math.max(0, Math.floor((nowMs - startedMs) / 60_000));
  if (elapsedMinutes < 1) return 'Just started';

  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatExpiry(expiresAt: string | null | undefined, nowMs: number) {
  if (!expiresAt) return 'Expiry pending';
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) return 'Expiry pending';
  const seconds = Math.max(0, Math.floor((expiryMs - nowMs) / 1000));
  if (seconds <= 0) return 'Expiring now';
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} min left`;
}

const READINESS_BADGE_CLASSES: Record<DriverOperationsSummary['readiness']['priority'], string> = {
  success: 'bg-successSoft text-success',
  warning: 'bg-warningSoft text-warning',
  danger: 'bg-dangerSoft text-danger',
  idle: 'bg-surfaceMuted text-textMuted',
};

function CommandMetric({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  const valueClass =
    tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-text';

  return (
    <div className="rounded-xl border border-divider bg-surfaceMuted px-4 py-3">
      <p className="text-xs font-medium text-textMuted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-textSubtle">{detail}</p>
    </div>
  );
}

export default function DriverDashboard({ driver, activeDeliveries }: DriverDashboardProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [presenceLoading, setPresenceLoading] = useState(true);
  const [readinessSummary, setReadinessSummary] = useState<DriverOperationsSummary | null>(null);
  const [shiftSummary, setShiftSummary] = useState<DriverShiftOperationsSummary | null>(null);
  const [todayStats, setTodayStats] = useState<{ deliveries: number; earnings: number; hours: number | null }>({
    deliveries: 0,
    earnings: 0,
    hours: null,
  });
  const [pendingOffers, setPendingOffers] = useState<DashboardOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const dashboardRequestIdRef = useRef(0);

  const currentDelivery = activeDeliveries[0];
  const locationTracker = useLocationTracker({
    driverId: driver?.id ?? null,
    isOnline,
    deliveryId: currentDelivery?.id ?? null,
  });

  const applyReadinessSummary = useCallback(
    (
      summary: DriverOperationsSummary,
      expectedPresenceStatus?: DriverOperationsSummary['presenceStatus']
    ) => {
      const presenceStatus = expectedPresenceStatus ?? summary.presenceStatus;
      const nextSummary = expectedPresenceStatus
        ? {
            ...summary,
            presenceStatus,
          }
        : summary;

      setReadinessSummary(nextSummary);
      setIsOnline(presenceStatus === 'online' || presenceStatus === 'busy');
    },
    []
  );

  const applyShiftSummary = useCallback((summary: DriverShiftOperationsSummary) => {
    setShiftSummary(summary);
    setIsOnline(summary.presenceStatus === 'online' || summary.presenceStatus === 'busy');
    setTodayStats((current) => ({
      deliveries: summary.today?.completedDeliveries ?? current.deliveries,
      earnings: summary.today?.earnings ?? current.earnings,
      hours: current.hours,
    }));
    setReadinessSummary((current) =>
      current
        ? {
            ...current,
            presenceStatus: summary.presenceStatus,
            activeDeliveryCount: summary.activeDeliveryCount,
            lastLocationAt: summary.lastLocationAt ?? current.lastLocationAt,
          }
        : current
    );
  }, []);

  const refreshOffers = useCallback(async () => {
    const requestId = dashboardRequestIdRef.current + 1;
    dashboardRequestIdRef.current = requestId;

    try {
      const offersResponse = await fetch('/api/offers');
      if (requestId !== dashboardRequestIdRef.current) return;

      if (!offersResponse.ok) {
        setPendingOffers([]);
        setOffersError('Offer queue unavailable');
        return;
      }

      const offersJson = await offersResponse.json();
      if (requestId !== dashboardRequestIdRef.current) return;

      setPendingOffers(parseOffersPayload(offersJson));
      setOffersError(null);
    } catch {
      if (requestId === dashboardRequestIdRef.current) {
        setPendingOffers([]);
        setOffersError('Offer queue unavailable');
      }
    }
  }, []);

  const refreshReadiness = useCallback(async (
    expectedPresenceStatus?: DriverOperationsSummary['presenceStatus']
  ) => {
    const requestId = dashboardRequestIdRef.current + 1;
    dashboardRequestIdRef.current = requestId;

    const readinessResponse = await fetch('/api/driver/readiness');
    if (requestId !== dashboardRequestIdRef.current) return;
    if (!readinessResponse.ok) return;

    const readinessJson = await readinessResponse.json();
    if (requestId !== dashboardRequestIdRef.current) return;

    const summary = parseReadinessSummary(readinessJson);
    if (!summary) return;

    applyReadinessSummary(summary, expectedPresenceStatus);
  }, [applyReadinessSummary]);

  const toggleShiftStatus = async () => {
    const isOnShift = Boolean(shiftSummary?.isOnShift);
    const activeDeliveryCount = readinessSummary?.activeDeliveryCount ?? shiftSummary?.activeDeliveryCount ?? activeDeliveries.length;

    if (isOnShift && activeDeliveryCount > 0) {
      setStatusError('Complete active deliveries before ending your shift.');
      return;
    }

    setIsTogglingStatus(true);
    setStatusError(null);
    try {
      const response = await fetch('/api/driver/shift', {
        method: isOnShift ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || json.error || 'Failed to update shift');
      }

      const summary = parseShiftSummary(json);
      if (!summary) {
        throw new Error('Shift response was incomplete');
      }

      applyShiftSummary(summary);
      setPresenceLoading(false);
      void refreshReadiness(summary.presenceStatus);
    } catch (error) {
      console.error('Error updating shift:', error instanceof Error ? error.message : 'unknown');
      setStatusError('Unable to update your shift right now. Please try again.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  useEffect(() => {
    async function hydrateDashboard() {
      const requestId = dashboardRequestIdRef.current + 1;
      dashboardRequestIdRef.current = requestId;
      setOffersLoading(true);
      setOffersError(null);

      try {
        const [presenceResponse, earningsResponse, readinessResponse, shiftResponse, offersResponse] = await Promise.all([
          fetch('/api/driver/presence'),
          fetch('/api/earnings'),
          fetch('/api/driver/readiness'),
          fetch('/api/driver/shift'),
          fetch('/api/offers'),
        ]);

        if (requestId !== dashboardRequestIdRef.current) return;

        if (presenceResponse.ok) {
          const presenceJson = await presenceResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          const status = presenceJson.data?.presence?.status;
          setIsOnline(status === 'online' || status === 'busy');
        }

        if (earningsResponse.ok) {
          const json = await earningsResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          const payload = json.success === true && json.data != null ? json.data : json;
          setTodayStats({
            deliveries: payload.today?.count ?? 0,
            earnings: payload.today?.earnings ?? 0,
            hours: null,
          });
        }

        if (readinessResponse.ok) {
          const readinessJson = await readinessResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          const summary = parseReadinessSummary(readinessJson);
          if (summary) {
            applyReadinessSummary(summary);
          }
        }

        if (shiftResponse.ok) {
          const shiftJson = await shiftResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          const summary = parseShiftSummary(shiftJson);
          if (summary) {
            applyShiftSummary(summary);
          }
        }

        if (offersResponse.ok) {
          const offersJson = await offersResponse.json();
          if (requestId !== dashboardRequestIdRef.current) return;

          setPendingOffers(parseOffersPayload(offersJson));
          setOffersError(null);
        } else {
          setPendingOffers([]);
          setOffersError('Offer queue unavailable');
        }
      } catch {
        // Keep defaults on error
        setPendingOffers([]);
        setOffersError('Offer queue unavailable');
      } finally {
        if (requestId === dashboardRequestIdRef.current) {
          setPresenceLoading(false);
          setOffersLoading(false);
        }
      }
    }
    hydrateDashboard();
  }, [applyReadinessSummary, applyShiftSummary]);

  // Keep the pending-offer queue fresh: the initial hydrate only runs once on
  // mount, so poll the durable offer queue periodically. Stale responses are
  // discarded via the shared request-id pattern inside refreshOffers.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshOffers();
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [refreshOffers]);

  useEffect(() => {
    setNowMs(Date.now());

    if (!shiftSummary?.isOnShift || !shiftSummary.shiftStartedAt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, [shiftSummary?.isOnShift, shiftSummary?.shiftStartedAt]);

  const readiness = readinessSummary?.readiness;
  const readinessPriority = readiness?.priority ?? 'idle';
  const isOnShift = Boolean(shiftSummary?.isOnShift);
  const approvalLabel = formatStatusLabel(readinessSummary?.approvalStatus ?? driver.status);
  const onlineStateLabel = formatStatusLabel(
    readinessSummary?.presenceStatus ?? (isOnline ? 'online' : 'offline')
  );
  const activeDeliveryCount = readinessSummary?.activeDeliveryCount ?? activeDeliveries.length;
  const gpsFreshness = locationTracker.isPosting
    ? 'Posting GPS update...'
    : formatGpsFreshness(
        readinessSummary?.lastLocationAt,
        locationTracker.lastPostedAt,
        Boolean(locationTracker.lastLocation)
      );
  const showRetryLocation = shouldShowRetryLocation(
    readinessSummary,
    locationTracker.permissionState,
    locationTracker.locationError,
    isOnline
  );
  const showShiftEndBlock = isOnShift && activeDeliveryCount > 0;
  const dispatchText =
    readiness?.status === 'ready'
      ? 'Dispatch ready'
      : readiness?.detail ?? 'Checking driver requirements...';
  const readinessTitle =
    readiness?.status === 'ready' ? 'Dispatch ready' : readiness?.label ?? 'Checking readiness';
  const shiftActionLabel = isTogglingStatus
    ? isOnShift ? 'Ending...' : 'Starting...'
    : isOnShift ? 'End shift' : 'Start shift';
  const shiftStatusLabel = presenceLoading ? 'Loading...' : isOnShift ? 'On shift' : 'Off shift';
  const shiftDurationLabel = isOnShift
    ? formatShiftDuration(shiftSummary?.shiftStartedAt, nowMs)
    : 'Not on shift';
  const shiftDeliveries = shiftSummary?.currentShift?.totalDeliveries
    ?? shiftSummary?.today?.completedDeliveries
    ?? todayStats.deliveries;
  const shiftEarnings = shiftSummary?.currentShift?.totalEarnings
    ?? shiftSummary?.today?.earnings
    ?? todayStats.earnings;
  const shiftDistance = shiftSummary?.currentShift?.totalDistanceKm ?? null;
  const activeWorkValue = activeDeliveryCount > 0
    ? `${activeDeliveryCount} active`
    : pendingOffers.length > 0
      ? `${pendingOffers.length} offer${pendingOffers.length === 1 ? '' : 's'}`
      : 'Clear';
  const activeWorkDetail = activeDeliveryCount > 0
    ? 'Finish active deliveries before ending shift'
    : pendingOffers.length > 0
      ? 'Review available work'
      : isOnShift
        ? 'Waiting in the offer queue'
        : 'Start shift to receive offers';
  const activeShiftDeliveries = shiftSummary?.activeDeliveries ?? [];

  return (
    <div className="space-y-4">
      <OfferAlert driverId={driver.id} isOnline={isOnline} />

      {statusError && (
        <div>
          <div className="rounded-xl border border-danger/30 bg-dangerSoft p-3 text-sm text-danger">
            {statusError}
          </div>
        </div>
      )}

      {(isOnShift || isOnline) &&
        (locationTracker.permissionState === 'denied' || locationTracker.locationError) && (
          <div
            role="alert"
            className="rounded-xl border border-danger/30 bg-dangerSoft p-4 text-sm font-semibold text-danger"
          >
            <p>
              Location tracking is off — customers can&apos;t see your position. Enable location
              for this site.
            </p>
            {locationTracker.permissionState !== 'denied' && locationTracker.locationError && (
              <p className="mt-1 font-medium">{locationTracker.locationError}</p>
            )}
          </div>
        )}

      <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-textMuted">Driver command center</p>
            <h2 className="mt-1 text-2xl font-bold text-text">
              {isOnShift ? 'Shift live' : 'Ready for shift'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-textMuted">
              {isOnShift
                ? 'You are visible to dispatch. Keep GPS fresh and watch active work and offer queue changes here.'
                : 'Start your shift when you are ready. Ops will only dispatch drivers who are approved, online, and location-ready.'}
            </p>
          </div>
          <button
            data-testid="driver-online-toggle"
            onClick={toggleShiftStatus}
            disabled={isTogglingStatus || showShiftEndBlock}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-60 ${
              isOnShift
                ? 'bg-text text-white hover:bg-text/90'
                : 'bg-primary text-white hover:bg-primaryHover'
            }`}
          >
            {shiftActionLabel}
          </button>
        </div>

        {showShiftEndBlock && (
          <p className="mt-4 rounded-xl border border-warning/30 bg-warningSoft px-3 py-2 text-sm font-medium text-warning">
            Complete active deliveries before ending your shift.
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CommandMetric
            label="Shift duration"
            value={shiftDurationLabel}
            detail={isOnShift ? shiftStatusLabel : 'Clock starts when your shift begins'}
            tone={isOnShift ? 'success' : 'default'}
          />
          <CommandMetric
            label="Today earnings"
            value={formatMoney(shiftEarnings)}
            detail={`${shiftDeliveries} completed today`}
            tone="success"
          />
          <CommandMetric
            label="Distance"
            value={formatDistance(shiftDistance)}
            detail={isOnShift ? 'Current shift total' : 'Tracked after first delivery'}
          />
          <CommandMetric
            label="Active work"
            value={activeWorkValue}
            detail={activeWorkDetail}
            tone={activeDeliveryCount > 0 ? 'warning' : 'default'}
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-textMuted">Active work</p>
                <h2 className="mt-1 text-xl font-bold text-text">
                  {currentDelivery ? 'Delivery in progress' : 'Work queue'}
                </h2>
              </div>
              <span className="rounded-full bg-surfaceMuted px-3 py-1 text-xs font-semibold text-textMuted">
                {shiftStatusLabel}
              </span>
            </div>

            {/* Always show a live delivery, even if shift/presence state says offline */}
            {currentDelivery && (
              <div className="mt-5 rounded-2xl border-2 border-primary bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-text">Active Delivery</h3>
                  <span className="rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-semibold text-primary">
                    {formatDeliveryStatus(currentDelivery.status)}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-success" />
                    <div>
                      <p className="text-sm font-semibold text-text">Pickup</p>
                      <p className="text-sm text-textMuted">{currentDelivery.pickup_address}</p>
                    </div>
                  </div>
                  <div className="ml-[5px] h-6 w-px bg-surfaceMuted" />
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-danger" />
                    <div>
                      <p className="text-sm font-semibold text-text">Dropoff</p>
                      <p className="text-sm text-textMuted">{currentDelivery.dropoff_address}</p>
                    </div>
                  </div>
                </div>

                {/* Active delivery route map preview */}
                <div className="mt-4 overflow-hidden rounded-xl border border-divider">
                  <RouteMap
                    pickupLat={currentDelivery.pickup_lat}
                    pickupLng={currentDelivery.pickup_lng}
                    pickupAddress={currentDelivery.pickup_address}
                    dropoffLat={currentDelivery.dropoff_lat}
                    dropoffLng={currentDelivery.dropoff_lng}
                    dropoffAddress={currentDelivery.dropoff_address}
                    driverLat={locationTracker.lastLocation?.lat}
                    driverLng={locationTracker.lastLocation?.lng}
                    polyline={currentDelivery.route_to_dropoff_polyline}
                    className="h-44 w-full"
                  />
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl bg-surfaceMuted p-3">
                  <div>
                    <p className="text-xs text-textMuted">Distance</p>
                    <p className="text-sm font-bold text-text">
                      {currentDelivery.distance_km?.toFixed(1) ?? '—'} km
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-textMuted">Earnings</p>
                    <p className="text-xl font-bold text-success">
                      {formatCurrency(Number(currentDelivery.driver_payout))}
                    </p>
                  </div>
                </div>

                <Link href={`/delivery/${currentDelivery.id}`} className="mt-4 block">
                  <button className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primaryHover">
                    Open Delivery Workflow
                  </button>
                </Link>
              </div>
            )}

            {!currentDelivery && activeDeliveries.length === 0 && (
              <div className="mt-5 rounded-2xl border border-divider bg-white p-8 text-center">
                <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
                  isOnShift ? 'bg-successSoft' : 'bg-surfaceMuted'
                }`}>
                  {isOnShift ? (
                    <svg className="h-10 w-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="h-10 w-10 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1.5.5M13 16H3m10 0h3m3-3V9.5a1 1 0 00-.293-.707L16 6H13v10h6z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-bold text-text">
                  {isOnShift ? "You're On Shift!" : 'No active deliveries'}
                </h3>
                <p className="mt-2 text-sm text-textMuted">
                  {isOnShift
                    ? 'You are in the offer queue. Keep this app open; new offers will appear here with a countdown.'
                    : 'Go online when you are ready to receive offers. Keep this app open while you wait.'}
                </p>
              </div>
            )}

            {!isOnShift && (
              <div className="mt-5 rounded-2xl border border-divider bg-surfaceMuted p-5 text-center">
                <h3 className="text-lg font-bold text-text">You&apos;re Off Shift</h3>
                <p className="mt-2 text-sm text-textMuted">
                  Start your shift when your vehicle, phone, and route window are ready.
                </p>
                <button
                  data-testid="driver-online-toggle"
                  onClick={toggleShiftStatus}
                  disabled={isTogglingStatus}
                  className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-60"
                >
                  {shiftActionLabel}
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm" aria-label="Ready to work">
            <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-textMuted">Ready to work</p>
              <h2 className="mt-1 text-xl font-bold text-text">{readinessTitle}</h2>
              <p className="mt-2 text-sm text-textMuted">{dispatchText}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                READINESS_BADGE_CLASSES[readinessPriority]
              }`}
            >
              {readiness?.blocksDispatch ? 'Blocked' : readiness?.status === 'ready' ? 'Ready' : 'Check'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surfaceMuted px-3 py-2">
              <p className="text-xs font-medium text-textMuted">Approval</p>
              <p className="mt-1 text-sm font-semibold text-text">{approvalLabel}</p>
            </div>
            <div className="rounded-xl bg-surfaceMuted px-3 py-2">
              <p className="text-xs font-medium text-textMuted">Shift state</p>
              <p className="mt-1 text-sm font-semibold text-text">
                {isOnShift ? 'On shift' : 'Off shift'}
              </p>
              <p className="mt-0.5 text-[11px] text-textSubtle">
                Presence {onlineStateLabel}
              </p>
            </div>
            <div className="rounded-xl bg-surfaceMuted px-3 py-2">
              <p className="text-xs font-medium text-textMuted">GPS freshness</p>
              <p className="mt-1 text-sm font-semibold text-text">{gpsFreshness}</p>
            </div>
            <div className="rounded-xl bg-surfaceMuted px-3 py-2">
              <p className="text-xs font-medium text-textMuted">Active work</p>
              <p className="mt-1 text-sm font-semibold text-text">
                {activeDeliveryCount === 0
                  ? 'None active'
                  : `${activeDeliveryCount} active ${activeDeliveryCount === 1 ? 'delivery' : 'deliveries'}`}
              </p>
            </div>
          </div>

          {locationTracker.locationError && (
            <p className="mt-3 text-sm font-medium text-danger">{locationTracker.locationError}</p>
          )}

          {showRetryLocation && (
            <button
              type="button"
              onClick={locationTracker.startTracking}
              disabled={locationTracker.isPosting}
              className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-60"
            >
              {locationTracker.isPosting ? 'Retrying location...' : 'Retry location'}
            </button>
          )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-textMuted">Offer queue</p>
                <h2 className="mt-1 text-xl font-bold text-text">
                  {offersLoading ? 'Offer queue' : 'Pending offers'}
                </h2>
              </div>
              <span className="rounded-full bg-surfaceMuted px-3 py-1 text-xs font-semibold text-textMuted">
                {offersLoading ? 'Checking' : `${pendingOffers.length} open`}
              </span>
            </div>

            {offersLoading && (
              <p className="mt-4 rounded-xl bg-surfaceMuted px-3 py-3 text-sm text-textMuted">
                Checking durable offer queue...
              </p>
            )}

            {!offersLoading && offersError && (
              <p className="mt-4 rounded-xl border border-warning/30 bg-warningSoft px-3 py-3 text-sm font-medium text-warning">
                {offersError}
              </p>
            )}

            {!offersLoading && !offersError && pendingOffers.length === 0 && (
              <p className="mt-4 rounded-xl bg-surfaceMuted px-3 py-3 text-sm text-textMuted">
                No pending offers right now. Stay on shift and keep GPS fresh for dispatch.
              </p>
            )}

            {!offersLoading && !offersError && pendingOffers.length > 0 && (
              <div className="mt-4 space-y-3">
                {pendingOffers.map((offer) => (
                  <div key={offer.attemptId} className="rounded-xl border border-divider p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-text">
                          Order {offer.orderNumber ?? offer.deliveryId.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-sm text-textMuted">
                          {offer.storefrontName ?? 'Storefront pending'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-success">{formatMoney(offer.estimatedPayout)}</p>
                        {offer.customerTip !== null && (
                          <p className="text-xs text-textSubtle">Tip {formatMoney(offer.customerTip)}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-textMuted sm:grid-cols-3">
                      <span className="rounded-lg bg-surfaceMuted px-2 py-1 font-semibold text-text">
                        {formatDistance(offer.estimatedDistanceKm)}
                      </span>
                      <span className="rounded-lg bg-surfaceMuted px-2 py-1">
                        {formatRouteTime(offer.estimatedRouteSeconds)}
                      </span>
                      <span className="rounded-lg bg-surfaceMuted px-2 py-1">
                        {formatExpiry(offer.expiresAt, nowMs)}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-textMuted">
                      <p><span className="font-semibold text-text">Pickup:</span> {offer.pickupAddress || 'Pickup pending'}</p>
                      <p><span className="font-semibold text-text">Dropoff:</span> {offer.dropoffAddress || 'Dropoff pending'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-text">Today&apos;s Summary</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{shiftDeliveries}</p>
                <p className="mt-1 text-xs font-medium text-textMuted">Deliveries</p>
              </div>
              <div className="text-center sm:border-l sm:border-divider">
                <p className="text-2xl font-bold text-success">
                  {formatMoney(shiftEarnings)}
                </p>
                <p className="mt-1 text-xs font-medium text-textMuted">Earnings</p>
              </div>
              <div className="text-center sm:border-l sm:border-divider">
                <p className="text-2xl font-bold text-text">
                  {activeShiftDeliveries.length}
                </p>
                <p className="mt-1 text-xs font-medium text-textMuted">In route</p>
              </div>
              <div className="text-center sm:border-l sm:border-divider">
                <p className="text-2xl font-bold text-text">
                  {todayStats.hours === null ? '—' : todayStats.hours.toFixed(1)}
                </p>
                <p className="mt-1 text-xs font-medium text-textMuted">Hours</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-text">Quick Actions</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Link href="/earnings">
                <div className="rounded-2xl border border-divider bg-white p-4 shadow-sm transition-colors hover:border-primary/30">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-successSoft">
                    <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-text">My Earnings</p>
                  <p className="text-xs text-textMuted">View payout history</p>
                </div>
              </Link>
              <Link href="/history">
                <div className="rounded-2xl border border-divider bg-white p-4 shadow-sm transition-colors hover:border-primary/30">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-infoSoft">
                    <svg className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-text">Delivery History</p>
                  <p className="text-xs text-textMuted">Past deliveries</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>

    </div>
  );
}
