'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { KitchenOrderQueue } from '@/components/kitchen/kitchen-order-queue';
import { KitchenCommandHeader } from '@/components/kitchen/kitchen-command-header';
import { ServiceControls } from '@/components/kitchen/service-controls';
import { ChefAppQrModal } from '@/components/chef-app-qr-modal';
import type { KitchenTicket, ServiceMetrics } from '@/lib/kitchen';

// ============================================================
// Types matching /api/kitchen/overview response
// ============================================================

type LoadLevel = 'idle' | 'steady' | 'busy' | 'slammed';

interface KitchenLoad {
  activeCount: number;
  outstandingPrepMinutes: number;
  capacity: number;
  level: LoadLevel;
}

interface PrepPlanItem {
  id: string;
  name: string;
  suggestedQty: number;
  soldToday: number;
  dailyLimit: number | null;
  prepTimeMinutes: number | null;
  basis: 'same-weekday' | 'trailing' | 'limit';
  available: boolean;
}

interface PrepBoardOrder {
  shortId: string;
  qty: number;
  specialInstructions: string | null;
}

interface PrepBoardItem {
  menuItemId: string;
  name: string;
  totalQty: number;
  orderCount: number;
  orders: PrepBoardOrder[];
}

interface OverviewPayload {
  load: KitchenLoad;
  metrics: ServiceMetrics;
  prepPlan: PrepPlanItem[];
  prepBoard: PrepBoardItem[];
  service: { isPaused: boolean; isActive: boolean };
  tickets: KitchenTicket[];
  storefrontId: string;
}

const BASIS_LABEL: Record<PrepPlanItem['basis'], string> = {
  'same-weekday': 'same-weekday avg',
  'trailing':     'recent avg',
  'limit':        'daily limit',
};

// ============================================================
// Sub-components
// ============================================================

function PauseButton({
  isPaused,
  loading,
  onClick,
}: {
  isPaused: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
        isPaused
          ? 'bg-success text-white hover:bg-success/90'
          : 'bg-danger text-white hover:bg-danger/90'
      }`}
    >
      {loading ? 'Updating...' : isPaused ? 'Resume orders' : 'Pause orders'}
    </button>
  );
}

function PrepPlanRow({
  item,
  isPrepped,
  onToggle,
}: {
  item: PrepPlanItem;
  isPrepped: boolean;
  onToggle: () => void;
}) {
  return (
    <tr
      className={`border-b border-divider transition-opacity ${
        !item.available ? 'opacity-40' : ''
      } ${isPrepped ? 'opacity-60' : ''}`}
    >
      <td className="py-3 pr-3">
        <button
          onClick={onToggle}
          disabled={!item.available}
          aria-label={isPrepped ? `Mark ${item.name} not prepped` : `Mark ${item.name} prepped`}
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
            isPrepped
              ? 'border-success bg-success text-white'
              : 'border-divider bg-white hover:border-primary'
          }`}
        >
          {isPrepped && <Check className="h-3 w-3" />}
        </button>
      </td>
      <td className="py-3 pr-3">
        <span className={`text-sm font-medium ${isPrepped ? 'line-through text-textMuted' : 'text-text'}`}>
          {item.name}
        </span>
        {!item.available && (
          <span className="ml-2 rounded-full bg-dangerSoft px-1.5 py-0.5 text-[10px] font-bold text-danger">
            Unavailable
          </span>
        )}
      </td>
      <td className="py-3 pr-3 text-right">
        <span className={`text-sm font-bold ${item.suggestedQty === 0 ? 'text-textMuted' : 'text-text'}`}>
          {item.suggestedQty}
        </span>
        {item.available && (
          <span className="ml-1 text-[10px] text-textSubtle">{BASIS_LABEL[item.basis]}</span>
        )}
      </td>
      <td className="py-3 pr-3 text-right text-sm text-textMuted">{item.soldToday}</td>
      <td className="py-3 pr-3 text-right text-sm text-textMuted">{item.dailyLimit ?? '-'}</td>
      <td className="py-3 text-right text-sm text-textMuted">
        {item.prepTimeMinutes != null ? `${item.prepTimeMinutes}min` : '-'}
      </td>
    </tr>
  );
}

function PrepBoardCard({ item }: { item: PrepBoardItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-divider bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primarySoft text-lg font-bold text-primary">
            {item.totalQty}
          </span>
          <div>
            <p className="font-semibold text-text">{item.name}</p>
            <p className="text-xs text-textMuted">across {item.orderCount} order{item.orderCount === 1 ? '' : 's'}</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse order details' : 'Expand order details'}
          className="rounded-md p-1 text-textMuted hover:bg-surfaceMuted hover:text-text transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-divider pt-3">
          {item.orders.map((order) => (
            <div key={order.shortId} className="flex items-start justify-between rounded-lg bg-surfaceMuted px-3 py-2">
              <span className="text-xs font-mono text-textMuted">#{order.shortId}</span>
              <div className="text-right">
                <span className="text-xs font-semibold text-text">x{order.qty}</span>
                {order.specialInstructions && (
                  <p className="text-[10px] text-textMuted">{order.specialInstructions}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export default function KitchenPage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [prepped, setPrepped] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/kitchen/overview');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 10s for responsive kitchen updates + immediate fetch on window focus/tap
    const interval = setInterval(fetchData, 10_000);
    const onFocus = () => { void fetchData(); };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchData]);

  const togglePause = async () => {
    if (!data || pausing) return;
    const willPause = !data.service.isPaused;
    setPausing(true);
    setData((d) => d ? { ...d, service: { ...d.service, isPaused: willPause } } : d);
    try {
      await fetch('/api/kitchen/pause', { method: willPause ? 'POST' : 'DELETE' });
      await fetchData();
    } catch {
      setData((d) => d ? { ...d, service: { ...d.service, isPaused: !willPause } } : d);
    } finally {
      setPausing(false);
    }
  };

  const togglePrepped = (itemId: string) => {
    setPrepped((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  if (loading && !data) return <PageSkeleton />;

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-textMuted">Unable to load kitchen data. Please try again.</p>
      </div>
    );
  }

  const { load, metrics, prepPlan, prepBoard, service, tickets, storefrontId } = data;
  const isSlammed = load.level === 'slammed';

  return (
    <div className="space-y-6">
      {/* Stale-data warning (re-fetch failed but prior data still shown) */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-warningSoft px-4 py-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Refresh failed - showing last known data.</span>
        </div>
      )}

      {/* Paused banner */}
      {service.isPaused && (
        <div className="flex items-start gap-3 rounded-xl bg-dangerSoft px-5 py-4 text-danger">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">New orders are paused</p>
            <p className="text-sm opacity-80">Customers cannot check out until you resume.</p>
          </div>
        </div>
      )}

      {/* Slammed nudge */}
      {isSlammed && !service.isPaused && (
        <div className="flex items-start gap-3 rounded-xl bg-warningSoft px-5 py-4 text-warning">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            Kitchen is at capacity. Consider pausing new orders until you catch up.
          </p>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Kitchen Command</h1>
          <p className="mt-1 text-sm text-textMuted">
            Prep plan, live board, and service control for today's service.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <ChefAppQrModal buttonText="📱 Mount Tablet (QR)" />
          <button
            onClick={fetchData}
            aria-label="Refresh kitchen data"
            className="flex items-center gap-2 rounded-lg bg-surfaceMuted px-3 py-2 text-sm font-medium text-textMuted transition-colors hover:text-text"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Service control */}
      <div className="flex items-center justify-end">
        <PauseButton
          isPaused={service.isPaused}
          loading={pausing}
          onClick={togglePause}
        />
      </div>

      {/* Service state + close-of-day */}
      <ServiceControls />

      {/* Command metrics header (real data only) */}
      <KitchenCommandHeader metrics={metrics} load={load} />

      {/* Live Order Queue */}
      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <KitchenOrderQueue tickets={tickets ?? []} storefrontId={storefrontId ?? ''} />
      </div>

      {/* Today's Prep Plan */}
      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-text">Today's Prep Plan</h2>
          <p className="mt-0.5 text-xs text-textMuted">
            Suggested quantities based on same-weekday demand. Check off items as you prep.
          </p>
        </div>

        {prepPlan.length === 0 ? (
          <p className="py-6 text-center text-sm text-textMuted">No menu items found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-divider text-left text-xs font-medium uppercase tracking-wide text-textSubtle">
                  <th className="pb-3 pr-3 w-8" />
                  <th className="pb-3 pr-3">Item</th>
                  <th className="pb-3 pr-3 text-right">Prep qty</th>
                  <th className="pb-3 pr-3 text-right">Sold</th>
                  <th className="pb-3 pr-3 text-right">Limit</th>
                  <th className="pb-3 text-right">Prep time</th>
                </tr>
              </thead>
              <tbody>
                {prepPlan.map((item) => (
                  <PrepPlanRow
                    key={item.id}
                    item={item}
                    isPrepped={prepped.has(item.id)}
                    onToggle={() => togglePrepped(item.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Prep Board */}
      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-text">Live Prep Board</h2>
          <p className="mt-0.5 text-xs text-textMuted">
            All active orders aggregated. Cook by item, not by ticket.
          </p>
        </div>

        {prepBoard.length === 0 ? (
          <p className="py-6 text-center text-sm text-textMuted">
            {load.activeCount === 0 ? 'No active orders right now.' : 'Nothing to prep.'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {prepBoard.map((item) => (
              <PrepBoardCard key={item.menuItemId} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Loading skeleton
// ============================================================

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 rounded-lg bg-surfaceMuted" />
          <div className="mt-2 h-4 w-80 rounded bg-surfaceMuted" />
        </div>
        <div className="h-9 w-20 rounded-lg bg-surfaceMuted" />
      </div>
      <div className="rounded-xl border border-divider bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-5 w-32 rounded bg-surfaceMuted" />
            <div className="h-4 w-56 rounded bg-surfaceMuted" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-surfaceMuted" />
        </div>
      </div>
      <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="h-5 w-40 rounded bg-surfaceMuted" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-5 w-5 rounded bg-surfaceMuted" />
              <div className="h-4 flex-1 rounded bg-surfaceMuted" />
              <div className="h-4 w-12 rounded bg-surfaceMuted" />
              <div className="h-4 w-10 rounded bg-surfaceMuted" />
              <div className="h-4 w-10 rounded bg-surfaceMuted" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-divider bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-surfaceMuted" />
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-surfaceMuted" />
                <div className="h-3 w-20 rounded bg-surfaceMuted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
