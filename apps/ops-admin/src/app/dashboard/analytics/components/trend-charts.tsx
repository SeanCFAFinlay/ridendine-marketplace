'use client';

import { useState, useEffect } from 'react';
import { Card } from '@ridendine/ui';

interface TrendDay {
  date: string;
  orders: number;
  revenue: number;
  completed: number;
  cancelled: number;
}

interface ChefEntry {
  name: string;
  revenue: number;
}

interface HourEntry {
  hour: number;
  orders: number;
}

interface TrendSummary {
  totalOrders: number;
  totalRevenue: number;
  avgDailyOrders: number;
  completionRate: number;
}

interface TrendData {
  trend: TrendDay[];
  topChefs: ChefEntry[];
  peakHours: HourEntry[];
  summary: TrendSummary;
}

const PERIOD_OPTIONS = [7, 14, 30, 90] as const;

function BarChart({
  bars,
  maxValue,
  colorClass,
  tooltip,
}: {
  bars: number[];
  maxValue: number;
  colorClass: string;
  tooltip: (index: number) => string;
}) {
  return (
    <div className="flex items-end gap-px h-40">
      {bars.map((value, i) => (
        <div key={i} className="flex-1 group relative">
          <div
            className={`${colorClass} rounded-t transition-colors`}
            style={{ height: `${(value / maxValue) * 100}%`, minHeight: value > 0 ? '2px' : '0' }}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
            <div className="rounded bg-gray-900 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
              {tooltip(i)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryKPIs({ summary }: { summary: TrendSummary }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <Card className="border-gray-800 bg-opsPanel p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Total Orders</p>
        <p className="mt-1 text-2xl font-bold text-white">{summary.totalOrders}</p>
      </Card>
      <Card className="border-gray-800 bg-opsPanel p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Revenue</p>
        <p className="mt-1 text-2xl font-bold text-emerald-400">${summary.totalRevenue.toFixed(2)}</p>
      </Card>
      <Card className="border-gray-800 bg-opsPanel p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Daily Orders</p>
        <p className="mt-1 text-2xl font-bold text-blue-400">{summary.avgDailyOrders}</p>
      </Card>
      <Card className="border-gray-800 bg-opsPanel p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Completion Rate</p>
        <p className="mt-1 text-2xl font-bold text-white">{summary.completionRate}%</p>
      </Card>
    </div>
  );
}

function TopChefsChart({ chefs }: { chefs: ChefEntry[] }) {
  if (chefs.length === 0) {
    return <p className="text-sm text-gray-500">No data for this period.</p>;
  }

  const maxRev = chefs[0]?.revenue || 1;
  return (
    <div className="space-y-2">
      {chefs.map((chef, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-5 text-xs text-gray-500 text-right">{i + 1}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm text-white">{chef.name}</span>
              <span className="text-sm font-medium text-emerald-400">${chef.revenue.toFixed(2)}</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E85D26] rounded-full"
                style={{ width: `${(chef.revenue / maxRev) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-48 bg-gray-700/20 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export function TrendCharts() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/trends?days=${days}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-sm text-gray-500">Failed to load analytics.</p>;

  const maxOrders = Math.max(...data.trend.map(d => d.orders), 1);
  const maxRevenue = Math.max(...data.trend.map(d => d.revenue), 1);
  const maxHourOrders = Math.max(...data.peakHours.map(d => d.orders), 1);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              days === d ? 'bg-[#E85D26] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      <SummaryKPIs summary={data.summary} />

      <Card className="border-gray-800 bg-opsPanel p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Order Volume</h3>
        <BarChart
          bars={data.trend.map(d => d.orders)}
          maxValue={maxOrders}
          colorClass="bg-blue-500/80 hover:bg-blue-400"
          tooltip={i => `${data.trend[i]?.date}: ${data.trend[i]?.orders} orders`}
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
          <span>{data.trend[0]?.date}</span>
          <span>{data.trend[data.trend.length - 1]?.date}</span>
        </div>
      </Card>

      <Card className="border-gray-800 bg-opsPanel p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Revenue</h3>
        <BarChart
          bars={data.trend.map(d => d.revenue)}
          maxValue={maxRevenue}
          colorClass="bg-emerald-500/80 hover:bg-emerald-400"
          tooltip={i => `${data.trend[i]?.date}: $${data.trend[i]?.revenue?.toFixed(2)}`}
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
          <span>{data.trend[0]?.date}</span>
          <span>{data.trend[data.trend.length - 1]?.date}</span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-gray-800 bg-opsPanel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Chefs by Revenue</h3>
          <TopChefsChart chefs={data.topChefs} />
        </Card>

        <Card className="border-gray-800 bg-opsPanel p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Order Volume by Hour</h3>
          <div className="flex items-end gap-1 h-32">
            {data.peakHours.map(h => (
              <div key={h.hour} className="flex-1 group relative">
                <div
                  className={`rounded-t transition-colors ${
                    h.orders === maxHourOrders ? 'bg-[#E85D26]' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  style={{ height: `${(h.orders / maxHourOrders) * 100}%`, minHeight: h.orders > 0 ? '2px' : '0' }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="rounded bg-gray-900 px-2 py-1 text-[10px] text-white whitespace-nowrap shadow-lg">
                    {h.hour}:00 — {h.orders} orders
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-gray-500">
            <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
