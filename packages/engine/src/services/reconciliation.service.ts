// ==========================================
// RECONCILIATION SERVICE — Stripe events ↔ ledger (Phase 6)
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext } from '@ridendine/types';

/** Auto-flag finance review when Stripe snapshot vs ledger differs by more than this (cents). */
const HIGH_VARIANCE_CENTS = 100;

export type ReconciliationRunSummary = {
  date: string;
  examined: number;
  matched: number;
  unmatched: number;
  disputed: number;
};

export class ReconciliationService {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Daily job: ensure every processed Stripe event has a reconciliation row.
   * Compares `stripe_events_processed.stripe_amount_cents` to ledger totals when available.
   */
  async runDaily(dateIso: string): Promise<ReconciliationRunSummary> {
    const day = dateIso.slice(0, 10);
    const start = `${day}T00:00:00.000Z`;
    const end = `${day}T23:59:59.999Z`;

    const { data: events, error } = await this.client
      .from('stripe_events_processed')
      .select(
        'stripe_event_id, related_order_id, related_payment_id, event_type, processed_at, stripe_amount_cents'
      )
      .gte('processed_at', start)
      .lte('processed_at', end);

    if (error || !events) {
      return { date: day, examined: 0, matched: 0, unmatched: 0, disputed: 0 };
    }

    let matched = 0;
    let unmatched = 0;
    let disputed = 0;

    for (const ev of events) {
      const stripeEventId = ev.stripe_event_id as string;
      const orderId = ev.related_order_id as string | null;
      const paymentId = ev.related_payment_id as string | null;
      const stripeSnap = ev.stripe_amount_cents as number | null | undefined;

      const ledgerIds: string[] = [];

      if (paymentId) {
        const { data: byStripe } = await this.client
          .from('ledger_entries')
          .select('id')
          .eq('stripe_id', paymentId);
        for (const row of byStripe ?? []) ledgerIds.push((row as { id: string }).id);
      }

      if (ledgerIds.length === 0 && orderId) {
        const { data: byOrder } = await this.client
          .from('ledger_entries')
          .select('id')
          .eq('order_id', orderId)
          .in('entry_type', ['customer_charge_capture', 'customer_refund', 'customer_partial_refund']);
        for (const row of byOrder ?? []) ledgerIds.push((row as { id: string }).id);
      }

      let ledgerSumAbs = 0;
      if (ledgerIds.length > 0) {
        const { data: ledRows } = await this.client
          .from('ledger_entries')
          .select('amount_cents')
          .in('id', ledgerIds);
        for (const r of ledRows ?? []) {
          ledgerSumAbs += Math.abs((r as { amount_cents: number }).amount_cents);
        }
      } else if (orderId && (stripeSnap == null || stripeSnap > 0)) {
        const { data: cap } = await this.client
          .from('ledger_entries')
          .select('amount_cents')
          .eq('order_id', orderId)
          .eq('entry_type', 'customer_charge_capture')
          .maybeSingle();
        if (cap?.amount_cents != null) {
          ledgerSumAbs = Math.abs(cap.amount_cents as number);
        }
      }

      const hasLedger = ledgerIds.length > 0 || ledgerSumAbs > 0;
      let varianceCents = 0;
      let varianceFlagged = false;
      let status: 'matched' | 'unmatched' | 'disputed' = 'unmatched';
      let notes: string | null = null;

      if (!hasLedger) {
        status = 'unmatched';
        varianceCents = 1;
        notes = `No ledger match for event ${ev.event_type} (order=${orderId ?? 'n/a'}, payment=${paymentId ?? 'n/a'})`;
        unmatched += 1;
      } else if (stripeSnap != null && stripeSnap > 0 && ledgerSumAbs === 0) {
        status = 'unmatched';
        varianceCents = stripeSnap;
        notes = `Stripe amount ${stripeSnap}c but no matching ledger amounts for linked ids`;
        unmatched += 1;
      } else if (stripeSnap != null && stripeSnap > 0 && ledgerSumAbs > 0) {
        varianceCents = Math.abs(stripeSnap - ledgerSumAbs);
        if (varianceCents === 0) {
          status = 'matched';
          matched += 1;
        } else {
          status = 'disputed';
          varianceFlagged = varianceCents >= HIGH_VARIANCE_CENTS;
          disputed += 1;
          notes = `Amount variance: stripe=${stripeSnap} vs ledger_abs_sum=${ledgerSumAbs} (Δ${varianceCents}c)`;
        }
      } else {
        // Presence-only match when Stripe snapshot missing
        status = 'matched';
        varianceCents = 0;
        matched += 1;
        if (stripeSnap == null) {
          notes = 'Ledger linked; stripe_amount_cents not recorded on event — amount parity not verified';
        }
      }

      const { error: upsertErr } = await this.client.from('stripe_reconciliation').upsert(
        {
          stripe_event_id: stripeEventId,
          ledger_entry_ids: ledgerIds,
          status,
          variance_cents: varianceCents,
          variance_flagged: varianceFlagged,
          notes,
        },
        { onConflict: 'stripe_event_id' }
      );

      if (upsertErr) {
        disputed += 1;
      }
    }

    return {
      date: day,
      examined: events.length,
      matched,
      unmatched,
      disputed,
    };
  }

  async resolveManual(input: {
    reconId: string;
    actor: ActorContext;
    notes: string;
    ledgerEntryIds?: string[];
  }): Promise<{ ok: boolean; error?: string }> {
    const patch: Record<string, unknown> = {
      status: 'manual_resolved',
      notes: `${input.notes} (resolved_by_user=${input.actor.userId})`,
      resolved_at: new Date().toISOString(),
      resolved_by: null,
      variance_cents: 0,
      variance_flagged: false,
    };
    if (input.ledgerEntryIds?.length) {
      patch.ledger_entry_ids = input.ledgerEntryIds;
    }

    const { error } = await this.client.from('stripe_reconciliation').update(patch).eq('id', input.reconId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
}

export function createReconciliationService(client: SupabaseClient): ReconciliationService {
  return new ReconciliationService(client);
}
