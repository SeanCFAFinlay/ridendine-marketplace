import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient, getOrderById, type SupabaseClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid refund amount is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const order = await getOrderById(supabase, id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.payment_intent_id) {
      return NextResponse.json(
        { error: 'Order has no payment intent' },
        { status: 400 }
      );
    }

    if (order.payment_status !== 'completed') {
      return NextResponse.json(
        { error: 'Order payment is not completed' },
        { status: 400 }
      );
    }

    if (amount > order.total) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed order total' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    const refund = await stripe.refunds.create({
      payment_intent: order.payment_intent_id,
      amount: amount,
      reason: reason === 'duplicate' ? 'duplicate' :
              reason === 'fraudulent' ? 'fraudulent' :
              'requested_by_customer',
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        refund_reason: reason || 'No reason provided',
      },
    });

    // Update order payment status
    const isFullRefund = amount >= order.total;
    await (supabase as any)
      .from('orders')
      .update({
        payment_status: isFullRefund ? 'refunded' : 'partial_refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    // Create notification for customer
    await (supabase as any).from('notifications').insert({
      user_id: order.customer_id,
      type: 'refund',
      title: isFullRefund ? 'Refund Processed' : 'Partial Refund Processed',
      body: `A refund of $${(amount / 100).toFixed(2)} has been issued for order #${order.order_number}.`,
      data: {
        order_id: order.id,
        refund_amount: amount,
        refund_id: refund.id,
      },
      read: false,
    });

    return NextResponse.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
        orderPaymentStatus: isFullRefund ? 'refunded' : 'partial_refunded',
      },
    });
  } catch (error) {
    console.error('Refund error:', error);

    if (error instanceof Error && error.name === 'StripeError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
