'use client';

import { Badge, Card } from '@ridendine/ui';
import type { OpsLiveChefView } from '@/hooks/use-ops-live-feed';

export function ChefsColumn({ chefs }: { chefs: OpsLiveChefView[] }) {
  const sorted = [...chefs].sort((a, b) => (b.activeOrderCount + (b.current_queue_size ?? 0)) - (a.activeOrderCount + (a.current_queue_size ?? 0)));

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-800 bg-[#121c2c] p-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Chefs / storefronts</h3>
      <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
        {sorted.map((c) => (
          <Card key={c.id} className="border-gray-700 bg-[#16213e] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-white text-sm">{c.name}</p>
                <p className="text-xs text-gray-500">{c.chef_display_name}</p>
              </div>
              <Badge className="bg-gray-700 text-gray-200 text-[10px]">
                {c.storefront_state ?? '—'}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Active orders · {c.activeOrderCount} · queue · {c.current_queue_size ?? 0}
              {c.max_queue_size != null ? ` / ${c.max_queue_size}` : ''}
            </p>
            {(c.is_paused || c.prepDelayWarning) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.is_paused && (
                  <Badge className="bg-yellow-500/20 text-yellow-100 text-[10px]">Paused</Badge>
                )}
                {c.prepDelayWarning && (
                  <Badge className="bg-amber-600/25 text-amber-100 text-[10px]">Prep pressure</Badge>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
