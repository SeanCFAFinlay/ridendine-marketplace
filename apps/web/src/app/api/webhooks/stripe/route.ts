import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createAdminClient, incrementPromoCodeUsage } from '@ridendine/db';

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

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.order_id;
        const promoCodeId = paymentIntent.metadata.promo_code_id;

        if (orderId) {
          // Update order payment status
          await supabase
            .from('orders')
            .update({ payment_status: 'completed' })
            .eq('id', orderId);

          // Increment promo code usage if one was applied
          if (promoCodeId) {
            await incrementPromoCodeUsage(supabase as any, promoCodeId);
          }

          // Clear the cart
          const { data: order } = await supabase
            .from('orders')
            .select('customer_id, storefront_id')
            .eq('id', orderId)
            .single();

          if (order) {
            // Get cart and clear it
            const { data: cart } = await supabase
              .from('carts')
              .select('id')
              .eq('customer_id', order.customer_id)
              .eq('storefront_id', order.storefront_id)
              .single();

            if (cart) {
              await supabase.from('cart_items').delete().eq('cart_id', cart.id);
              await supabase.from('carts').delete().eq('id', cart.id);
            }

            // Create notification for chef
            const { data: storefront } = await supabase
              .from('chef_storefronts')
              .select('chef_id')
              .eq('id', order.storefront_id)
              .single();

            if (storefront) {
              const { data: chef } = await supabase
                .from('chef_profiles')
                .select('user_id')
                .eq('id', storefront.chef_id)
                .single();

              if (chef) {
                await (supabase as any).from('notifications').insert({
                  user_id: chef.user_id,
                  type: 'new_order',
                  title: 'New Order Received!',
                  body: `Order #${paymentIntent.metadata.order_number} has been paid. Please accept or decline.`,
                  data: { order_id: orderId },
                  read: false,
                });
              }
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata.order_id;

        if (orderId) {
          await supabase
            .from('orders')
            .update({ payment_status: 'failed', status: 'cancelled' })
            .eq('id', orderId);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          // Find order by payment_intent_id
          const { data: order } = await supabase
            .from('orders')
            .select('id, customer_id, total')
            .eq('payment_intent_id', paymentIntentId)
            .single();

          if (order) {
            // Determine if full or partial refund
            const refundedAmount = charge.amount_refunded;
            const totalAmount = charge.amount;
            const paymentStatus = refundedAmount >= totalAmount ? 'refunded' : 'partial_refunded';

            // Update order payment status
            await supabase
              .from('orders')
              .update({
                payment_status: paymentStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', order.id);

            // Create notification for customer
            await (supabase as any).from('notifications').insert({
              user_id: order.customer_id,
              type: 'refund',
              title: paymentStatus === 'refunded' ? 'Refund Processed' : 'Partial Refund Processed',
              body: `A refund of $${(refundedAmount / 100).toFixed(2)} has been issued to your payment method.`,
              data: { order_id: order.id, refund_amount: refundedAmount },
              read: false,
            });
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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
