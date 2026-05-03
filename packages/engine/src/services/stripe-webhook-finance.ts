// ==========================================
// Stripe finance webhooks — reconciliation + payout state (Phase 6)
// Idempotency is owned by claim/finalize on the route; this runs after a successful claim.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import type { ActorContext } from '@ridendine/types';
import { ActorRole, AuditAction } from '@ridendine/types';
import type { AuditLogger } from '../core/audit-logger';
import type { LedgerService } from './ledger.service';

export type FinanceWebhookEngineSlice = {
  ledger: LedgerService;
  audit: AuditLogger;
};

function reconUpsertBase(
  client: SupabaseClient,
  eventId: string,
  ledgerIds: string[],
  stripeAmountCents: number | null,
  notes: string | null
) {
  const hasLedger = ledgerIds.length > 0;
  return client.from('stripe_reconciliation').upsert(
    {
      stripe_event_id: eventId,
      ledger_entry_ids: ledgerIds,
      status: hasLedger ? 'matched' : 'unmatched',
      variance_cents: hasLedger ? 0 : 1,
      variance_flagged: false,
      notes,
    },
    { onConflict: 'stripe_event_id' }
  );
}

/**
 * Maps Connect transfer / payout lifecycle events to ledger rows and `stripe_reconciliation`.
 * Never throws — callers log and decide HTTP status.
 */
export async function handleStripeFinanceWebhook(
  client: SupabaseClient,
  engine: FinanceWebhookEngineSlice,
  event: Stripe.Event,
  systemActor: ActorContext
): Promise<void> {
  try {
    switch (event.type) {
      case 'transfer.created': {
        const tr = event.data.object as Stripe.Transfer;
        const { data: led } = await client.from('ledger_entries').select('id').eq('stripe_id', tr.id);
        const ledgerIds = (led ?? []).map((r) => (r as { id: string }).id);
        await reconUpsertBase(client, event.id, ledgerIds, tr.amount, `transfer.created ${tr.id}`);

        await client
          .from('chef_payouts')
          .update({ status: 'completed', paid_at: new Date().toISOString() })
          .eq('stripe_transfer_id', tr.id)
          .eq('status', 'pending');

        await client
          .from('driver_payouts')
          .update({ status: 'completed' })
          .eq('stripe_transfer_id', tr.id)
          .in('status', ['pending', 'processing']);
        break;
      }

      case 'payout.paid': {
        const po = event.data.object as Stripe.Payout;
        const { data: led } = await client.from('ledger_entries').select('id').eq('stripe_id', po.id);
        const ledgerIds = (led ?? []).map((r) => (r as { id: string }).id);
        await reconUpsertBase(client, event.id, ledgerIds, po.amount, `payout.paid ${po.id}`);

        await client
          .from('instant_payout_requests')
          .update({ status: 'executed', executed_at: new Date().toISOString() })
          .eq('stripe_payout_id', po.id);
        break;
      }

      case 'payout.failed': {
        const po = event.data.object as Stripe.Payout;
        const { data: req } = await client
          .from('instant_payout_requests')
          .select('id, driver_id, fee_cents, status')
          .eq('stripe_payout_id', po.id)
          .maybeSingle();

        await reconUpsertBase(
          client,
          event.id,
          [],
          po.amount,
          `payout.failed ${po.id}: ${po.failure_message ?? 'unknown'}`
        );

        if (req?.id && req.driver_id) {
          const fee = (req.fee_cents as number) ?? 0;
          if (fee > 0 && (req.status === 'executing' || req.status === 'pending')) {
            await engine.ledger.reverseInstantPayoutFee({
              orderId: null,
              driverId: req.driver_id as string,
              feeCents: fee,
              currency: (po.currency ?? 'cad').toUpperCase(),
              requestId: req.id as string,
            });
          }
          await client
            .from('instant_payout_requests')
            .update({
              status: 'failed',
              failure_reason: (po.failure_message ?? 'payout.failed').slice(0, 500),
            })
            .eq('id', req.id as string);
        }

        await engine.audit.log({
          action: AuditAction.STATUS_CHANGE,
          entityType: 'stripe_payout',
          entityId: po.id,
          actor: systemActor,
          afterState: { eventId: event.id, failure_message: po.failure_message },
        });
        break;
      }

      case 'payment_intent.succeeded':
      case 'charge.refunded': {
        let paymentId: string | null = null;
        let amountCents: number | null = null;
        if (event.type === 'payment_intent.succeeded') {
          const pi = event.data.object as Stripe.PaymentIntent;
          paymentId = pi.id;
          amountCents = pi.amount_received ?? pi.amount;
        } else {
          const ch = event.data.object as Stripe.Charge;
          paymentId =
            typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id ?? null;
          amountCents = ch.amount_refunded ?? ch.amount;
        }
        if (!paymentId) break;

        const { data: byStripe } = await client.from('ledger_entries').select('id').eq('stripe_id', paymentId);
        const ledgerIds = (byStripe ?? []).map((r) => (r as { id: string }).id);
        await reconUpsertBase(client, event.id, ledgerIds, amountCents, `${event.type} ${paymentId}`);
        break;
      }

      default:
        break;
    }
  } catch (e) {
    await engine.audit.log({
      action: AuditAction.CREATE,
      entityType: 'stripe_finance_webhook_error',
      entityId: event.id,
      actor: systemActor,
      afterState: {
        eventType: event.type,
        error: e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500),
      },
    });
  }
}

export const financeWebhookSystemActor: ActorContext = {
  userId: '00000000-0000-0000-0000-000000000000',
  role: ActorRole.SYSTEM,
};
