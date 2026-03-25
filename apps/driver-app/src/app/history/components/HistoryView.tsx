'use client';

import Link from 'next/link';
import { Card, Badge } from '@ridendine/ui';
import type { Delivery } from '@ridendine/db';

interface HistoryViewProps {
  deliveries: Delivery[];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

function groupDeliveries(deliveries: Delivery[]) {
  const grouped: Record<string, Delivery[]> = {};

  deliveries.forEach((delivery) => {
    if (!delivery.actual_dropoff_at) return;

    const date = formatDate(delivery.actual_dropoff_at);
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(delivery);
  });

  return grouped;
}

export default function HistoryView({ deliveries }: HistoryViewProps) {
  const groupedDeliveries = groupDeliveries(deliveries);
  const dateGroups = Object.keys(groupedDeliveries);

  const totalEarnings = deliveries.reduce((sum, d) => sum + d.driver_payout, 0);
  const totalDeliveries = deliveries.length;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Header */}
      <div className="bg-brand-600 p-6 text-white">
        <h1 className="text-[22px] font-bold tracking-tight">Delivery History</h1>
        <div className="mt-4 flex items-center gap-6">
          <div>
            <p className="text-[13px] text-white/80">Total Deliveries</p>
            <p className="mt-1 text-[24px] font-bold">{totalDeliveries}</p>
          </div>
          <div>
            <p className="text-[13px] text-white/80">Total Earned</p>
            <p className="mt-1 text-[24px] font-bold">${totalEarnings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Delivery History */}
      <div className="p-4">
        {dateGroups.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <div className="py-12 text-center">
              <p className="text-[15px] text-[#6b7280]">No completed deliveries yet</p>
              <p className="mt-2 text-[13px] text-[#9ca3af]">
                Your delivery history will appear here
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {dateGroups.map((date) => (
              <Card key={date} className="border-0 shadow-sm">
                <h2 className="text-[15px] font-semibold text-[#1a1a1a]">{date}</h2>
                <div className="mt-4 space-y-3">
                  {groupedDeliveries[date]?.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="flex items-start justify-between border-b border-[#f5f5f5] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-medium text-[#1a1a1a]">
                            {delivery.dropoff_address.split(',')[0]}
                          </p>
                          <Badge
                            variant={getStatusColor(delivery.status)}
                            className="text-[11px]"
                          >
                            {delivery.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[13px] text-[#6b7280]">
                          {delivery.actual_dropoff_at
                            ? formatTime(delivery.actual_dropoff_at)
                            : '—'}
                        </p>
                        <p className="mt-1 text-[13px] text-[#9ca3af]">
                          {delivery.distance_km?.toFixed(1) ?? '—'} km
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[17px] font-semibold text-[#22c55e]">
                          ${delivery.driver_payout.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#e5e7eb] bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home', href: '/', active: false },
            { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'History', href: '/history', active: true },
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
