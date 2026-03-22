'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card, Button, Badge } from '@ridendine/ui';

type DeliveryStatus = 'accepted' | 'en_route_to_pickup' | 'arrived_at_pickup' | 'picked_up' | 'en_route_to_dropoff' | 'arrived_at_dropoff';

export default function ActiveDeliveryPage() {
  const [status, setStatus] = useState<DeliveryStatus>('accepted');

  const delivery = {
    orderNumber: 'RD-ABC123',
    pickup: {
      name: "Maria's Kitchen",
      address: '456 Chef Lane, Austin TX 78701',
      phone: '(555) 123-4567',
    },
    dropoff: {
      name: 'John D.',
      address: '123 Main Street, Austin TX 78702',
      phone: '(555) 987-6543',
      instructions: 'Gate code: 1234. Leave at door.',
    },
    items: '3 items',
    earnings: 8.50,
  };

  const getStatusSteps = () => {
    const steps = [
      { id: 'accepted', label: 'Accepted' },
      { id: 'en_route_to_pickup', label: 'En Route to Pickup' },
      { id: 'arrived_at_pickup', label: 'At Restaurant' },
      { id: 'picked_up', label: 'Picked Up' },
      { id: 'en_route_to_dropoff', label: 'En Route to Customer' },
      { id: 'arrived_at_dropoff', label: 'At Customer' },
    ];
    const currentIndex = steps.findIndex(s => s.id === status);
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

  const handleAction = () => {
    const action = getNextAction();
    if (action) {
      setStatus(action.nextStatus);
    }
  };

  const steps = getStatusSteps();
  const action = getNextAction();

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-brand-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Active Delivery</p>
            <p className="text-lg font-bold">{delivery.orderNumber}</p>
          </div>
          <Badge variant="success" className="bg-white/20 text-white">
            ${delivery.earnings.toFixed(2)}
          </Badge>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`h-3 w-3 rounded-full ${
                  step.completed ? 'bg-green-500' :
                  step.current ? 'bg-brand-500' : 'bg-gray-300'
                }`}
              />
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-sm font-medium text-gray-900">
          {steps.find(s => s.current)?.label}
        </p>
      </div>

      {/* Map Placeholder */}
      <div className="h-48 bg-gray-300 flex items-center justify-center">
        <p className="text-gray-500">Map / Navigation View</p>
      </div>

      {/* Destination Card */}
      <div className="p-4">
        <Card>
          {status.includes('pickup') || status === 'accepted' ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <h3 className="font-semibold text-gray-900">Pickup</h3>
              </div>
              <p className="mt-2 font-medium text-gray-900">{delivery.pickup.name}</p>
              <p className="text-sm text-gray-500">{delivery.pickup.address}</p>
              <Button variant="outline" size="sm" className="mt-3">
                Call Restaurant
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <h3 className="font-semibold text-gray-900">Dropoff</h3>
              </div>
              <p className="mt-2 font-medium text-gray-900">{delivery.dropoff.name}</p>
              <p className="text-sm text-gray-500">{delivery.dropoff.address}</p>
              {delivery.dropoff.instructions && (
                <div className="mt-3 rounded-lg bg-yellow-50 p-3">
                  <p className="text-sm text-yellow-800">{delivery.dropoff.instructions}</p>
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-3">
                Call Customer
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* Order Details */}
      <div className="p-4 pt-0">
        <Card>
          <h3 className="font-semibold text-gray-900">Order Details</h3>
          <p className="mt-2 text-sm text-gray-600">{delivery.items}</p>
        </Card>
      </div>

      {/* Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg safe-bottom">
        {status === 'arrived_at_dropoff' ? (
          <Button className="w-full" variant="success">
            Complete Delivery
          </Button>
        ) : action ? (
          <Button className="w-full" onClick={handleAction}>
            {action.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
