'use client';

import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { mapEngineStatusToPublicStage, PublicOrderStage } from '@ridendine/types';
import type { OpsLiveOrderSnapshot } from '@/lib/ops-live-feed-types';
import { computeOrderSlaFlags } from '@/lib/ops-sla';

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isTodayTs(t: number): boolean {
  return t >= startOfToday();
}

function formatAge(createdAt: string): string {
  const m = (Date.now() - Date.parse(createdAt)) / 60000;
  if (!Number.isFinite(m) || m < 0) return '—';
  if (m < 60) return `${Math.floor(m)}m`;
  return `${Math.floor(m / 60)}h ${Math.floor(m % 60)}m`;
}

function etaLabel(order: OpsLiveOrderSnapshot): string {
  const d = order.delivery?.estimated_dropoff_at;
  const r = order.estimated_ready_at;
  if (d) return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (r) return new Date(r).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return '—';
}

type StageKey = 'placed' | 'cooking' | 'on_the_way' | 'delivered';

function bucketForOrder(order: OpsLiveOrderSnapshot): StageKey | null {
  const stage = mapEngineStatusToPublicStage(order.engine_status);
  if (stage === PublicOrderStage.CANCELLED || stage === PublicOrderStage.REFUNDED) return null;
  if (stage === PublicOrderStage.DELIVERED) {
    const t = Date.parse(order.updated_at);
    return isTodayTs(t) ? 'delivered' : null;
  }
  if (stage === PublicOrderStage.PLACED) return 'placed';
  if (stage === PublicOrderStage.COOKING) return 'cooking';
  if (stage === PublicOrderStage.ON_THE_WAY) return 'on_the_way';
  return null;
}

const COLS: { key: StageKey; title: string }[] = [
  { key: 'placed', title: 'Placed' },
  { key: 'cooking', title: 'Cooking' },
  { key: 'on_the_way', title: 'On the way' },
  { key: 'delivered', title: 'Delivered (today)' },
];

export function OrdersColumn({
  orders,
  highlightedOrderId,
}: {
  orders: OpsLiveOrderSnapshot[];
  highlightedOrderId?: string | null;
}) {
  const grouped = new Map<StageKey, OpsLiveOrderSnapshot[]>();
  for (const c of COLS) grouped.set(c.key, []);

  for (const o of orders) {
    const b = bucketForOrder(o);
    if (!b) continue;
    grouped.get(b)!.push(o);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {COLS.map((col) => (
        <div key={col.key} className="flex min-h-[280px] flex-col gap-2 rounded-lg border border-gray-800 bg-[#121c2c] p-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{col.title}</h3>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto max-h-[70vh]">
            {(grouped.get(col.key) ?? []).map((order) => {
              const flags = computeOrderSlaFlags(order, order.delivery);
              const activeRing = highlightedOrderId === order.id ? 'ring-2 ring-[#E85D26]' : '';
              return (
                <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                  <Card className={`cursor-pointer border-gray-700 bg-opsPanel p-3 transition hover:border-[#E85D26] ${activeRing}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-sm text-white">#{order.order_number}</span>
                      <span className="text-xs text-gray-500">{formatAge(order.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Chef · {order.chef_name}</p>
                    <p className="text-xs text-gray-400">Customer · {order.customer_name}</p>
                    <p className="mt-1 text-xs text-gray-500">ETA {etaLabel(order)}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {flags.slaBreach && (
                        <Badge className="bg-red-500/20 text-red-200 text-[10px]">SLA</Badge>
                      )}
                      {flags.delayed && (
                        <Badge className="bg-amber-500/20 text-amber-100 text-[10px]">Delayed</Badge>
                      )}
                      {flags.dispatchIssue && (
                        <Badge className="bg-orange-600/30 text-orange-100 text-[10px]">Dispatch</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
