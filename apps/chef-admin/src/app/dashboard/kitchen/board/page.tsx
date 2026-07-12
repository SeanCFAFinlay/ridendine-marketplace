'use client';

// ==========================================
// MULTI-BRAND KDS BOARD (Ghost-Kitchen Phase B.1)
//
// One kitchen display for the whole commissary: station columns, each ticket
// tagged with its brand colour. Reads /api/kitchen/board and polls for freshness
// (realtime hydration on kitchen_tickets is a follow-up). Grouped by station,
// never by brand.
// ==========================================

import { useCallback, useEffect, useState } from 'react';

type BoardItem = {
  name: string;
  qty: number;
  station: string | null;
  allergenFlags: string[];
  specialInstructions: string | null;
};
type BoardTicket = {
  ticketId: string;
  orderId: string;
  orderNumber: string | null;
  brand: { storefrontId: string; name: string; color: string };
  station: string | null;
  kitchenStatus: string;
  priority: number;
  placedAt: string;
  dueAt: string | null;
  items: BoardItem[];
};
type BoardStation = { stationId: string | null; name: string; tickets: BoardTicket[] };
type Board = {
  brands: { storefrontId: string; name: string; color: string }[];
  stations: BoardStation[];
  ticketCount: number;
};

const STATUS_TONE: Record<string, string> = {
  new: 'bg-surfaceMuted text-textMuted',
  accepted: 'bg-primarySoft text-primary',
  preparing: 'bg-warningSoft text-warning',
  packing: 'bg-warningSoft text-warning',
  ready: 'bg-successSoft text-success',
  problem: 'bg-dangerSoft text-danger',
};

const minsUntil = (iso: string | null): string => {
  if (!iso) return '';
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Number.isNaN(diff)) return '';
  return diff >= 0 ? `${diff}m left` : `${-diff}m late`;
};

export default function KitchenBoardPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/kitchen/board', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to load board');
      setBoard((json.data ?? json) as Board);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Kitchen Board</h1>
          <p className="text-sm text-textMuted">
            All brands, one board — grouped by station.{board ? ` ${board.ticketCount} active` : ''}
          </p>
        </div>
        {board && board.brands.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {board.brands.map((b) => (
              <span key={b.storefrontId} className="inline-flex items-center gap-1.5 text-xs text-textMuted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                {b.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="rounded-lg border border-border bg-surface p-8 text-center text-textMuted">Loading…</div>}
      {error && !loading && (
        <div className="rounded-lg border border-danger/30 bg-dangerSoft p-4 text-sm text-danger">{error}</div>
      )}

      {board && !loading && board.ticketCount === 0 && (
        <div className="rounded-lg border border-border bg-surface p-10 text-center text-textMuted">
          No active tickets right now.
        </div>
      )}

      {board && !loading && board.ticketCount > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {board.stations
            .filter((s) => s.tickets.length > 0)
            .map((station) => (
              <div key={station.stationId ?? 'unassigned'} className="w-80 flex-shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold text-text">{station.name}</h2>
                  <span className="text-xs text-textMuted">{station.tickets.length}</span>
                </div>
                <div className="space-y-3">
                  {station.tickets.map((t) => (
                    <TicketCard key={t.ticketId} ticket={t} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: BoardTicket }) {
  const tone = STATUS_TONE[ticket.kitchenStatus] ?? 'bg-surfaceMuted text-textMuted';
  const due = minsUntil(ticket.dueAt);
  const late = due.endsWith('late');
  return (
    <div className="rounded-lg border border-border bg-surface p-3" style={{ borderLeft: `3px solid ${ticket.brand.color}` }}>
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: `${ticket.brand.color}22`, color: ticket.brand.color }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ticket.brand.color }} />
          {ticket.brand.name}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>{ticket.kitchenStatus}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-text">#{ticket.orderNumber ?? ticket.orderId.slice(0, 6)}</span>
        {due && <span className={`text-xs font-medium ${late ? 'text-danger' : 'text-textMuted'}`}>{due}</span>}
      </div>

      <ul className="mt-2 space-y-1">
        {ticket.items.map((it, idx) => (
          <li key={idx} className="text-sm text-text">
            <span className="font-medium tabular-nums text-textMuted">{it.qty}×</span> {it.name}
            {it.allergenFlags.length > 0 && (
              <span className="ml-1.5 rounded bg-dangerSoft px-1 py-0.5 text-[10px] font-medium text-danger">
                {it.allergenFlags.join(', ')}
              </span>
            )}
            {it.specialInstructions && <div className="pl-5 text-xs italic text-textMuted">{it.specialInstructions}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
