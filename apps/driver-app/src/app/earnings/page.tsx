'use client';

export const dynamic = 'force-dynamic';

import { Card, Badge } from '@ridendine/ui';

const weeklyEarnings = [
  { day: 'Mon', amount: 45.50, deliveries: 4 },
  { day: 'Tue', amount: 62.00, deliveries: 5 },
  { day: 'Wed', amount: 38.25, deliveries: 3 },
  { day: 'Thu', amount: 78.50, deliveries: 6 },
  { day: 'Fri', amount: 95.00, deliveries: 8 },
  { day: 'Sat', amount: 112.50, deliveries: 9 },
  { day: 'Sun', amount: 0, deliveries: 0 },
];

const recentDeliveries = [
  { id: '1', time: '2:30 PM', restaurant: "Maria's Kitchen", earnings: 8.50, tip: 3.00 },
  { id: '2', time: '1:45 PM', restaurant: 'Thai Home', earnings: 7.25, tip: 2.50 },
  { id: '3', time: '12:30 PM', restaurant: "Nonna's Table", earnings: 9.00, tip: 4.00 },
  { id: '4', time: '11:15 AM', restaurant: 'Soul Kitchen', earnings: 6.75, tip: 2.00 },
];

export default function EarningsPage() {
  const totalWeek = weeklyEarnings.reduce((sum, d) => sum + d.amount, 0);
  const totalDeliveries = weeklyEarnings.reduce((sum, d) => sum + d.deliveries, 0);
  const maxAmount = Math.max(...weeklyEarnings.map(d => d.amount));

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-brand-600 p-4 text-white">
        <h1 className="text-xl font-bold">Earnings</h1>
      </div>

      {/* Weekly Summary */}
      <div className="p-4">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">This Week</h2>
            <Badge variant="success">{totalDeliveries} deliveries</Badge>
          </div>

          <p className="mt-4 text-4xl font-bold text-green-600">
            ${totalWeek.toFixed(2)}
          </p>

          {/* Bar Chart */}
          <div className="mt-6 flex items-end justify-between gap-2">
            {weeklyEarnings.map((day) => (
              <div key={day.day} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 rounded-t bg-brand-500"
                  style={{
                    height: maxAmount > 0 ? `${(day.amount / maxAmount) * 80}px` : '4px',
                    minHeight: day.amount > 0 ? '4px' : '4px',
                    backgroundColor: day.amount > 0 ? undefined : '#e5e7eb',
                  }}
                />
                <span className="text-xs text-gray-500">{day.day}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Today's Deliveries */}
      <div className="p-4 pt-0">
        <Card>
          <h2 className="font-semibold text-gray-900">Today&apos;s Deliveries</h2>
          <div className="mt-4 space-y-3">
            {recentDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{delivery.restaurant}</p>
                  <p className="text-sm text-gray-500">{delivery.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${(delivery.earnings + delivery.tip).toFixed(2)}
                  </p>
                  <p className="text-sm text-green-600">+${delivery.tip.toFixed(2)} tip</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Payout Info */}
      <div className="p-4 pt-0">
        <Card>
          <h2 className="font-semibold text-gray-900">Next Payout</h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalWeek.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Processing Monday</p>
            </div>
            <Badge variant="info">Weekly</Badge>
          </div>
        </Card>
      </div>

      {/* Bottom Navigation - same as home */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white safe-bottom">
        <div className="flex justify-around py-2">
          {[
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home', active: false },
            { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'History', active: false },
            { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Earnings', active: true },
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
