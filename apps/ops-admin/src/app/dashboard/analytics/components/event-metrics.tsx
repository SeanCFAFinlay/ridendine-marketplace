'use client';

import { useState, useEffect } from 'react';
import { Card } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';

interface EventCount {
  event_name: string;
  count: number;
}

const EVENT_LABELS: Record<string, string> = {
  page_view: 'Page Views',
  chef_view: 'Chef Page Views',
  add_to_cart: 'Add to Cart',
  checkout_start: 'Checkout Started',
  checkout_complete: 'Checkout Completed',
  order_placed: 'Orders Placed',
  review_submitted: 'Reviews',
  driver_online: 'Driver Online',
  offer_accepted: 'Offers Accepted',
  offer_declined: 'Offers Declined',
  delivery_completed: 'Deliveries Completed',
};

type Period = 'today' | '7d' | '30d';

function getStartDate(period: Period): Date {
  const now = new Date();
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === '7d') {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function buildMetrics(rows: Array<{ event_name: string }>): EventCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.event_name, (counts.get(row.event_name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([event_name, count]) => ({ event_name, count }))
    .sort((a, b) => b.count - a.count);
}

function PeriodToggle({
  period,
  onSelect,
}: {
  period: Period;
  onSelect: (p: Period) => void;
}) {
  return (
    <div className="flex gap-1">
      {(['today', '7d', '30d'] as const).map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
            period === p
              ? 'bg-[#E85D26] text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {p === 'today' ? 'Today' : p}
        </button>
      ))}
    </div>
  );
}

function MetricRow({ metric }: { metric: EventCount }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-opsPanel px-3 py-2">
      <span className="text-sm text-gray-300">
        {EVENT_LABELS[metric.event_name] || metric.event_name}
      </span>
      <span className="text-sm font-bold text-white">
        {metric.count.toLocaleString()}
      </span>
    </div>
  );
}

export function EventMetrics() {
  const [metrics, setMetrics] = useState<EventCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('today');

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const supabase = createBrowserClient();
        if (!supabase) return;

        const startDate = getStartDate(period);
        const { data, error } = await (supabase as any)
          .from('analytics_events')
          .select('event_name')
          .gte('created_at', startDate.toISOString());

        if (!error && data) {
          setMetrics(buildMetrics(data));
        }
      } catch {
        // Table may not exist
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [period]);

  return (
    <Card className="border-gray-800 bg-opsPanel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Event Metrics</h3>
        <PeriodToggle period={period} onSelect={setPeriod} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-700/50 rounded animate-pulse" />
          ))}
        </div>
      ) : metrics.length === 0 ? (
        <p className="text-sm text-gray-500">No events recorded for this period.</p>
      ) : (
        <div className="space-y-2">
          {metrics.map((m) => (
            <MetricRow key={m.event_name} metric={m} />
          ))}
        </div>
      )}
    </Card>
  );
}
