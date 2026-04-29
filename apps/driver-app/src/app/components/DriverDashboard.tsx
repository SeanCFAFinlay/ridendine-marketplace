'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Driver, Delivery } from '@ridendine/db';
import { OfferAlert } from '@/components/offer-alert';

interface DriverDashboardProps {
  driver: Driver;
  activeDeliveries: Delivery[];
}

const NAV_ITEMS = [
  {
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    label: 'Home',
    href: '/',
  },
  {
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    label: 'History',
    href: '/history',
  },
  {
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    label: 'Earnings',
    href: '/earnings',
  },
  {
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    label: 'Profile',
    href: '/profile',
  },
];

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

      if (!response.ok) throw new Error('Failed to update status');
      setIsOnline(!isOnline);
    } catch (error) {
      console.error('Error toggling status:', error);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const [todayStats, setTodayStats] = useState({ deliveries: 0, earnings: 0, hours: 0 });

  useEffect(() => {
    async function fetchTodayStats() {
      try {
        const response = await fetch('/api/earnings');
        if (response.ok) {
          const data = await response.json();
          setTodayStats({
            deliveries: data.today?.count ?? 0,
            earnings: data.today?.earnings ?? 0,
            hours: 0,
          });
        }
      } catch {
        // Keep defaults on error
      }
    }
    fetchTodayStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24">
      <OfferAlert isOnline={isOnline} />
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-icon.png"
              alt="RideNDine"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <div>
              <span className="text-base font-bold">
                <span className="text-[#1a7a6e]">RideN</span>
                <span className="text-[#E85D26]">Dine</span>
              </span>
              <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                Driver
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">
              {driver ? `${driver.first_name} ${driver.last_name}` : 'Driver'}
            </p>
            <p className="text-xs text-gray-400">Hamilton, ON</p>
          </div>
        </div>
      </div>

      {/* Online/Offline Toggle */}
      <div
        className={`px-5 py-5 transition-colors duration-300 ${
          isOnline
            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
            : 'bg-gradient-to-r from-gray-500 to-gray-600'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="text-sm font-medium opacity-80">Driver Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  isOnline ? 'bg-white animate-pulse' : 'bg-white/50'
                }`}
              />
              <p className="text-2xl font-bold tracking-tight">
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleOnlineStatus}
            disabled={isTogglingStatus}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-60 ${
              isOnline
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isTogglingStatus ? 'Updating...' : isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Today&apos;s Summary</h2>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#E85D26]">{todayStats.deliveries}</p>
              <p className="mt-1 text-xs font-medium text-gray-500">Deliveries</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-3xl font-bold text-green-600">
                ${todayStats.earnings.toFixed(2)}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-500">Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{todayStats.hours.toFixed(1)}</p>
              <p className="mt-1 text-xs font-medium text-gray-500">Hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Delivery Card */}
      {currentDelivery && isOnline && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl border-2 border-[#E85D26] bg-white p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Active Delivery</h2>
              <span className="rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-semibold text-[#E85D26]">
                In Progress
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Pickup</p>
                  <p className="text-sm text-gray-500">{currentDelivery.pickup_address}</p>
                </div>
              </div>
              <div className="ml-1.5 h-6 w-px bg-gray-200 ml-[5px]" />
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Dropoff</p>
                  <p className="text-sm text-gray-500">{currentDelivery.dropoff_address}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 p-3">
              <div>
                <p className="text-xs text-gray-500">Distance</p>
                <p className="text-sm font-bold text-gray-900">
                  {currentDelivery.distance_km?.toFixed(1) ?? '—'} km
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Earnings</p>
                <p className="text-xl font-bold text-green-600">
                  ${Number(currentDelivery.driver_payout).toFixed(2)}
                </p>
              </div>
            </div>

            <Link href={`/delivery/${currentDelivery.id}`} className="mt-4 block">
              <button className="w-full rounded-xl bg-[#E85D26] py-3 text-sm font-semibold text-white hover:bg-[#d44e1e]">
                View Delivery Details →
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* Waiting state */}
      {isOnline && !currentDelivery && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">You&apos;re Online!</h3>
            <p className="mt-2 text-sm text-gray-500">
              Waiting for delivery requests from RideNDine chefs...
            </p>
          </div>
        </div>
      )}

      {/* Offline state */}
      {!isOnline && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">You&apos;re Offline</h3>
            <p className="mt-2 text-sm text-gray-500">
              Tap &quot;Go Online&quot; to start receiving delivery requests
            </p>
            <button
              onClick={toggleOnlineStatus}
              className="mt-4 rounded-xl bg-[#E85D26] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#d44e1e]"
            >
              Go Online
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/earnings">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-[#E85D26]/30 transition-colors">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">My Earnings</p>
              <p className="text-xs text-gray-500">View payout history</p>
            </div>
          </Link>
          <Link href="/history">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 hover:border-[#E85D26]/30 transition-colors">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Delivery History</p>
              <p className="text-xs text-gray-500">Past deliveries</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white shadow-lg">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map((item, idx) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 ${
                idx === 0 ? 'text-[#E85D26]' : 'text-gray-400'
              }`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
