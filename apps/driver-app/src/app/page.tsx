'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card, Button, Badge } from '@ridendine/ui';

export default function DriverHomePage() {
  const [isOnline, setIsOnline] = useState(false);

  const todayStats = {
    deliveries: 5,
    earnings: 78.50,
    hours: 3.5,
  };

  const availableOffer = isOnline ? {
    id: '1',
    orderNumber: 'RD-ABC123',
    pickup: "Maria's Kitchen",
    pickupAddress: '456 Chef Lane',
    dropoff: '123 Main Street',
    distance: 2.3,
    estimatedEarnings: 8.50,
    expiresIn: 45,
  } : null;

  return (
    <div className="min-h-screen pb-20">
      {/* Status Bar */}
      <div className={`p-4 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}>
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-sm opacity-80">Status</p>
            <p className="text-lg font-bold">{isOnline ? 'Online' : 'Offline'}</p>
          </div>
          <Button
            variant={isOnline ? 'secondary' : 'default'}
            onClick={() => setIsOnline(!isOnline)}
          >
            Go {isOnline ? 'Offline' : 'Online'}
          </Button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="p-4">
        <Card>
          <h2 className="font-semibold text-gray-900">Today&apos;s Summary</h2>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-brand-600">{todayStats.deliveries}</p>
              <p className="text-sm text-gray-500">Deliveries</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">${todayStats.earnings.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Earnings</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayStats.hours}</p>
              <p className="text-sm text-gray-500">Hours</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Available Offer */}
      {availableOffer && (
        <div className="p-4">
          <Card className="border-2 border-brand-500">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">New Delivery</h2>
              <Badge variant="warning">Expires in {availableOffer.expiresIn}s</Badge>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium text-gray-900">{availableOffer.pickup}</p>
                  <p className="text-sm text-gray-500">{availableOffer.pickupAddress}</p>
                </div>
              </div>
              <div className="ml-1.5 h-6 w-0.5 bg-gray-300" />
              <div className="flex items-start gap-3">
                <div className="mt-1 h-3 w-3 rounded-full bg-red-500" />
                <div>
                  <p className="font-medium text-gray-900">Customer</p>
                  <p className="text-sm text-gray-500">{availableOffer.dropoff}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div>
                <p className="text-sm text-gray-500">Distance</p>
                <p className="font-medium">{availableOffer.distance} km</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Est. Earnings</p>
                <p className="text-xl font-bold text-green-600">${availableOffer.estimatedEarnings.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full">Reject</Button>
              <Button className="w-full">Accept</Button>
            </div>
          </Card>
        </div>
      )}

      {/* No offers state */}
      {isOnline && !availableOffer && (
        <div className="p-4">
          <Card>
            <div className="py-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">You&apos;re Online</h3>
              <p className="mt-1 text-sm text-gray-500">
                Waiting for delivery requests...
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Offline state */}
      {!isOnline && (
        <div className="p-4">
          <Card>
            <div className="py-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">You&apos;re Offline</h3>
              <p className="mt-1 text-sm text-gray-500">
                Go online to start receiving delivery requests
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white safe-bottom">
        <div className="flex justify-around py-2">
          {[
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home', active: true },
            { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'History', active: false },
            { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Earnings', active: false },
            { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Profile', active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                item.active ? 'text-brand-600' : 'text-gray-400'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
