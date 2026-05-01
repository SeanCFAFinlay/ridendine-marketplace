'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@ridendine/ui';
import { createBrowserClient, deliveryTrackingChannelLegacy, entityDeliveryChannel } from '@ridendine/db';

const OrderTrackingMap = dynamic(
  () => import('./order-tracking-map'),
  { ssr: false, loading: () => <div className="h-64 rounded-lg bg-gray-100 animate-pulse" /> }
);

export interface LiveOrderTrackerProps {
  orderId: string;
  orderNumber: string;
  initialStatus: string;
  deliveryId: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedDeliveryMinutes: number | null;
  storefrontName: string;
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Confirmed' },
  { key: 'accepted', label: 'Preparing' },
  { key: 'ready_for_pickup', label: 'Ready' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'in_transit', label: 'On the Way' },
  { key: 'delivered', label: 'Delivered' },
];

const STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  accepted: 'accepted',
  preparing: 'accepted',
  ready_for_pickup: 'ready_for_pickup',
  ready: 'ready_for_pickup',
  picked_up: 'picked_up',
  in_transit: 'in_transit',
  driver_en_route_dropoff: 'in_transit',
  delivered: 'delivered',
  completed: 'delivered',
};

function getStatusIndex(status: string): number {
  const mapped = STATUS_MAP[status] ?? status;
  const idx = STATUS_STEPS.findIndex((s) => s.key === mapped);
  return idx >= 0 ? idx : 0;
}

function useRealtimeTracking(
  deliveryId: string | null,
  onLocation: (lat: number, lng: number) => void,
  onStatus: (status: string) => void
) {
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!deliveryId || !supabase) return;

    const trackingChannel = supabase
      .channel(deliveryTrackingChannelLegacy(deliveryId))
      .on('broadcast', { event: 'driver_location_updated' }, (payload: { payload?: { lat?: number; lng?: number } }) => {
        const data = payload.payload;
        if (data?.lat && data?.lng) onLocation(data.lat, data.lng);
      })
      .on('broadcast', { event: 'delivery_status_updated' }, (payload: { payload?: { status?: string } }) => {
        const data = payload.payload;
        if (data?.status) onStatus(data.status);
      })
      .subscribe();

    const entityChannel = supabase
      .channel(entityDeliveryChannel(deliveryId))
      .on('broadcast', { event: 'broadcast' }, (payload: { payload?: { lat?: number; lng?: number; status?: string } }) => {
        const data = payload.payload;
        if (data?.lat && data?.lng) onLocation(data.lat, data.lng);
        if (data?.status) onStatus(data.status);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(trackingChannel);
      supabase.removeChannel(entityChannel);
    };
  }, [deliveryId, supabase, onLocation, onStatus]);
}

function usePollStatus(orderId: string, onStatus: (status: string) => void) {
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.data?.status) onStatus(data.data.status);
        }
      } catch {
        // Silent fallback
      }
    };

    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [orderId, onStatus]);
}

function StepIndicator({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        {STATUS_STEPS.map((step, i) => (
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
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 ${i < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between">
        {STATUS_STEPS.map((step, i) => (
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
}: {
  pickupAddress: string;
  dropoffAddress: string;
  estimatedDeliveryMinutes: number | null;
  isDelivered: boolean;
}) {
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
      {estimatedDeliveryMinutes && !isDelivered && (
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
  deliveryId,
  pickupAddress,
  dropoffAddress,
  estimatedDeliveryMinutes,
  storefrontName,
}: LiveOrderTrackerProps) {
  const [status, setStatus] = useState(initialStatus);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocation = useMemo(
    () => (lat: number, lng: number) => setDriverLocation({ lat, lng }),
    []
  );
  const handleStatus = useMemo(() => (s: string) => setStatus(s), []);

  useRealtimeTracking(deliveryId, handleLocation, handleStatus);
  usePollStatus(orderId, handleStatus);

  const currentStepIndex = getStatusIndex(status);
  const isDelivered = status === 'delivered' || status === 'completed';
  const showMap = Boolean(deliveryId) && !isDelivered && currentStepIndex >= 3;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a7a6e] to-[#22a196] p-6 text-white">
          <p className="text-sm font-medium opacity-80">Order #{orderNumber}</p>
          <h2 className="mt-1 text-2xl font-bold">
            {isDelivered ? 'Delivered!' : STATUS_STEPS[currentStepIndex]?.label ?? 'Processing'}
          </h2>
          <p className="mt-1 text-sm opacity-80">From {storefrontName}</p>
        </div>
        <StepIndicator currentIndex={currentStepIndex} />
      </Card>

      {showMap && (
        <Card className="overflow-hidden">
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <h3 className="font-semibold text-gray-900">Live Tracking</h3>
            </div>
          </div>
          <div className="h-64">
            <OrderTrackingMap driverLocation={driverLocation} dropoffAddress={dropoffAddress} />
          </div>
        </Card>
      )}

      <DeliveryDetails
        pickupAddress={pickupAddress}
        dropoffAddress={dropoffAddress}
        estimatedDeliveryMinutes={estimatedDeliveryMinutes}
        isDelivered={isDelivered}
      />
    </div>
  );
}
