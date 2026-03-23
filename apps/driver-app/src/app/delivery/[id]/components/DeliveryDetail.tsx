'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@ridendine/ui';
import type { Delivery } from '@ridendine/db';

type DeliveryStatus = 'accepted' | 'en_route_to_pickup' | 'arrived_at_pickup' | 'picked_up' | 'en_route_to_dropoff' | 'arrived_at_dropoff';

interface DeliveryDetailProps {
  delivery: Delivery;
  order: any;
}

export default function DeliveryDetail({ delivery, order }: DeliveryDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState<DeliveryStatus>(delivery.status as DeliveryStatus);

  const getStatusSteps = () => {
    const steps = [
      { id: 'accepted', label: 'Accepted' },
      { id: 'en_route_to_pickup', label: 'En Route to Pickup' },
      { id: 'arrived_at_pickup', label: 'At Restaurant' },
      { id: 'picked_up', label: 'Picked Up' },
      { id: 'en_route_to_dropoff', label: 'En Route to Customer' },
      { id: 'arrived_at_dropoff', label: 'At Customer' },
    ];
    const currentIndex = steps.findIndex((s) => s.id === status);
    return steps.map((step, i) => ({
      ...step,
      completed: i < currentIndex,
      current: i === currentIndex,
    }));
  };

  const getNextAction = (): { label: string; nextStatus: DeliveryStatus } | null => {
    const actions: Record<DeliveryStatus, { label: string; nextStatus: DeliveryStatus } | null> = {
      accepted: { label: 'Start Navigation', nextStatus: 'en_route_to_pickup' },
      en_route_to_pickup: { label: 'Arrived at Restaurant', nextStatus: 'arrived_at_pickup' },
      arrived_at_pickup: { label: 'Confirm Pickup', nextStatus: 'picked_up' },
      picked_up: { label: 'Start Delivery', nextStatus: 'en_route_to_dropoff' },
      en_route_to_dropoff: { label: 'Arrived at Customer', nextStatus: 'arrived_at_dropoff' },
      arrived_at_dropoff: null,
    };
    return actions[status];
  };

  const handleAction = async () => {
    const action = getNextAction();
    if (!action) return;

    try {
      const response = await fetch(`/api/deliveries/${delivery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.nextStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update delivery status');
      }

      setStatus(action.nextStatus);
      router.refresh();
    } catch (error) {
      console.error('Error updating delivery:', error);
      alert('Failed to update delivery status');
    }
  };

  const handleComplete = async () => {
    try {
      const response = await fetch(`/api/deliveries/${delivery.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete delivery');
      }

      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Failed to complete delivery');
    }
  };

  const steps = getStatusSteps();
  const action = getNextAction();

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      {/* Header */}
      <div className="bg-brand-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium opacity-90">Active Delivery</p>
            <p className="mt-1 text-[20px] font-bold tracking-tight">
              {order?.order_number ?? 'Loading...'}
            </p>
          </div>
          <div className="rounded-lg bg-white/20 px-4 py-2">
            <p className="text-[18px] font-bold">${delivery.driver_payout.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`h-3 w-3 rounded-full transition-colors ${
                  step.completed ? 'bg-[#22c55e]' : step.current ? 'bg-brand-500' : 'bg-[#e5e7eb]'
                }`}
              />
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 transition-colors ${step.completed ? 'bg-[#22c55e]' : 'bg-[#e5e7eb]'}`}
                />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[14px] font-semibold text-[#1a1a1a]">
          {steps.find((s) => s.current)?.label}
        </p>
      </div>

      {/* Map Placeholder */}
      <div className="flex h-48 items-center justify-center bg-[#e5e7eb]">
        <p className="text-[14px] text-[#6b7280]">Map / Navigation View</p>
      </div>

      {/* Destination Card */}
      <div className="p-4">
        <Card className="border-0 shadow-sm">
          {status.includes('pickup') || status === 'accepted' ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#22c55e]" />
                <h3 className="text-[17px] font-semibold text-[#1a1a1a]">Pickup</h3>
              </div>
              <p className="mt-3 text-[15px] font-medium text-[#1a1a1a]">Restaurant Location</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">
                {delivery.pickup_address}
              </p>
              <Button variant="outline" size="sm" className="mt-4 rounded-lg">
                Call Restaurant
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
                <h3 className="text-[17px] font-semibold text-[#1a1a1a]">Dropoff</h3>
              </div>
              <p className="mt-3 text-[15px] font-medium text-[#1a1a1a]">Customer</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">
                {delivery.dropoff_address}
              </p>
              {order?.special_instructions && (
                <div className="mt-4 rounded-lg bg-[#fef3c7] p-4">
                  <p className="text-[14px] leading-relaxed text-[#92400e]">
                    {order.special_instructions}
                  </p>
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-4 rounded-lg">
                Call Customer
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* Order Details */}
      <div className="p-4 pt-0">
        <Card className="border-0 shadow-sm">
          <h3 className="text-[17px] font-semibold text-[#1a1a1a]">Order Details</h3>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6b7280]">Distance</span>
              <span className="font-medium text-[#1a1a1a]">
                {delivery.distance_km?.toFixed(1) ?? '—'} km
              </span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6b7280]">Delivery Fee</span>
              <span className="font-medium text-[#1a1a1a]">
                ${delivery.delivery_fee.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6b7280]">Your Earnings</span>
              <span className="font-semibold text-[#22c55e]">
                ${delivery.driver_payout.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
        {status === 'arrived_at_dropoff' ? (
          <Button
            className="w-full rounded-lg bg-[#22c55e] py-4 text-[15px] font-semibold hover:bg-[#16a34a]"
            onClick={handleComplete}
          >
            Complete Delivery
          </Button>
        ) : action ? (
          <Button
            className="w-full rounded-lg bg-brand-500 py-4 text-[15px] font-semibold hover:bg-brand-600"
            onClick={handleAction}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
