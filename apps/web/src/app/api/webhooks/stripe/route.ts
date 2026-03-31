// ==========================================
// STRIPE WEBHOOK
// Powered by Central Engine
// ==========================================

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createAdminClient } from '@ridendine/db';
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

  const adminClient = createAdminClient();
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

          // Create ledger entry for payment capture
          await (adminClient as any).from('ledger_entries').insert({
            order_id: orderId,
            entry_type: 'customer_charge_capture',
            amount_cents: paymentIntent.amount,
            currency: paymentIntent.currency.toUpperCase(),
            description: `Payment confirmed for order ${paymentIntent.metadata.order_number}`,
            stripe_id: paymentIntent.id,
          });

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
          // Update order status to failed
          await adminClient
            .from('orders')
            .update({
              payment_status: 'failed',
              engine_status: 'payment_failed',
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);

          // Create exception for ops
          await engine.support.createException(
            {
              type: 'payment_issue',
              severity: 'high',
              orderId,
              title: 'Payment Failed',
              description: `Payment failed for order ${paymentIntent.metadata.order_number}: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
              recommendedActions: ['Contact customer', 'Offer retry'],
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
              paymentStatus: 'failed',
              error: paymentIntent.last_payment_error?.message,
            },
          });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          // Find order by payment_intent_id
          const { data: order } = await adminClient
            .from('orders')
            .select('id, order_number, customer_id, total')
            .eq('payment_intent_id', paymentIntentId)
            .single();

          if (order) {
            const refundedAmount = charge.amount_refunded;
            const totalAmount = charge.amount;
            const isFullRefund = refundedAmount >= totalAmount;

            // Update order status via engine
            if (isFullRefund) {
              await adminClient
                .from('orders')
                .update({
                  payment_status: 'refunded',
                  engine_status: 'refunded',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', order.id);
            } else {
              await adminClient
                .from('orders')
                .update({
                  payment_status: 'partial_refunded',
                  engine_status: 'partially_refunded',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', order.id);
            }

            // Create ledger entry for refund
            await (adminClient as any).from('ledger_entries').insert({
              order_id: order.id,
              entry_type: 'customer_refund',
              amount_cents: -refundedAmount,
              currency: charge.currency.toUpperCase(),
              description: `Refund processed for order ${order.order_number}`,
              stripe_id: charge.id,
            });

            // Emit domain event
            engine.events.emit(
              isFullRefund ? 'order.refunded' : 'order.partially_refunded',
              'order',
              order.id,
              {
                refundedAmount: refundedAmount / 100,
                totalAmount: totalAmount / 100,
                isFullRefund,
              },
              systemActor
            );

            // Log audit
            await engine.audit.log({
              action: 'status_change',
              entityType: 'order',
              entityId: order.id,
              actor: systemActor,
              afterState: {
                paymentStatus: isFullRefund ? 'refunded' : 'partial_refunded',
                refundedAmount,
                totalAmount,
              },
            });

            await engine.events.flush();

            // Get customer user_id for notification
            const { data: customer } = await adminClient
              .from('customers')
              .select('user_id')
              .eq('id', order.customer_id)
              .single();

            if (customer) {
              await (adminClient as any).from('notifications').insert({
                user_id: customer.user_id,
                type: 'refund',
                title: isFullRefund ? 'Refund Processed' : 'Partial Refund Processed',
                body: `A refund of $${(refundedAmount / 100).toFixed(2)} has been issued to your payment method.`,
                data: { order_id: order.id, refund_amount: refundedAmount },
                read: false,
              });
            }
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
