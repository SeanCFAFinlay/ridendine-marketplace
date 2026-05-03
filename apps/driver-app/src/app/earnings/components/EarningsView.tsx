'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';
import type { Delivery } from '@ridendine/db';

interface EarningsViewProps {
  deliveries: Delivery[];
  /** Ledger-derived driver_payable balance (cents). */
  availableBalanceCents?: number;
  instantPayoutsEnabled?: boolean;
}

function getWeeklyEarnings(deliveries: Delivery[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = days.map((day, index) => ({ day, amount: 0, deliveries: 0, dayIndex: index }));

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  deliveries.forEach((delivery) => {
    if (!delivery.actual_dropoff_at) return;

    const deliveryDate = new Date(delivery.actual_dropoff_at);
    if (deliveryDate >= startOfWeek && deliveryDate <= today) {
      const dayIndex = deliveryDate.getDay();
      const dayData = weeklyData[dayIndex];
      if (dayData) {
        dayData.amount += delivery.driver_payout;
        dayData.deliveries += 1;
      }
    }
  });

  return weeklyData;
}

function getTodayDeliveries(deliveries: Delivery[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return deliveries.filter((delivery) => {
    if (!delivery.actual_dropoff_at) return false;
    const deliveryDate = new Date(delivery.actual_dropoff_at);
    return deliveryDate >= today;
  });
}

function instantFeeCents(amountCents: number): number {
  return Math.round((amountCents * 150) / 10_000);
}

export default function EarningsView({
  deliveries,
  availableBalanceCents = 0,
  instantPayoutsEnabled = false,
}: EarningsViewProps) {
  const weeklyEarnings = getWeeklyEarnings(deliveries);
  const todayDeliveries = getTodayDeliveries(deliveries);

  const totalWeek = weeklyEarnings.reduce((sum, d) => sum + d.amount, 0);
  const totalDeliveries = weeklyEarnings.reduce((sum, d) => sum + d.deliveries, 0);
  const maxAmount = Math.max(...weeklyEarnings.map((d) => d.amount), 1);

  const [amountStr, setAmountStr] = useState('');
  const [busy, setBusy] = useState(false);
  const [instantMsg, setInstantMsg] = useState<string | null>(null);

  async function requestInstant() {
    const cents = Math.round(parseFloat(amountStr) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setInstantMsg('Enter a valid dollar amount.');
      return;
    }
    if (cents > availableBalanceCents) {
      setInstantMsg('Amount exceeds available balance.');
      return;
    }
    setBusy(true);
    setInstantMsg(null);
    try {
      const res = await fetch('/api/payouts/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: cents }),
      });
      const body = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !body.success) {
        setInstantMsg(body.error?.message ?? 'Request failed');
        return;
      }
      setInstantMsg('Request submitted. Ops will execute the Stripe payout; 1.5% fee applies.');
      setAmountStr('');
    } catch {
      setInstantMsg('Network error');
    } finally {
      setBusy(false);
    }
  }

  const previewCents = Math.round(parseFloat(amountStr || '0') * 100);
  const previewFee = Number.isFinite(previewCents) && previewCents > 0 ? instantFeeCents(previewCents) : 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      {/* Header */}
      <div className="bg-brand-600 p-6 text-white">
        <h1 className="text-[22px] font-bold tracking-tight">Earnings</h1>
      </div>

      {/* Weekly Summary */}
      <div className="p-4">
        <Card className="border-0 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-[#1a1a1a]">This Week</h2>
            <Badge variant="success" className="bg-[#f0fdf4] text-[#15803d]">
              {totalDeliveries} deliveries
            </Badge>
          </div>

          <p className="mt-6 text-[40px] font-bold leading-tight text-[#22c55e]">
            ${totalWeek.toFixed(2)}
          </p>

          {/* Bar Chart */}
          <div className="mt-8 flex items-end justify-between gap-2">
            {weeklyEarnings.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: maxAmount > 0 ? `${(day.amount / maxAmount) * 100}px` : '4px',
                    minHeight: day.amount > 0 ? '8px' : '4px',
                    backgroundColor: day.amount > 0 ? '#ed751b' : '#e5e7eb',
                  }}
                />
                <span className="text-[12px] font-medium text-[#6b7280]">{day.day}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Today's Deliveries */}
      <div className="p-4 pt-0">
        <Card className="border-0 shadow-sm">
          <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Today&apos;s Deliveries</h2>
          {todayDeliveries.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[14px] text-[#6b7280]">No deliveries yet today</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {todayDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between border-b border-[#f5f5f5] pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <p className="text-[15px] font-medium text-[#1a1a1a]">
                      {delivery.dropoff_address.split(',')[0]}
                    </p>
                    <p className="mt-1 text-[13px] text-[#6b7280]">
                      {delivery.actual_dropoff_at
                        ? new Date(delivery.actual_dropoff_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[17px] font-semibold text-[#1a1a1a]">
                      ${delivery.driver_payout.toFixed(2)}
                    </p>
                    <p className="mt-1 text-[13px] text-[#6b7280]">
                      {delivery.distance_km?.toFixed(1) ?? '—'} km
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Payout Info */}
      <div className="p-4 pt-0">
        <Card className="border-0 shadow-sm">
          <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Next Payout</h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-[32px] font-bold leading-tight text-[#1a1a1a]">
                ${totalWeek.toFixed(2)}
              </p>
              <p className="mt-1 text-[14px] text-[#6b7280]">Scheduled payouts (see Settings)</p>
            </div>
            <Badge variant="info" className="bg-[#eff6ff] text-[#1e40af]">
              Weekly
            </Badge>
          </div>
        </Card>
      </div>

      <div className="p-4 pt-0">
        <Card className="border-0 shadow-sm">
          <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Available balance</h2>
          <p className="mt-1 text-[28px] font-bold text-[#15803d]">
            ${(availableBalanceCents / 100).toFixed(2)}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#6b7280]">
            From your driver payable ledger account (same source ops uses for payouts).
          </p>
        </Card>
      </div>

      {instantPayoutsEnabled ? (
        <div className="p-4 pt-0">
          <Card className="border-0 shadow-sm">
            <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Instant payout</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6b7280]">
              Fee is <span className="font-semibold text-[#1a1a1a]">1.5%</span> of the amount you request, taken from
              your balance before transfer. You submit a request here; finance executes it in ops-admin.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-[13px] text-[#374151]">
                Amount (USD)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-[15px]"
                  placeholder="0.00"
                />
              </label>
              <Button type="button" disabled={busy} onClick={() => void requestInstant()}>
                {busy ? 'Submitting…' : 'Request instant payout'}
              </Button>
            </div>
            {previewCents > 0 ? (
              <p className="mt-3 text-[13px] text-[#6b7280]">
                Estimated fee: <span className="font-semibold text-[#1a1a1a]">${(previewFee / 100).toFixed(2)}</span>{' '}
                (1.5%)
              </p>
            ) : null}
            {instantMsg ? <p className="mt-3 text-[13px] text-[#b45309]">{instantMsg}</p> : null}
            <Link href="/settings" className="mt-4 inline-block text-[14px] font-medium text-brand-600">
              Payout settings
            </Link>
          </Card>
        </div>
      ) : (
        <div className="p-4 pt-0">
          <Card className="border-0 shadow-sm">
            <p className="text-[14px] text-[#6b7280]">
              Enable instant payouts in{' '}
              <Link href="/settings" className="font-medium text-brand-600">
                Settings
              </Link>{' '}
              to request on-demand transfers (1.5% fee).
            </p>
          </Card>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#e5e7eb] bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Home', href: '/', active: false },
            { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'History', href: '/history', active: false },
            { icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Earnings', href: '/earnings', active: true },
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
