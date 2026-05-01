// ==========================================
// STRIPE WEBHOOK
// Powered by Central Engine — IRR-008 idempotent processing
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
} from '@ridendine/engine';
import { getEngine, getSystemActor } from '@/lib/engine';
import {
  evaluateRateLimit,
  getCorrelationId,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
  redactSensitiveForLog,
  withCorrelationId,
} from '@ridendine/utils';

function getWebhookSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}

function orderIdFromPaymentIntent(pi: Stripe.PaymentIntent): string | null {
  const id = pi.metadata?.order_id;
  return id && String(id).length > 0 ? String(id) : null;
}

function webhookErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 2000);
  return String(err).slice(0, 2000);
}

function safeWebhookLog(err: unknown): string {
  return redactSensitiveForLog(webhookErrorMessage(err));
}

export async function POST(request: Request): Promise<Response> {
  const correlationId = getCorrelationId(request);
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return withCorrelationId(
      NextResponse.json(
        { code: 'WEBHOOK_SIGNATURE_INVALID', error: 'Missing signature' },
        { status: 400 }
      ),
      correlationId
    );
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    const webhookSecret = getWebhookSecret();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', safeWebhookLog(err));
    return withCorrelationId(
      NextResponse.json(
        { code: 'WEBHOOK_SIGNATURE_INVALID', error: 'Invalid signature' },
        { status: 400 }
      ),
      correlationId
    );
  }

  const webhookLimit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.webhookStripe,
    namespace: 'webhook-stripe',
    eventId: event.id,
    routeKey: 'POST:/api/webhooks/stripe',
  });
  if (!webhookLimit.allowed) {
    return withCorrelationId(rateLimitPolicyResponse(webhookLimit), correlationId);
  }

  const admin = createAdminClient();
  const engine = getEngine();
  const systemActor = getSystemActor();

  let relatedOrderId: string | null = null;
  if (event.type.startsWith('payment_intent.')) {
    relatedOrderId = orderIdFromPaymentIntent(
      event.data.object as Stripe.PaymentIntent
    );
  }

  let claim;
  try {
    claim = await claimStripeWebhookEventForProcessing(admin, {
      stripeEventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
      relatedOrderId,
    });
  } catch (e) {
    console.error('Stripe idempotency claim failed:', safeWebhookLog(e));
    return withCorrelationId(
      NextResponse.json(
        { code: 'IDEMPOTENCY_CONFLICT', error: 'Idempotency claim failed' },
        { status: 409 }
      ),
      correlationId
    );
  }

  if (claim.action !== 'proceed') {
    return withCorrelationId(
      NextResponse.json({
        received: true,
        idempotentReplay: true,
        reason: claim.action,
      }),
      correlationId
    );
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = orderIdFromPaymentIntent(paymentIntent);

        if (orderId) {
          const submitResult = await engine.orders.submitToKitchen(
            orderId,
            systemActor
          );

          if (!submitResult.success) {
            console.error(
              'Failed to submit order to kitchen:',
              submitResult.error?.code,
              redactSensitiveForLog(submitResult.error?.message || '')
            );
          }

          engine.events.emit(
            'payment.confirmed',
            'order',
            orderId,
            {
              paymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount / 100,
              orderNumber: paymentIntent.metadata.order_number,
            },
            systemActor
          );

          await engine.audit.log({
            action: 'status_change',
            entityType: 'order',
            entityId: orderId,
            actor: systemActor,
            afterState: {
              paymentStatus: 'completed',
              paymentIntentId: paymentIntent.id,
              amount: paymentIntent.amount,
            },
          });

          await engine.events.flush();
        }
        await finalizeStripeWebhookSuccess(admin, event.id, orderId);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = orderIdFromPaymentIntent(paymentIntent);

        if (orderId) {
          const result = await engine.platform.handlePaymentFailure(
            {
              orderId,
              orderNumber: paymentIntent.metadata.order_number,
              message:
                paymentIntent.last_payment_error?.message || 'Unknown error',
              paymentIntentId: paymentIntent.id,
            },
            systemActor
          );

          if (!result.success) {
            console.error(
              'Failed to process payment failure webhook:',
              result.error?.code,
              redactSensitiveForLog(result.error?.message || '')
            );
          }
        }
        await finalizeStripeWebhookSuccess(admin, event.id, orderId);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (paymentIntentId) {
          const result = await engine.platform.handleExternalRefund(
            {
              paymentIntentId,
              stripeChargeId: charge.id,
              refundedAmountCents: charge.amount_refunded,
              totalAmountCents: charge.amount,
              currency: charge.currency.toUpperCase(),
            },
            systemActor
          );

          if (!result.success) {
            console.error(
              'Failed to process refund webhook:',
              result.error?.code,
              redactSensitiveForLog(result.error?.message || '')
            );
          }
        }
        await finalizeStripeWebhookSuccess(admin, event.id, null);
        break;
      }

      default:
        console.log(`[stripe-webhook] unhandled event type (recorded): ${event.type}`);
        await finalizeStripeWebhookSuccess(admin, event.id, relatedOrderId);
    }

    return withCorrelationId(NextResponse.json({ received: true }), correlationId);
  } catch (error) {
    const redacted = safeWebhookLog(error);
    console.error('Webhook processing error:', redacted);

    await finalizeStripeWebhookFailure(admin, event.id, redacted);

    await engine.audit.log({
      action: 'create',
      entityType: 'webhook_error',
      entityId: event.id,
      actor: systemActor,
      afterState: {
        eventType: event.type,
        error: redacted,
      },
    });

    return withCorrelationId(
      NextResponse.json(
        { code: 'INTERNAL_ERROR', error: 'Webhook processing failed' },
        { status: 500 }
      ),
      correlationId
    );
  }
}
