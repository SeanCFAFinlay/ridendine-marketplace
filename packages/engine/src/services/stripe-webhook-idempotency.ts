// ==========================================
// STRIPE WEBHOOK IDEMPOTENCY (IRR-008)
// Uses `stripe_events_processed` — insert claim before side effects.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';

export type StripeWebhookClaimResult =
  | { action: 'proceed'; rowId: string }
  | { action: 'skip_already_processed' }
  | { action: 'skip_in_flight' };

export async function claimStripeWebhookEventForProcessing(
  client: SupabaseClient,
  params: {
    stripeEventId: string;
    eventType: string;
    livemode: boolean;
    relatedOrderId?: string | null;
    /** e.g. PaymentIntent id for reconciliation / ledger stripe_id joins */
    relatedPaymentId?: string | null;
    /** Major amount for the Stripe object (e.g. PI amount_received), cents */
    stripeAmountCents?: number | null;
  }
): Promise<StripeWebhookClaimResult> {
  const { data: existing } = await client
    .from('stripe_events_processed')
    .select('id, processing_status')
    .eq('stripe_event_id', params.stripeEventId)
    .maybeSingle();

  if (existing?.processing_status === 'processed') {
    return { action: 'skip_already_processed' };
  }

  if (existing?.processing_status === 'processing') {
    return { action: 'skip_in_flight' };
  }

  if (existing?.processing_status === 'failed') {
    const now = new Date().toISOString();
    await client
      .from('stripe_events_processed')
      .update({
        processing_status: 'processing',
        error_message: null,
        processed_at: now,
        event_type: params.eventType,
        livemode: params.livemode,
        related_order_id: params.relatedOrderId ?? null,
        related_payment_id: params.relatedPaymentId ?? null,
        stripe_amount_cents: params.stripeAmountCents ?? null,
      })
      .eq('stripe_event_id', params.stripeEventId);
    return { action: 'proceed', rowId: existing.id };
  }

  const { data: inserted, error } = await client
    .from('stripe_events_processed')
    .insert({
      stripe_event_id: params.stripeEventId,
      event_type: params.eventType,
      livemode: params.livemode,
      related_order_id: params.relatedOrderId ?? null,
      related_payment_id: params.relatedPaymentId ?? null,
      stripe_amount_cents: params.stripeAmountCents ?? null,
      processing_status: 'processing',
    })
    .select('id')
    .single();

  if (error?.code === '23505') {
    return { action: 'skip_in_flight' };
  }

  if (error || !inserted) {
    throw new Error(error?.message ?? 'stripe_events_processed insert failed');
  }

  return { action: 'proceed', rowId: inserted.id };
}

export async function finalizeStripeWebhookSuccess(
  client: SupabaseClient,
  stripeEventId: string,
  relatedOrderId?: string | null
): Promise<void> {
  const patch: Record<string, unknown> = {
    processing_status: 'processed',
    processed_at: new Date().toISOString(),
    error_message: null,
  };
  if (relatedOrderId != null) {
    patch.related_order_id = relatedOrderId;
  }
  await client.from('stripe_events_processed').update(patch).eq('stripe_event_id', stripeEventId);
}

export async function finalizeStripeWebhookFailure(
  client: SupabaseClient,
  stripeEventId: string,
  message: string
): Promise<void> {
  await client
    .from('stripe_events_processed')
    .update({
      processing_status: 'failed',
      error_message: message.slice(0, 2000),
      processed_at: new Date().toISOString(),
    })
    .eq('stripe_event_id', stripeEventId);
}
