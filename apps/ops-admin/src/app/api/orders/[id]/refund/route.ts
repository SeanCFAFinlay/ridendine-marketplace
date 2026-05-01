import { NextResponse } from 'next/server';
import { createAdminClient, getOrderById, type SupabaseClient } from '@ridendine/db';
import { getStripeClient } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  finalizeOpsActor,
  getOpsActorContext,
  getEngine,
  guardPlatformApi,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    const opsActor = finalizeOpsActor(
      actor,
      guardPlatformApi(actor, 'finance_refunds_sensitive')
    );
    if (opsActor instanceof Response) return opsActor;

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.opsAdminMutation,
      namespace: 'ops-order-refund-post',
      userId: opsActor.userId,
      routeKey: 'POST:/api/orders/[id]/refund',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

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

    const stripe = getStripeClient();

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

    // Transition order status through MasterOrderEngine
    const isFullRefund = amount >= order.total;
    const engine = getEngine();
    const result = await engine.masterOrder.refundOrder({
      orderId: order.id,
      actorId: opsActor.userId,
      actorRole: opsActor.role as string,
      reason: reason || 'Refund processed',
    });

    if (!result.success) {
      // Refund was processed in Stripe but engine transition failed.
      // Log warning but don't fail the request since money was already refunded.
      console.warn(`Engine transition failed after Stripe refund: ${result.error}`);
    }

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
