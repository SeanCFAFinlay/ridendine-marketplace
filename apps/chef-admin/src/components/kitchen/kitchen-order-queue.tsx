'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { Badge, Button, LiveIndicator } from '@ridendine/ui';
import type { LiveIndicatorStatus } from '@ridendine/ui';
import { KITCHEN_NEXT_TRANSITION, KITCHEN_REJECT_TRANSITION } from '@ridendine/utils';
import type { KitchenTransition } from '@ridendine/utils';
import { playNewOrderChime } from '@/lib/sound';
import { useStorefrontOrdersRealtime } from '@/hooks/use-storefront-orders-realtime';
import { PrepCountdown } from './prep-countdown';
import type { KitchenTicket } from '@/lib/kitchen';

/** Minimal shape the realtime hook delivers for kitchen tickets. */
interface RealtimeOrder {
  id: string;
  order_number?: string | null;
  status: string;
  created_at?: string | null;
  storefront_id?: string | null;
  customer?: { first_name?: string | null; last_name?: string | null } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function urgencyTarget(ticket: KitchenTicket): number {
  if (ticket.estimatedReadyAt) {
    return new Date(ticket.estimatedReadyAt).getTime();
  }
  if (ticket.prepStartedAt && ticket.estimatedPrepMinutes != null) {
    return new Date(ticket.prepStartedAt).getTime() + ticket.estimatedPrepMinutes * 60_000;
  }
  return Infinity;
}

function sortTickets(tickets: KitchenTicket[]): KitchenTicket[] {
  return [...tickets].sort((a, b) => {
    const aPending = a.status === 'pending' ? 0 : 1;
    const bPending = b.status === 'pending' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return urgencyTarget(a) - urgencyTarget(b);
  });
}

// Forward progression of the public order lifecycle. Terminal statuses share
// the top rank so a poll reporting them always wins.
const STATUS_RANK: Record<string, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready_for_pickup: 3,
  rejected: 9,
  cancelled: 9,
  expired: 9,
  completed: 9,
  delivered: 9,
};

function rank(status: string): number {
  return STATUS_RANK[status] ?? 0;
}

function isTerminalStatus(status: string): boolean {
  return rank(status) >= 9;
}

/**
 * Merge a freshly hydrated ticket onto whatever is already in the queue,
 * preserving the locally-confirmed status while an action is in flight or a
 * confirmed optimistic transition is still ahead of the hydrated snapshot.
 */
function mergeHydrated(
  prev: KitchenTicket,
  hydrated: KitchenTicket,
  inFlight: boolean,
  confirmedStatus: string | undefined
): KitchenTicket {
  let status = hydrated.status;
  if (inFlight) {
    status = prev.status;
  } else if (
    confirmedStatus &&
    !isTerminalStatus(hydrated.status) &&
    rank(hydrated.status) < rank(confirmedStatus)
  ) {
    status = confirmedStatus;
  }
  return { ...hydrated, status };
}

/**
 * Reconcile the 30s polling snapshot against local state. Reads in-flight and
 * confirmed maps but never mutates them (the caller prunes confirmations).
 */
function reconcileQueue(
  prev: KitchenTicket[],
  incoming: KitchenTicket[],
  inFlightIds: Set<string>,
  confirmedById: Map<string, string>
): KitchenTicket[] {
  const incomingById = new Map(incoming.map((t) => [t.id, t]));
  const merged: KitchenTicket[] = [];

  for (const t of prev) {
    const inc = incomingById.get(t.id);
    if (!inc) {
      // Not in the latest poll yet — keep just-inserted/in-flight tickets the
      // poll has not caught up to; otherwise it has genuinely left the board.
      if (inFlightIds.has(t.id) || confirmedById.has(t.id)) merged.push(t);
      continue;
    }
    if (inFlightIds.has(t.id)) {
      // Action mid-flight: never let a poll overwrite the optimistic state.
      merged.push(t);
      continue;
    }
    const confirmed = confirmedById.get(t.id);
    if (confirmed && !isTerminalStatus(inc.status) && rank(inc.status) < rank(confirmed)) {
      // Stale poll behind our confirmed transition: keep local hydrated fields
      // but hold the confirmed status.
      merged.push({ ...inc, status: confirmed });
      continue;
    }
    merged.push(inc);
  }

  const existingIds = new Set(prev.map((t) => t.id));
  for (const t of incoming) {
    if (!existingIds.has(t.id)) merged.push(t);
  }
  return sortTickets(merged);
}

/** Build a minimal placeholder ticket from a realtime row (fallback only). */
function thinTicketFromRealtime(order: RealtimeOrder): KitchenTicket {
  return {
    id: order.id,
    orderNumber: order.order_number ?? order.id,
    status: order.status,
    createdAt: order.created_at ?? new Date().toISOString(),
    prepStartedAt: null,
    estimatedReadyAt: null,
    estimatedPrepMinutes: null,
    specialInstructions: null,
    customerName: order.customer
      ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() || null
      : null,
    items: [],
    totalQty: 0,
  };
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type ColumnKey = 'new' | 'preparing' | 'ready';

const COLUMNS: { key: ColumnKey; label: string; statuses: string[]; accent: string; headerBg: string; countBg: string }[] = [
  {
    key: 'new',
    label: 'New Orders',
    statuses: ['pending'],
    accent: 'border-l-warning',
    headerBg: 'bg-warningSoft',
    countBg: 'bg-warning text-white',
  },
  {
    key: 'preparing',
    label: 'Preparing',
    statuses: ['accepted', 'preparing'],
    accent: 'border-l-info',
    headerBg: 'bg-infoSoft',
    countBg: 'bg-info text-white',
  },
  {
    key: 'ready',
    label: 'Ready',
    statuses: ['ready_for_pickup'],
    accent: 'border-l-success',
    headerBg: 'bg-successSoft',
    countBg: 'bg-success text-white',
  },
];

// ---------------------------------------------------------------------------
// 80mm Thermal Receipt Printing Helper
// ---------------------------------------------------------------------------

function printThermalTicket(ticket: KitchenTicket) {
  const printWindow = window.open('', '_blank', 'width=380,height=600');
  if (!printWindow) {
    window.print();
    return;
  }
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const itemsHtml = ticket.items
    .map(
      (item) => `
      <div style="display:flex; justify-content:space-between; margin:4px 0; font-size:14px; font-weight:bold;">
        <span>${item.quantity}x ${item.name}</span>
      </div>
      ${item.specialInstructions ? `<div style="font-size:12px; margin-left:10px; font-style:italic;">Note: ${item.specialInstructions}</div>` : ''}
    `
    )
    .join('');

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Ticket #${ticket.orderNumber || ticket.id.slice(-6).toUpperCase()}</title>
    <style>
      @page { size: 80mm auto; margin: 0; }
      body {
        font-family: monospace, sans-serif;
        width: 72mm;
        margin: 2mm auto;
        color: #000;
        background: #fff;
        padding: 2mm;
      }
      .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
      .title { font-size: 20px; font-weight: 900; }
      .meta { font-size: 11px; margin-top: 2px; }
      .customer { font-size: 15px; font-weight: bold; margin: 6px 0; border-bottom: 1px solid #000; padding-bottom: 4px; }
      .items { margin: 8px 0; border-bottom: 2px dashed #000; padding-bottom: 8px; }
      .instructions { font-size: 12px; font-weight: bold; margin-top: 6px; padding: 4px; border: 1px solid #000; }
      .footer { text-align: center; font-size: 10px; margin-top: 8px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">ORDER #${ticket.orderNumber || ticket.id.slice(-6).toUpperCase()}</div>
      <div class="meta">${timeStr} | KITCHEN TICKET</div>
    </div>
    <div class="customer">Customer: ${ticket.customerName || 'Diner'}</div>
    <div class="items">
      ${itemsHtml}
    </div>
    ${ticket.specialInstructions ? `<div class="instructions">NOTE: ${ticket.specialInstructions}</div>` : ''}
    <div class="footer">*** RIDENDINE 80MM TICKET ***</div>
  </body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

// ---------------------------------------------------------------------------
// Ticket card
// ---------------------------------------------------------------------------

interface TicketCardProps {
  ticket: KitchenTicket;
  accent: string;
  isInFlight: boolean;
  onAction: (ticket: KitchenTicket, action: string, nextStatus: string) => void;
}

function TicketCard({ ticket, accent, isInFlight, onAction }: TicketCardProps) {
  const nextTransition = (KITCHEN_NEXT_TRANSITION as Record<string, KitchenTransition | undefined>)[ticket.status];

  return (
    <div
      className={`rounded-xl bg-white shadow-sm border border-border border-l-4 ${accent} flex flex-col gap-3 p-4`}
    >
      {/* Order number + countdown */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-lg font-bold text-text leading-none">#{ticket.orderNumber}</span>
          {ticket.customerName && (
            <p className="mt-0.5 text-sm text-textMuted">{ticket.customerName}</p>
          )}
        </div>
        <PrepCountdown
          estimatedReadyAt={ticket.estimatedReadyAt}
          prepStartedAt={ticket.prepStartedAt}
          estimatedPrepMinutes={ticket.estimatedPrepMinutes}
          status={ticket.status}
          large
        />
      </div>

      {/* Items */}
      {ticket.items.length > 0 && (
        <ul className="space-y-0.5 border-t border-divider pt-3">
          {ticket.items.map((item, idx) => (
            <li key={idx} className="flex items-baseline gap-1.5 text-sm">
              <span className="font-semibold text-text tabular-nums">{item.quantity}x</span>
              <span className="text-text">{item.name}</span>
              {item.specialInstructions && (
                <span className="text-warning text-xs">({item.specialInstructions})</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Special instructions */}
      {ticket.specialInstructions && (
        <p className="rounded-lg border border-warning/30 bg-warningSoft px-3 py-2 text-xs text-warning">
          Note: {ticket.specialInstructions}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        {nextTransition && (
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAction(ticket, nextTransition.action, nextTransition.nextStatus)}
            disabled={isInFlight}
          >
            {isInFlight ? '...' : nextTransition.buttonLabel}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => printThermalTicket(ticket)}
          title="Print 80mm Kitchen Thermal Ticket"
          className="px-2 text-textMuted hover:text-text hover:bg-surfaceMuted"
        >
          <Printer className="h-4 w-4" />
        </Button>
        {ticket.status === 'pending' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction(ticket, KITCHEN_REJECT_TRANSITION.action, KITCHEN_REJECT_TRANSITION.nextStatus)}
            disabled={isInFlight}
          >
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KDS column
// ---------------------------------------------------------------------------

interface KDSColumnProps {
  col: typeof COLUMNS[number];
  tickets: KitchenTicket[];
  inFlightIds: React.RefObject<Set<string>>;
  onAction: (ticket: KitchenTicket, action: string, nextStatus: string) => void;
}

function KDSColumn({ col, tickets, inFlightIds, onAction }: KDSColumnProps) {
  const colTickets = tickets.filter((t) => col.statuses.includes(t.status));

  return (
    <div className="flex flex-col min-h-0">
      {/* Column header */}
      <div className={`rounded-t-xl px-4 py-2.5 flex items-center justify-between ${col.headerBg}`}>
        <span className="font-semibold text-sm text-text">{col.label}</span>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${col.countBg}`}>
          {colTickets.length}
        </span>
      </div>

      {/* Ticket list */}
      <div className="flex-1 rounded-b-xl border border-t-0 border-divider bg-surfaceMuted p-3 space-y-3">
        {colTickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-textSubtle">No orders</p>
        ) : (
          colTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              accent={col.accent}
              isInFlight={inFlightIds.current?.has(ticket.id) ?? false}
              onAction={onAction}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface KitchenOrderQueueProps {
  tickets: KitchenTicket[];
  storefrontId: string;
}

export function KitchenOrderQueue({ tickets, storefrontId }: KitchenOrderQueueProps) {
  const [queue, setQueue] = useState<KitchenTicket[]>(() => sortTickets(tickets));
  const [newCount, setNewCount] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<LiveIndicatorStatus>('connecting');
  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ridendine_kds_auto_print') === 'true';
    }
    return false;
  });
  const autoPrintRef = useRef(autoPrint);
  autoPrintRef.current = autoPrint;
  const printedIds = useRef<Set<string>>(new Set());
  const inFlightIds = useRef<Set<string>>(new Set());
  const notifiedIds = useRef<Set<string>>(new Set());
  const hydratingIds = useRef<Set<string>>(new Set());
  // id -> status we have locally confirmed via a successful action, so a stale
  // poll cannot revert the optimistic transition before the poll catches up.
  const confirmedById = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // Drop confirmations the poll has now caught up to (or passed / terminal).
    for (const inc of tickets) {
      const confirmed = confirmedById.current.get(inc.id);
      if (confirmed && (isTerminalStatus(inc.status) || rank(inc.status) >= rank(confirmed))) {
        confirmedById.current.delete(inc.id);
      }
    }
    setQueue((prev) =>
      reconcileQueue(prev, tickets, inFlightIds.current, confirmedById.current)
    );
  }, [tickets]);

  // Fetch the fully hydrated ticket (items, customer, prep times) and upsert it.
  // This is the core Stage 3 fix: realtime never adds a ticket with empty items.
  const hydrateAndUpsert = useCallback(
    async (id: string, fallback?: KitchenTicket) => {
      if (hydratingIds.current.has(id)) return;
      hydratingIds.current.add(id);
      try {
        // Two immediate attempts before falling back — covers a transient blip
        // without depending on timers (keeps the fallback path deterministic).
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch(`/api/kitchen/tickets/${id}`);
            if (res.ok) {
              const json = await res.json();
              const hydrated: KitchenTicket | undefined = json?.data?.ticket;
              if (hydrated) {
                if (autoPrintRef.current && !printedIds.current.has(hydrated.id)) {
                  printedIds.current.add(hydrated.id);
                  printThermalTicket(hydrated);
                }
                setQueue((prev) => {
                  const exists = prev.some((t) => t.id === hydrated.id);
                  const next = exists
                    ? prev.map((t) =>
                        t.id === hydrated.id
                          ? mergeHydrated(
                              t,
                              hydrated,
                              inFlightIds.current.has(t.id),
                              confirmedById.current.get(t.id)
                            )
                          : t
                      )
                    : [hydrated, ...prev];
                  return sortTickets(next);
                });
                return;
              }
            }
          } catch {
            // retry once
          }
        }
        // Hydration failed: surface the order with whatever the realtime row
        // carried so it is at least visible; the 30s poll will hydrate it fully.
        if (fallback) {
          setQueue((prev) =>
            prev.some((t) => t.id === id) ? prev : sortTickets([fallback, ...prev])
          );
        }
      } finally {
        hydratingIds.current.delete(id);
      }
    },
    []
  );

  const handleInsert = useCallback(
    (order: RealtimeOrder) => {
      if (!notifiedIds.current.has(order.id)) {
        notifiedIds.current.add(order.id);
        playNewOrderChime();
        setNewCount((c) => c + 1);
      }
      // Always (re)hydrate — covers both the initial INSERT and any duplicate
      // or follow-up event for the same order.
      void hydrateAndUpsert(order.id, thinTicketFromRealtime(order));
    },
    [hydrateAndUpsert]
  );

  const handleUpdate = useCallback(
    (order: RealtimeOrder) => {
      if (inFlightIds.current.has(order.id)) return;
      void hydrateAndUpsert(order.id);
    },
    [hydrateAndUpsert]
  );

  useStorefrontOrdersRealtime<RealtimeOrder>(storefrontId, {
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onConnectionChange: setRealtimeStatus,
  });

  const handleAction = useCallback(
    async (ticket: KitchenTicket, action: string, nextStatus: string) => {
      if (inFlightIds.current.has(ticket.id)) return;
      inFlightIds.current.add(ticket.id);
      setQueue((prev) =>
        sortTickets(prev.map((t) => (t.id === ticket.id ? { ...t, status: nextStatus } : t)))
      );
      try {
        const res = await fetch(`/api/orders/${ticket.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, status: nextStatus }),
        });
        if (!res.ok) {
          setQueue((prev) =>
            sortTickets(prev.map((t) => (t.id === ticket.id ? { ...t, status: ticket.status } : t)))
          );
          try {
            const body = await res.json();
            const msg = body?.error?.message || body?.error?.code || `HTTP ${res.status}`;
            setActionError(`Action failed: ${msg}`);
          } catch {
            setActionError(`Action failed: HTTP ${res.status}`);
          }
        } else {
          // Confirm the transition so a stale poll cannot revert it.
          confirmedById.current.set(ticket.id, nextStatus);
          setActionError(null);
        }
      } catch {
        setQueue((prev) =>
          sortTickets(prev.map((t) => (t.id === ticket.id ? { ...t, status: ticket.status } : t)))
        );
        setActionError('Action failed: network error');
      } finally {
        inFlightIds.current.delete(ticket.id);
        setQueue((prev) => sortTickets([...prev]));
      }
    },
    []
  );

  const [mobileColumn, setMobileColumn] = useState<'all' | ColumnKey>('all');
  const totalActive = queue.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Action error banner */}
      {actionError && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-dangerSoft px-4 py-2 text-sm text-danger">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-2 font-bold">x</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text">Live Orders</h2>
          {newCount > 0 && (
            <Badge
              tone="danger"
              aria-label={`${newCount} new orders since page load. Click to dismiss.`}
              className="cursor-pointer"
              onClick={() => setNewCount(0)}
            >
              {newCount} new
            </Badge>
          )}
          {totalActive > 0 && (
            <span className="text-sm text-textMuted">{totalActive} active</span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-textSubtle hover:border-primary cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => {
                const val = e.target.checked;
                setAutoPrint(val);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('ridendine_kds_auto_print', String(val));
                }
              }}
              className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
            />
            <Printer className="h-3.5 w-3.5 text-textMuted" />
            <span className="hidden xs:inline sm:inline">Auto-Print 80mm</span>
            <span className="xs:hidden sm:hidden">Print</span>
          </label>
          <LiveIndicator status={realtimeStatus} />
        </div>
      </div>

      {/* Mobile stage selector (shown on small screens) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileColumn('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
            mobileColumn === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-textMuted hover:text-text'
          }`}
        >
          All ({queue.length})
        </button>
        {COLUMNS.map((col) => {
          const count = queue.filter((t) => col.statuses.includes(t.status)).length;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => setMobileColumn(col.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                mobileColumn === col.key
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-textMuted hover:text-text'
              }`}
            >
              {col.label} ({count})
            </button>
          );
        })}
      </div>

      {/* KDS board */}
      {queue.length === 0 ? (
        <div className="rounded-xl border border-divider bg-surfaceMuted py-16 text-center">
          <p className="text-textMuted">No active orders right now</p>
          <p className="mt-1 text-xs text-textSubtle">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {COLUMNS.map((col) => {
            const isVisibleOnMobile = mobileColumn === 'all' || mobileColumn === col.key;
            return (
              <div key={col.key} className={isVisibleOnMobile ? 'block' : 'hidden sm:block'}>
                <KDSColumn
                  col={col}
                  tickets={queue}
                  inFlightIds={inFlightIds}
                  onAction={handleAction}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
