'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@ridendine/ui';

type Period = 'week' | 'month' | 'year';

interface ComparisonData {
  revenueChange: number | null;
  orderChange: number | null;
  avgOrderValueChange: number | null;
  customersChange: number | null;
  prevRevenue: number;
  prevOrderCount: number;
}

interface AnalyticsPayload {
  period: Period;
  revenue: number;
  orderCount: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  repeatCustomerRate: number;
  cancellationRate: number;
  avgRating: number | null;
  peakHour: number;
  peakHourLabel: string;
  comparison: ComparisonData;
  hourlyOrders: Array<{ hour: number; count: number }>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  topItems: Array<{ name: string; count: number; revenue: number }>;
}

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-textSubtle">N/A vs prev</span>;
  const isPositive = value > 0;
  const isNeutral = value === 0;
  if (isNeutral) return <span className="text-xs text-textSubtle">0% vs prev</span>;
  return (
    <span className={`text-xs font-medium flex items-center gap-0.5 ${isPositive ? 'text-success' : 'text-danger'}`}>
      {isPositive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}% vs prev
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  change,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: number | null;
}) {
  return (
    <Card>
      <p className="text-sm text-textMuted">{label}</p>
      <p className="mt-1 text-3xl font-bold text-text">{value}</p>
      {sub && <p className="mt-1 text-sm text-textSubtle">{sub}</p>}
      {change !== undefined && (
        <div className="mt-1">
          <ChangeIndicator value={change} />
        </div>
      )}
    </Card>
  );
}

function BarChart({
  bars,
  color,
  highlightIndex,
}: {
  bars: Array<{ height: number; label: string; isHighlight?: boolean }>;
  color: string;
  highlightIndex?: number;
}) {
  const heights = bars.map((b) => Number(b.height) || 0);
  const max = Math.max(...heights, 1);
  return (
    <div className="h-48 flex items-end gap-0.5">
      {bars.map((bar, i) => {
        const heightVal = Number(bar.height) || 0;
        return (
          <div
            key={i}
            className={`flex-1 rounded-t transition-opacity ${
              highlightIndex !== undefined && i === highlightIndex
                ? 'opacity-100 ring-2 ring-offset-1 ring-current'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              height: `${(heightVal / max) * 100}%`,
              minHeight: '2px',
              backgroundColor: color,
            }}
            title={bar.label}
          />
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('month');

  const fetchAnalytics = useCallback(async (p: Period) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/analytics?period=${p}`);
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
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  if (loading) return <AnalyticsSkeleton />;

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-textMuted">Unable to load analytics. Please try again.</p>
      </div>
    );
  }

  const dailyBars = (data.dailyRevenue || []).map((d) => {
    const rev = Number(d.revenue) || 0;
    return {
      height: rev,
      label: `${d.date}: $${rev.toFixed(2)}`,
    };
  });

  const hourlyBars = (data.hourlyOrders || []).map((h) => {
    const count = Number(h.count) || 0;
    return {
      height: count,
      label: `${h.hour}:00 — ${count} orders`,
      isHighlight: h.hour === data.peakHour,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader period={period} onPeriodChange={setPeriod} />

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Revenue"
          value={`$${(Number(data.revenue) || 0).toFixed(2)}`}
          sub={`${Number(data.orderCount) || 0} orders`}
          change={data.comparison?.revenueChange}
        />
        <MetricCard
          label="Avg Order Value"
          value={`$${(Number(data.avgOrderValue) || 0).toFixed(2)}`}
          sub="per order"
          change={data.comparison?.avgOrderValueChange}
        />
        <MetricCard
          label="Customers Served"
          value={String(Number(data.uniqueCustomers) || 0)}
          sub={`${(Number(data.repeatCustomerRate) || 0).toFixed(0)}% repeat`}
          change={data.comparison?.customersChange}
        />
        <MetricCard
          label="Avg Rating"
          value={data.avgRating !== null && data.avgRating !== undefined ? `${(Number(data.avgRating) || 0).toFixed(1)} ★` : 'No reviews'}
          sub={`${(Number(data.cancellationRate) || 0).toFixed(1)}% cancel rate`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold text-text">
            Revenue - Last {period === 'week' ? '7' : period === 'month' ? '30' : '365'} Days
          </h3>
          <div className="mt-4">
            <BarChart bars={dailyBars} color="#EA5B26" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-textMuted">
            <span>{period === 'week' ? '7 days ago' : period === 'month' ? '30 days ago' : '1 year ago'}</span>
            <span>Today</span>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-text">Orders by Hour</h3>
          {data.peakHourLabel && (
            <p className="mt-1 text-sm text-textMuted">
              Your busiest time: <span className="font-medium text-text">{data.peakHourLabel}</span>
            </p>
          )}
          <div className="mt-4">
            <BarChart
              bars={hourlyBars}
              color="#3B82F6"
              highlightIndex={data.peakHour}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-textMuted">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <h3 className="font-semibold text-text">Top Selling Items</h3>
        {data.topItems.length === 0 ? (
          <p className="mt-4 text-sm text-textMuted">No orders yet this period</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.topItems.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primarySoft text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-text">{item.name}</p>
                  <p className="text-sm text-textMuted">
                    {item.count} sold &bull; ${(Number(item.revenue) || 0).toFixed(2)} revenue
                  </p>
                </div>
                <div className="w-32 h-2 bg-surfaceMuted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(item.count / (data.topItems[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Earnings Breakdown */}
      <EarningsBreakdown revenue={data.revenue} orderCount={data.orderCount} />

      {/* Operational Health */}
      <OperationalHealth
        cancellationRate={data.cancellationRate}
        repeatCustomerRate={data.repeatCustomerRate}
        avgOrderValue={data.avgOrderValue}
        uniqueCustomers={data.uniqueCustomers}
        orderCount={data.orderCount}
      />
    </div>
  );
}

function PageHeader({
  period,
  onPeriodChange,
}: {
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text">Analytics</h1>
        <p className="mt-1 text-textMuted">Track your performance and revenue</p>
      </div>
      <div className="flex gap-2">
        {(['week', 'month', 'year'] as const).map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? 'bg-primary text-white'
                : 'bg-surfaceMuted text-textMuted hover:bg-surfaceMuted'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

function EarningsBreakdown({
  revenue: rawRevenue,
  orderCount: rawOrderCount,
}: {
  revenue: number;
  orderCount: number;
}) {
  const revenue = Number(rawRevenue) || 0;
  const orderCount = Number(rawOrderCount) || 0;
  const platformFee = revenue * 0.15;
  const stripeFee = revenue * 0.029 + orderCount * 0.3;
  const netEarnings = revenue - platformFee - stripeFee;
  const netPct = revenue > 0 ? (netEarnings / revenue) * 100 : 0;

  const rows = [
    { label: 'Gross Revenue', value: revenue, color: 'text-text', bold: true },
    { label: 'Platform Fee (15%)', value: -platformFee, color: 'text-danger', bold: false },
    { label: 'Stripe Processing (~2.9% + $0.30/order)', value: -stripeFee, color: 'text-danger', bold: false },
    { label: 'Your Net Earnings', value: netEarnings, color: 'text-success', bold: true },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text">Earnings Breakdown</h3>
          <p className="mt-0.5 text-sm text-textMuted">
            What you actually keep after platform and processing fees
          </p>
        </div>
        <span className="rounded-full bg-successSoft px-3 py-1 text-sm font-bold text-success">
          ~{netPct.toFixed(0)}% take-home
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${
              row.bold ? 'bg-surfaceMuted' : ''
            }`}
          >
            <span className={`text-sm ${row.bold ? 'font-semibold text-text' : 'text-textMuted'}`}>
              {row.label}
            </span>
            <span className={`text-sm font-bold ${row.color}`}>
              {row.value >= 0 ? '' : '-'}${Math.abs(row.value).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      {revenue === 0 && (
        <p className="mt-3 text-xs text-textMuted">
          Breakdown will populate once you have completed orders this period.
        </p>
      )}
    </Card>
  );
}

function OperationalHealth({
  cancellationRate: rawCancellationRate,
  repeatCustomerRate: rawRepeatCustomerRate,
  avgOrderValue: rawAvgOrderValue,
  uniqueCustomers: rawUniqueCustomers,
  orderCount: rawOrderCount,
}: {
  cancellationRate: number;
  repeatCustomerRate: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  orderCount: number;
}) {
  const cancellationRate = Number(rawCancellationRate) || 0;
  const repeatCustomerRate = Number(rawRepeatCustomerRate) || 0;
  const avgOrderValue = Number(rawAvgOrderValue) || 0;
  const uniqueCustomers = Number(rawUniqueCustomers) || 0;
  const orderCount = Number(rawOrderCount) || 0;
  const fulfillmentRate = Math.max(0, 100 - cancellationRate);

  const kpis = [
    {
      label: 'Fulfillment Rate',
      value: `${fulfillmentRate.toFixed(1)}%`,
      sub: 'Orders completed vs received',
      tone: fulfillmentRate >= 90 ? 'text-success' : fulfillmentRate >= 75 ? 'text-warning' : 'text-danger',
      bar: Math.min(100, fulfillmentRate),
      barColor: fulfillmentRate >= 90 ? 'bg-success' : fulfillmentRate >= 75 ? 'bg-warning' : 'bg-danger',
    },
    {
      label: 'Repeat Customer Rate',
      value: `${repeatCustomerRate.toFixed(1)}%`,
      sub: 'Customers who ordered more than once',
      tone: repeatCustomerRate >= 30 ? 'text-success' : repeatCustomerRate >= 15 ? 'text-warning' : 'text-textMuted',
      bar: Math.min(repeatCustomerRate, 100),
      barColor: repeatCustomerRate >= 30 ? 'bg-success' : 'bg-warning',
    },
    {
      label: 'Avg Order Value',
      value: `$${avgOrderValue.toFixed(2)}`,
      sub: 'Revenue per completed order',
      tone: 'text-text',
      bar: Math.min((avgOrderValue / 60) * 100, 100),
      barColor: 'bg-primary',
    },
    {
      label: 'Orders This Period',
      value: orderCount,
      sub: `${uniqueCustomers} unique customers`,
      tone: 'text-text',
      bar: Math.min((orderCount / 50) * 100, 100),
      barColor: 'bg-info',
    },
  ];

  return (
    <Card>
      <h3 className="font-semibold text-text">Operational Health</h3>
      <p className="mt-0.5 text-sm text-textMuted">
        How efficiently the kitchen ran this period
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="space-y-2">
            <p className="text-xs font-medium text-textMuted">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.tone}`}>{kpi.value}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
              <div
                className={`h-full rounded-full ${kpi.barColor}`}
                style={{ width: `${kpi.bar}%` }}
              />
            </div>
            <p className="text-xs text-textSubtle">{kpi.sub}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 w-24 bg-surfaceMuted rounded" />
            <div className="mt-2 h-8 w-16 bg-surfaceMuted rounded" />
          </Card>
        ))}
      </div>
    </div>
  );
}
