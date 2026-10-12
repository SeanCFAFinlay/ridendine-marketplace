'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@ridendine/utils';
import { Users, TrendingUp, Repeat, Star } from 'lucide-react';

type CustomerTier = 'new' | 'returning' | 'loyal' | 'vip';
type FilterTier = 'all' | CustomerTier;

interface Customer {
  id: string;
  name: string;
  orderCount: number;
  totalSpent: number;
  avgOrderValue: number;
  firstOrder: string;
  lastOrder: string;
  tier: CustomerTier;
  isNewThisMonth: boolean;
}

interface Summary {
  total: number;
  newThisMonth: number;
  repeatRate: number;
  avgLifetimeValue: number;
}

interface Payload {
  customers: Customer[];
  summary: Summary;
}

const TIER_STYLES: Record<CustomerTier, string> = {
  new: 'bg-infoSoft text-info',
  returning: 'bg-primarySoft text-primary',
  loyal: 'bg-successSoft text-success',
  vip: 'bg-warningSoft text-warning',
};

const TIER_LABELS: Record<CustomerTier, string> = {
  new: 'New',
  returning: 'Returning',
  loyal: 'Loyal',
  vip: 'VIP',
};

function money(v: number) {
  return formatCurrency(v);
}

function daysSince(dateStr: string) {
  const days = Math.floor((Date.now() - Date.parse(dateStr)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 60) return '1 month ago';
  return `${Math.floor(days / 30)} months ago`;
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-divider bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-textMuted">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-text">{value}</p>
      <p className="mt-1 text-xs text-textMuted">{sub}</p>
    </div>
  );
}

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterTier>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/customers');
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
    fetchData();
  }, [fetchData]);

  if (loading) return <PageSkeleton />;

  if (error || !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-textMuted">Unable to load customer data. Please try again.</p>
      </div>
    );
  }

  const { customers, summary } = data;
  const filtered =
    filter === 'all' ? customers : customers.filter((c) => c.tier === filter);

  const tierCounts: Record<CustomerTier, number> = {
    new: 0,
    returning: 0,
    loyal: 0,
    vip: 0,
  };
  for (const c of customers) tierCounts[c.tier] = (tierCounts[c.tier] ?? 0) + 1;

  const stats = [
    {
      label: 'Total Customers',
      value: summary.total,
      sub: `${summary.newThisMonth} new this month`,
      accent: 'bg-infoSoft text-info',
      icon: Users,
    },
    {
      label: 'Repeat Rate',
      value: `${summary.repeatRate.toFixed(0)}%`,
      sub: 'Ordered more than once',
      accent: 'bg-primarySoft text-primary',
      icon: Repeat,
    },
    {
      label: 'Avg Lifetime Value',
      value: money(summary.avgLifetimeValue),
      sub: 'Revenue per customer',
      accent: 'bg-successSoft text-success',
      icon: TrendingUp,
    },
    {
      label: 'VIP Customers',
      value: tierCounts.vip,
      sub: '8+ orders placed',
      accent: 'bg-warningSoft text-warning',
      icon: Star,
    },
  ];

  const filters: Array<{ key: FilterTier; label: string; count: number }> = [
    { key: 'all', label: 'All', count: customers.length },
    { key: 'new', label: 'New', count: tierCounts.new },
    { key: 'returning', label: 'Returning', count: tierCounts.returning },
    { key: 'loyal', label: 'Loyal', count: tierCounts.loyal },
    { key: 'vip', label: 'VIP', count: tierCounts.vip },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Customers</h1>
        <p className="mt-1 text-sm text-textMuted">
          Who is buying from you, how often, and how much they spend.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="rounded-2xl border border-divider bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-divider px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-text">Customer List</h2>
            <p className="mt-0.5 text-xs text-textMuted">Sorted by total spent</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === f.key
                    ? 'bg-primary text-white'
                    : 'bg-surfaceMuted text-textMuted hover:text-text'
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filter === f.key ? 'bg-white/20' : 'bg-white text-textSubtle'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-textSubtle" />
            <p className="mt-3 text-sm font-medium text-text">No customers yet</p>
            <p className="mt-1 text-xs text-textMuted">
              Customers appear here once they place completed orders.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="border-b border-divider text-left text-xs font-medium uppercase tracking-wide text-textSubtle">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3 text-right">Orders</th>
                  <th className="px-5 py-3 text-right">Total Spent</th>
                  <th className="px-5 py-3 text-right">Avg Order</th>
                  <th className="px-5 py-3">Last Order</th>
                  <th className="px-5 py-3">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surfaceMuted/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primarySoft text-sm font-bold text-primary">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-text">{customer.name}</p>
                          {customer.isNewThisMonth && (
                            <p className="text-xs text-info">New this month</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-semibold text-text">
                      {customer.orderCount}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-bold text-text">
                      {money(customer.totalSpent)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-textMuted">
                      {money(customer.avgOrderValue)}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-textMuted">
                      {daysSince(customer.lastOrder)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[customer.tier]}`}
                      >
                        {TIER_LABELS[customer.tier]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <h2 className="font-bold text-text">Understanding Your Customer Tiers</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                tier: 'new' as CustomerTier,
                threshold: '1 order',
                tip: 'First-time buyers. Focus on a great first impression to earn a second order.',
              },
              {
                tier: 'returning' as CustomerTier,
                threshold: '2-3 orders',
                tip: 'They came back. Build the habit with consistency in quality and timing.',
              },
              {
                tier: 'loyal' as CustomerTier,
                threshold: '4-7 orders',
                tip: 'Strong regulars. These customers trust you and often bring referrals.',
              },
              {
                tier: 'vip' as CustomerTier,
                threshold: '8+ orders',
                tip: 'Your best customers. Protect this relationship - they drive your revenue.',
              },
            ] as Array<{ tier: CustomerTier; threshold: string; tip: string }>
          ).map(({ tier, threshold, tip }) => (
            <div key={tier} className="rounded-xl bg-surfaceMuted p-4">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]}`}
                >
                  {TIER_LABELS[tier]}
                </span>
                <span className="text-xs text-textSubtle">{threshold}</span>
              </div>
              <p className="mt-2 text-xs text-textMuted">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-40 rounded-lg bg-surfaceMuted" />
        <div className="mt-2 h-4 w-72 rounded bg-surfaceMuted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-divider bg-white p-5 shadow-sm">
            <div className="h-4 w-28 rounded bg-surfaceMuted" />
            <div className="mt-3 h-9 w-20 rounded bg-surfaceMuted" />
            <div className="mt-2 h-3 w-24 rounded bg-surfaceMuted" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="h-5 w-32 rounded bg-surfaceMuted" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-9 w-9 rounded-full bg-surfaceMuted" />
              <div className="flex-1 h-4 rounded bg-surfaceMuted" />
              <div className="h-4 w-16 rounded bg-surfaceMuted" />
              <div className="h-4 w-16 rounded bg-surfaceMuted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
