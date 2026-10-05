// ==========================================
// STRIPE WEBHOOK
// Powered by Central Engine — IRR-008 idempotent processing
// ==========================================

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { clearCart, createAdminClient } from '@ridendine/db';
import {
  createLoyaltyService,
  getStripeClient,
  claimStripeWebhookEventForProcessing,
  finalizeStripeWebhookSuccess,
  finalizeStripeWebhookFailure,
  handleStripeFinanceWebhook,
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

/**
 * Verify against the live secret, then the test one.
 *
 * Stripe's live and test dashboards each hold their OWN endpoint for this URL
 * with its own signing secret, so a test-mode event (partner test key) is signed
 * with a secret the live endpoint has never seen. Without the second attempt
 * every test payment silently fails signature verification and the order never
 * leaves `pending` — the failure looks identical to an attack, which is why it
 * is worth being explicit about.
 *
 * Signature verification is pure HMAC over the raw body; the client's API key
 * plays no part, so one client can verify both. Trying live first keeps real
 * traffic on a single comparison.
 */
function constructWebhookEvent(
  stripe: ReturnType<typeof getStripeClient>,
  body: string,
  signature: string
): { event: Stripe.Event; source: 'primary' | 'partner-test' } {
  try {
    return {
      event: stripe.webhooks.constructEvent(body, signature, getWebhookSecret()),
      source: 'primary',
    };
  } catch (liveErr) {
    const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim();
    if (!testSecret) throw liveErr;
    // Throws its own error if this doesn't match either — a genuinely bad
    // signature still ends up rejected below.
    return {
      event: stripe.webhooks.constructEvent(body, signature, testSecret),
      source: 'partner-test',
    };
  }
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

async function getOrderPaymentSnapshot(admin: ReturnType<typeof createAdminClient>, orderId: string) {
  const { data, error } = await (admin as any)
    .from('orders')
    .select('id, customer_id, subtotal, total, payment_status, engine_status, is_test')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) return null;
  return data as {
    id: string;
    customer_id: string;
    subtotal: number;
    total: number;
    payment_status: string;
    engine_status: string;
    is_test: boolean | null;
  };
}

function stripePaymentAmountCents(paymentIntent: Stripe.PaymentIntent): number {
  return paymentIntent.amount_received && paymentIntent.amount_received > 0
    ? paymentIntent.amount_received
    : paymentIntent.amount;
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
  /**
   * True when the event was signed by the TEST-mode endpoint secret, i.e. it
   * belongs to a partner test-key order. Never touch finance, ledgers, payouts
   * or the engine's money paths for these — the payment is fake.
   *
   * Derived from which secret verified the signature rather than
   * `event.livemode`, because a staging deployment runs entirely on Stripe test
   * keys and every event there is `livemode:false` — staging must keep
   * exercising the real finance paths. Only a deployment that has BOTH secrets
   * configured can produce a 'partner-test' event.
   */
  let isPartnerTestEvent = false;

  try {
    const stripe = getStripeClient();
    const verified = constructWebhookEvent(stripe, body, signature);
    event = verified.event;
    isPartnerTestEvent = verified.source === 'partner-test';
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
  let relatedPaymentId: string | null = null;
  let stripeAmountCents: number | null = null;

  if (event.type.startsWith('payment_intent.')) {
    const pi = event.data.object as Stripe.PaymentIntent;
    relatedOrderId = orderIdFromPaymentIntent(pi);
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
          const orderSnapshot = await getOrderPaymentSnapshot(admin, orderId);
          if (!orderSnapshot) {
            throw new Error(`Order not found for Stripe PaymentIntent ${paymentIntent.id}`);
          }

          const expectedAmountCents = Math.round(Number(orderSnapshot.total) * 100);
          const paidAmountCents = stripePaymentAmountCents(paymentIntent);
          if (paidAmountCents !== expectedAmountCents) {
            throw new Error(
              `Stripe amount mismatch for order ${orderId}: expected ${expectedAmountCents}, received ${paidAmountCents}`
            );
          }

          // Test-mode order (partner test key): record the payment but keep it
          // OUT of the kitchen queue, finance, loyalty, and payouts.
          // Either signal is sufficient — a test-signed event must never reach
          // the money paths even if the order row somehow lacks the flag.
          if (orderSnapshot.is_test || isPartnerTestEvent) {
            if (orderSnapshot.payment_status !== 'completed') {
              await (admin as any)
                .from('orders')
                .update({
                  payment_status: 'completed',
                  payment_intent_id: paymentIntent.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', orderId);
            }
            await finalizeStripeWebhookSuccess(admin, event.id, orderId);
            break;
          }

          if (orderSnapshot.payment_status !== 'completed') {
            const authResult = await engine.orderCreation.authorizePayment(
              orderId,
              paymentIntent.id,
              systemActor
            );

            if (!authResult.success) {
              throw new Error(
                `Failed to authorize payment for order ${orderId}: ${authResult.error?.message ?? authResult.error?.code ?? 'unknown'}`
              );
            }

            await (admin as any)
              .from('orders')
              .update({
                payment_status: 'completed',
                payment_intent_id: paymentIntent.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', orderId);

            const submitResult = await engine.orderCreation.submitToKitchen(
              orderId,
              systemActor
            );

            if (!submitResult.success) {
              console.error(
                'Failed to submit order to kitchen:',
                submitResult.error?.code,
                redactSensitiveForLog(submitResult.error?.message || '')
              );
              // Recovery: payment succeeded so directly advance to pending.
              // The .eq guard makes this idempotent and safe against concurrent cancellations.
              const { error: fallbackError } = await (admin as any)
                .from('orders')
                .update({
                  engine_status: 'pending',
                  status: 'pending',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', orderId)
                .eq('engine_status', 'payment_authorized');
              if (fallbackError) {
                console.error('submitToKitchen fallback also failed for order', orderId, fallbackError.message);
              }
            }

            const cartId = paymentIntent.metadata?.cart_id;
            if (cartId) {
              await clearCart(admin as any, cartId);
            }

            const promoCodeId = paymentIntent.metadata?.promo_code_id;
            if (promoCodeId) {
              await (admin as any).rpc('increment_promo_usage', { promo_id: promoCodeId });
            }

            await createLoyaltyService(admin as any).earnPoints(
              orderSnapshot.customer_id,
              orderId,
              Math.round(Number(orderSnapshot.subtotal) * 100)
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
        await handleStripeFinanceWebhook(admin, engine, event, systemActor);
        await finalizeStripeWebhookSuccess(admin, event.id, orderId);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = orderIdFromPaymentIntent(paymentIntent);

        // A declined TEST card (partners are told to try 4000…9995) must not
        // run the live payment-failure path or write reconciliation rows.
        // Record the outcome on the order and stop.
        if (isPartnerTestEvent) {
          if (orderId) {
            await (admin as any)
              .from('orders')
              .update({
                payment_status: 'failed',
                payment_intent_id: paymentIntent.id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', orderId)
              .eq('is_test', true);
          }
          await finalizeStripeWebhookSuccess(admin, event.id, orderId);
          break;
        }

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
        await handleStripeFinanceWebhook(admin, engine, event, systemActor);
        await finalizeStripeWebhookSuccess(admin, event.id, orderId);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;

        // Refund of a test payment (e.g. a partner cancelling a test order).
        // No real money moved, so no ledger or reconciliation entry should exist.
        if (isPartnerTestEvent) {
          if (paymentIntentId) {
            await (admin as any)
              .from('orders')
              .update({ payment_status: 'refunded', updated_at: new Date().toISOString() })
              .eq('payment_intent_id', paymentIntentId)
              .eq('is_test', true);
          }
          await finalizeStripeWebhookSuccess(admin, event.id, null);
          break;
        }

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
        await handleStripeFinanceWebhook(admin, engine, event, systemActor);
        await finalizeStripeWebhookSuccess(admin, event.id, null);
        break;
      }

      case 'transfer.created':
      case 'payout.paid':
      case 'payout.failed':
        await handleStripeFinanceWebhook(admin, engine, event, systemActor);
        await finalizeStripeWebhookSuccess(admin, event.id, relatedOrderId);
        break;

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
