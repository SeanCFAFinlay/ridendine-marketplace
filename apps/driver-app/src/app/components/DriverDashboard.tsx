'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Button, Badge } from '@ridendine/ui';
import type { Driver, Delivery } from '@ridendine/db';

interface DriverDashboardProps {
  driver: Driver;
  activeDeliveries: Delivery[];
}

export default function DriverDashboard({ driver, activeDeliveries }: DriverDashboardProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const currentDelivery = activeDeliveries[0];

  const toggleOnlineStatus = async () => {
    setIsTogglingStatus(true);
    try {
      const newStatus = isOnline ? 'offline' : 'online';
      const response = await fetch('/api/driver/presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setIsOnline(!isOnline);
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update online status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const todayStats = {
    deliveries: 0,
    earnings: 0,
    hours: 0,
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Status Bar - Clean green indicator when online */}
      <div className={`p-6 transition-colors duration-300 ${isOnline ? 'bg-[#22c55e]' : 'bg-[#64748b]'}`}>
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-[14px] font-medium opacity-90">Status</p>
            <div className="mt-1 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-white' : 'bg-white/60'}`} />
              <p className="text-[20px] font-semibold tracking-tight">{isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <Button
            variant={isOnline ? 'secondary' : 'default'}
            onClick={toggleOnlineStatus}
            disabled={isTogglingStatus}
            className="rounded-lg px-6"
          >
            {isTogglingStatus ? 'Updating...' : `Go ${isOnline ? 'Offline' : 'Online'}`}
          </Button>
        </div>
      </div>

      {/* Today's Summary - Card-based UI */}
      <div className="p-4">
        <Card className="border-0 shadow-sm">
          <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Today&apos;s Summary</h2>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-[28px] font-bold text-brand-600">{todayStats.deliveries}</p>
              <p className="mt-1 text-[13px] text-[#6b7280]">Deliveries</p>
            </div>
            <div className="text-center">
              <p className="text-[28px] font-bold text-[#22c55e]">${todayStats.earnings.toFixed(2)}</p>
              <p className="mt-1 text-[13px] text-[#6b7280]">Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-[28px] font-bold text-[#1a1a1a]">{todayStats.hours.toFixed(1)}</p>
              <p className="mt-1 text-[13px] text-[#6b7280]">Hours</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Delivery */}
      {currentDelivery && isOnline && (
        <div className="p-4">
          <Card className="border-2 border-brand-500 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Active Delivery</h2>
              <Badge variant="warning" className="bg-[#fef3c7] text-[#92400e]">
                In Progress
              </Badge>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-[#22c55e]" />
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[#1a1a1a]">Pickup Location</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">
                    {currentDelivery.pickup_address}
                  </p>
                </div>
              </div>
              <div className="ml-1.5 h-8 w-0.5 bg-[#e5e7eb]" />
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-[#ef4444]" />
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-[#1a1a1a]">Dropoff Location</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-[#6b7280]">
                    {currentDelivery.dropoff_address}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl bg-[#FAFAFA] p-4">
              <div>
                <p className="text-[13px] text-[#6b7280]">Distance</p>
                <p className="mt-1 text-[15px] font-semibold">
                  {currentDelivery.distance_km?.toFixed(1) ?? '—'} km
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-[#6b7280]">Earnings</p>
                <p className="mt-1 text-[22px] font-bold text-[#22c55e]">
                  ${currentDelivery.driver_payout.toFixed(2)}
                </p>
              </div>
            </div>

            <Link href={`/delivery/${currentDelivery.id}`} className="mt-4 block">
              <Button className="w-full rounded-lg bg-brand-500 py-3 text-[15px] font-semibold hover:bg-brand-600">
                View Details
              </Button>
            </Link>
          </Card>
        </div>
      )}

      {/* Online but no deliveries */}
      {isOnline && !currentDelivery && (
        <div className="p-4">
          <Card className="border-0 shadow-sm">
            <div className="py-12 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f0fdf4]">
                <svg className="h-10 w-10 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-6 text-[17px] font-semibold text-[#1a1a1a]">You&apos;re Online</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6b7280]">
                Waiting for delivery requests...
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Offline state */}
      {!isOnline && (
        <div className="p-4">
          <Card className="border-0 shadow-sm">
            <div className="py-12 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f5f5f5]">
                <svg className="h-10 w-10 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
                </svg>
              </div>
              <h3 className="mt-6 text-[17px] font-semibold text-[#1a1a1a]">You&apos;re Offline</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[#6b7280]">
                Go online to start receiving delivery requests
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#e5e7eb] bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home', href: '/', active: true },
            { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'History', href: '/history', active: false },
            { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Earnings', href: '/earnings', active: false },
            { icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Profile', href: '/profile', active: false },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                item.active ? 'text-brand-600' : 'text-[#9ca3af]'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-[12px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
