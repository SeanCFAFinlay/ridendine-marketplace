// ==========================================
// STRIPE WEBHOOK
// Powered by Central Engine
// ==========================================

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getEngine, getSystemActor } from '@/lib/engine';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
  });
}

function getWebhookSecret() {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const engine = getEngine();
  const systemActor = getSystemActor();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.order_id;

        if (orderId) {
          // Submit order to kitchen via engine (payment confirmed)
          const submitResult = await engine.orders.submitToKitchen(orderId, systemActor);

          if (!submitResult.success) {
            console.error('Failed to submit order to kitchen:', submitResult.error);
            // Don't fail the webhook - the order is paid
          }

          // Emit domain event
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

          // Log audit
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
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.order_id;

        if (orderId) {
          const result = await engine.platform.handlePaymentFailure(
            {
              orderId,
              orderNumber: paymentIntent.metadata.order_number,
              message: paymentIntent.last_payment_error?.message || 'Unknown error',
              paymentIntentId: paymentIntent.id,
            },
            systemActor
          );

          if (!result.success) {
            console.error('Failed to process payment failure webhook:', result.error);
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

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
            console.error('Failed to process refund webhook:', result.error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);

    // Log the error
    await engine.audit.log({
      action: 'create',
      entityType: 'webhook_error',
      entityId: event.id,
      actor: systemActor,
      afterState: {
        eventType: event.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
