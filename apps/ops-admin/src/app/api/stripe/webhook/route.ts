// ==========================================
// Stripe finance webhook (Phase 6) — optional second endpoint
// Configure STRIPE_WEBHOOK_SECRET_OPS in Stripe Dashboard for this URL, or reuse STRIPE_WEBHOOK_SECRET.
// Reconciliation + payout lifecycle only (no kitchen submit). Prefer the web marketplace webhook for PI → kitchen.
// ==========================================

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { createAdminClient } from '@ridendine/db';
import {
  getStripeClient,
  claimStripeWebhookEventForProcessing,
  finalizeStripeWebhookSuccess,
  finalizeStripeWebhookFailure,
  handleStripeFinanceWebhook,
} from '@ridendine/engine';
import { getSystemActor } from '@ridendine/engine/server';
import { getEngine } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const FINANCE_TYPES = new Set([
  'payment_intent.succeeded',
  'charge.refunded',
  'transfer.created',
  'payout.paid',
  'payout.failed',
]);

function webhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET_OPS?.trim() || process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!s) {
    throw new Error('STRIPE_WEBHOOK_SECRET_OPS or STRIPE_WEBHOOK_SECRET is required');
  }
  return s;
}

function safeMsg(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 2000);
  return String(err).slice(0, 2000);
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  const sig = (await headers()).get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret());
  } catch (e) {
    console.error('[ops stripe webhook] signature failed', safeMsg(e));
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!FINANCE_TYPES.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true, eventType: event.type });
  }

  const admin = createAdminClient();
  const engine = getEngine();
  const systemActor = getSystemActor();

  let relatedOrderId: string | null = null;
  let relatedPaymentId: string | null = null;
  let stripeAmountCents: number | null = null;

  if (event.type.startsWith('payment_intent.')) {
    const pi = event.data.object as Stripe.PaymentIntent;
    const oid = pi.metadata?.order_id;
    relatedOrderId = oid && String(oid).length > 0 ? String(oid) : null;
    relatedPaymentId = pi.id;
    stripeAmountCents = pi.amount_received ?? pi.amount;
  } else if (event.type === 'charge.refunded') {
    const ch = event.data.object as Stripe.Charge;
    relatedPaymentId =
      typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id ?? null;
    stripeAmountCents = ch.amount_refunded;
  } else if (event.type === 'transfer.created') {
    const tr = event.data.object as Stripe.Transfer;
    relatedPaymentId = tr.id;
    stripeAmountCents = tr.amount;
  } else if (event.type === 'payout.paid' || event.type === 'payout.failed') {
    const po = event.data.object as Stripe.Payout;
    relatedPaymentId = po.id;
    stripeAmountCents = po.amount;
  }

  let claim;
  try {
    claim = await claimStripeWebhookEventForProcessing(admin, {
      stripeEventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
      relatedOrderId,
      relatedPaymentId,
      stripeAmountCents,
    });
  } catch (e) {
    console.error('[ops stripe webhook] claim failed', safeMsg(e));
    return NextResponse.json({ error: 'Idempotency claim failed' }, { status: 409 });
  }

  if (claim.action !== 'proceed') {
    return NextResponse.json({ received: true, idempotentReplay: true, reason: claim.action });
  }

  try {
    await handleStripeFinanceWebhook(admin, engine, event, systemActor);
    await finalizeStripeWebhookSuccess(admin, event.id, relatedOrderId);
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = safeMsg(e);
    console.error('[ops stripe webhook] handler error', msg);
    await finalizeStripeWebhookFailure(admin, event.id, msg);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
