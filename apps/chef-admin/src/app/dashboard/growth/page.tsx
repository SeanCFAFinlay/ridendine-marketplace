'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@ridendine/utils';
import { TrendingUp, TrendingDown, Minus, Target, BarChart2, Zap } from 'lucide-react';

type Window = 'weeks' | 'months';

interface Period {
  label: string;
  revenue: number;
  orderCount: number;
  uniqueCustomers: number;
}

interface Payload {
  window: Window;
  periods: Period[];
  revenueGrowth: number | null;
  orderGrowth: number | null;
  projectedRevenue: number | null;
  currentRevenue: number;
  previousRevenue: number;
  currentOrders: number;
  previousOrders: number;
  bestPeriodLabel: string;
  bestPeriodRevenue: number;
}

function money(v: number) {
  return formatCurrency(v);
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null)
    return <span className="inline-flex items-center gap-1 text-sm font-medium text-textSubtle">N/A</span>;
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
        <TrendingUp className="h-4 w-4" />+{value.toFixed(1)}%
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-danger">
        <TrendingDown className="h-4 w-4" />{value.toFixed(1)}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-textMuted">
      <Minus className="h-4 w-4" />0%
    </span>
  );
}

function RevenueChart({ periods }: { periods: Period[] }) {
  const max = Math.max(...periods.map((p) => p.revenue), 1);
  const currentIdx = periods.length - 1;
  return (
    <div className="space-y-3">
      <div className="flex h-44 items-end gap-1.5">
        {periods.map((period, i) => {
          const heightPct = (period.revenue / max) * 100;
          const isCurrent = i === currentIdx;
          return (
            <div key={i} className="group relative flex-1">
              <div
                className={`w-full rounded-t transition-opacity ${
                  isCurrent
                    ? 'bg-primary opacity-100'
                    : 'bg-primary opacity-30 group-hover:opacity-60'
                }`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2 py-1 text-xs text-white group-hover:block">
                {period.label}: {money(period.revenue)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-end justify-between gap-1.5">
        {periods.map((period, i) => (
          <div key={i} className="flex-1 text-center">
            <p
              className={`truncate text-[10px] ${
                i === currentIdx ? 'font-semibold text-primary' : 'text-textSubtle'
              }`}
            >
              {period.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersChart({ periods }: { periods: Period[] }) {
  const max = Math.max(...periods.map((p) => p.orderCount), 1);
  const currentIdx = periods.length - 1;
  return (
    <div className="flex h-32 items-end gap-1.5">
      {periods.map((period, i) => {
        const heightPct = (period.orderCount / max) * 100;
        const isCurrent = i === currentIdx;
        return (
          <div key={i} className="group relative flex-1">
            <div
              className={`w-full rounded-t transition-opacity ${
                isCurrent ? 'bg-info opacity-100' : 'bg-info opacity-25 group-hover:opacity-60'
              }`}
              style={{ height: `${Math.max(heightPct, 2)}%` }}
              title={`${period.label}: ${period.orderCount} orders`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function GrowthPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [window, setWindow] = useState<Window>('weeks');

  const fetchData = useCallback(async (w: Window) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/growth?window=${w}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(window);
  }, [window, fetchData]);

  if (loading) return <PageSkeleton />;

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-textMuted">Unable to load growth data. Please try again.</p>
      </div>
    );
  }

  const windowLabel = window === 'weeks' ? 'week' : 'month';
  const projectionLabel =
    window === 'weeks' ? 'Projected this week' : 'Projected this month';

  const statCards = [
    {
      label: window === 'weeks' ? 'This Week Revenue' : 'This Month Revenue',
      value: money(data.currentRevenue),
      badge: <GrowthBadge value={data.revenueGrowth} />,
      sub: `vs ${money(data.previousRevenue)} last ${windowLabel}`,
      accent: 'bg-primarySoft text-primary',
      icon: TrendingUp,
    },
    {
      label: window === 'weeks' ? 'This Week Orders' : 'This Month Orders',
      value: data.currentOrders,
      badge: <GrowthBadge value={data.orderGrowth} />,
      sub: `vs ${data.previousOrders} last ${windowLabel}`,
      accent: 'bg-infoSoft text-info',
      icon: BarChart2,
    },
    {
      label: projectionLabel,
      value: data.projectedRevenue !== null ? money(data.projectedRevenue) : 'N/A',
      badge: null,
      sub: 'Based on pace so far',
      accent: 'bg-successSoft text-success',
      icon: Target,
    },
    {
      label: 'Best Period',
      value: data.bestPeriodLabel,
      badge: null,
      sub: money(data.bestPeriodRevenue),
      accent: 'bg-warningSoft text-warning',
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Business Growth</h1>
          <p className="mt-1 text-sm text-textMuted">
            Track revenue and order trends to understand how your business is growing.
          </p>
        </div>
        <div className="flex gap-2">
          {(['weeks', 'months'] as Window[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                window === w
                  ? 'bg-primary text-white'
                  : 'bg-surfaceMuted text-textMuted hover:text-text'
              }`}
            >
              {w === 'weeks' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-divider bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-textMuted">{card.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-text">{card.value}</p>
              <div className="mt-1 flex items-center gap-2">
                {card.badge}
                <p className="text-xs text-textMuted">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
        <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-text">
                Revenue Trend - Last 8 {window === 'weeks' ? 'Weeks' : 'Months'}
              </h2>
              <p className="mt-0.5 text-xs text-textMuted">
                Current {windowLabel} highlighted in solid
              </p>
            </div>
          </div>
          <div className="mt-5">
            <RevenueChart periods={data.periods} />
          </div>
        </div>

        <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-bold text-text">Order Volume</h2>
            <p className="mt-0.5 text-xs text-textMuted">
              Orders per {windowLabel} over the same window
            </p>
          </div>
          <div className="mt-5">
            <OrdersChart periods={data.periods} />
          </div>
          <div className="mt-4 space-y-2">
            {data.periods
              .slice(-4)
              .reverse()
              .map((period, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-surfaceMuted px-3 py-2"
                >
                  <span className="text-xs text-textMuted">{period.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-text">
                      {period.orderCount} orders
                    </span>
                    <span className="text-xs font-bold text-text">
                      {money(period.revenue)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <h2 className="font-bold text-text">
          Full {window === 'weeks' ? 'Weekly' : 'Monthly'} Breakdown
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-divider text-left text-xs font-medium uppercase tracking-wide text-textSubtle">
                <th className="pb-3">Period</th>
                <th className="pb-3 text-right">Revenue</th>
                <th className="pb-3 text-right">Orders</th>
                <th className="pb-3 text-right">Avg Order</th>
                <th className="pb-3 text-right">Customers</th>
                <th className="pb-3 text-right">vs Previous</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider text-sm">
              {[...data.periods].reverse().map((period, i, arr) => {
                const prev = arr[i + 1];
                const growth =
                  prev && prev.revenue > 0
                    ? ((period.revenue - prev.revenue) / prev.revenue) * 100
                    : null;
                const avg =
                  period.orderCount > 0 ? period.revenue / period.orderCount : 0;
                const isCurrent = i === 0;
                return (
                  <tr
                    key={i}
                    className={isCurrent ? 'bg-primarySoft/30' : 'hover:bg-surfaceMuted/40'}
                  >
                    <td className="py-3">
                      <span className="font-semibold text-text">{period.label}</span>
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-bold text-text">
                      {money(period.revenue)}
                    </td>
                    <td className="py-3 text-right text-textMuted">{period.orderCount}</td>
                    <td className="py-3 text-right text-textMuted">
                      {period.orderCount > 0 ? money(avg) : '-'}
                    </td>
                    <td className="py-3 text-right text-textMuted">
                      {period.uniqueCustomers}
                    </td>
                    <td className="py-3 text-right">
                      <GrowthBadge value={growth} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded-lg bg-surfaceMuted" />
          <div className="mt-2 h-4 w-72 rounded bg-surfaceMuted" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-lg bg-surfaceMuted" />
          <div className="h-9 w-20 rounded-lg bg-surfaceMuted" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-divider bg-white p-5 shadow-sm">
            <div className="h-4 w-28 rounded bg-surfaceMuted" />
            <div className="mt-3 h-9 w-24 rounded bg-surfaceMuted" />
            <div className="mt-2 h-3 w-20 rounded bg-surfaceMuted" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="h-5 w-56 rounded bg-surfaceMuted" />
        <div className="mt-5 flex h-44 items-end gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-surfaceMuted"
              style={{ height: `${20 + i * 9}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
