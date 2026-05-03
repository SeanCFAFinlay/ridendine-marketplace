'use client';

import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import type { OpsLiveDriverView } from '@/hooks/use-ops-live-feed';

const STALE_MS = 5 * 60 * 1000;
const OVERLOAD = 2;

function pingLabel(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export function DriversColumn({ drivers }: { drivers: OpsLiveDriverView[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-800 bg-[#121c2c] p-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Drivers</h3>
      <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
        {drivers.map((d) => {
          const stale =
            (d.presenceStatus === 'online' || d.presenceStatus === 'busy') &&
            d.lastPingAt &&
            Date.now() - Date.parse(d.lastPingAt) > STALE_MS;
          const overloaded = d.activeDeliveryCount > OVERLOAD;
          return (
            <Card
              key={d.id}
              className={`border-gray-700 bg-[#16213e] p-3 ${
                stale ? 'border-amber-600/60' : ''
              } ${overloaded ? 'border-red-500/50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-white text-sm">{d.displayName}</p>
                <Badge
                  className={
                    d.presenceStatus === 'online'
                      ? 'bg-emerald-500/20 text-emerald-200 text-[10px]'
                      : d.presenceStatus === 'busy'
                        ? 'bg-orange-500/20 text-orange-100 text-[10px]'
                        : 'bg-gray-600/40 text-gray-200 text-[10px]'
                  }
                >
                  {d.presenceStatus}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Load · {d.activeDeliveryCount} · ping {pingLabel(d.lastPingAt)}
              </p>
              {stale && (
                <p className="mt-1 text-[11px] text-amber-400">Stale presence ping</p>
              )}
              {overloaded && (
                <p className="mt-1 text-[11px] text-red-400">High concurrent load</p>
              )}
              {d.currentDeliveryOrderId && (
                <Link
                  className="mt-2 inline-block text-xs text-[#E85D26] hover:underline"
                  href={`/dashboard/orders/${d.currentDeliveryOrderId}`}
                >
                  Current delivery →
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
