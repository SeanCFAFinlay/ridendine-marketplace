import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, DomainEventType, OperationResult } from '@ridendine/types';
import { DomainEventEmitter } from '../core/event-emitter';
import { AuditLogger } from '../core/audit-logger';
import { OrderOrchestrator } from './order.orchestrator';
import { DispatchEngine } from './dispatch.engine';
import { SupportExceptionEngine } from './support.engine';

interface PaymentFailureInput {
  orderId: string;
  orderNumber?: string;
  message?: string;
  paymentIntentId?: string;
}

interface ExternalRefundInput {
  paymentIntentId: string;
  stripeChargeId: string;
  refundedAmountCents: number;
  totalAmountCents: number;
  currency: string;
}

export class PlatformWorkflowEngine {
  constructor(
    private client: SupabaseClient,
    private eventEmitter: DomainEventEmitter,
    private auditLogger: AuditLogger,
    private orders: OrderOrchestrator,
    private dispatch: DispatchEngine,
    private support: SupportExceptionEngine
  ) {}

  async markOrderReady(orderId: string, actor: ActorContext): Promise<OperationResult> {
    const readyResult = await this.orders.markReady(orderId, actor);
    if (!readyResult.success) {
      return readyResult;
    }

    const dispatchResult = await this.dispatch.requestDispatch(orderId, this.getSystemActor());
    if (!dispatchResult.success && dispatchResult.error?.code !== 'ALREADY_EXISTS') {
      await this.support.createException(
        {
          type: 'assignment_timeout',
          severity: 'high',
          orderId,
          title: 'Dispatch Handoff Failed',
          description: dispatchResult.error?.message || 'Dispatch request failed after chef marked order ready.',
          recommendedActions: ['Review dispatch board', 'Retry assignment', 'Manually assign driver'],
          slaMinutes: 15,
        },
        this.getSystemActor()
      );
    }

    return readyResult;
  }

  async completeDeliveredOrder(
    deliveryId: string,
    actor: ActorContext,
    metadata?: { proofUrl?: string; notes?: string }
  ): Promise<OperationResult> {
    const deliveryResult = await this.dispatch.updateDeliveryStatus(deliveryId, 'delivered', actor, metadata);
    if (!deliveryResult.success || !deliveryResult.data) {
      return deliveryResult;
    }

    const completionResult = await this.orders.completeOrder(
      deliveryResult.data.order_id,
      this.getSystemActor()
    );

    if (!completionResult.success) {
      await this.support.createException(
        {
          type: 'system_error',
          severity: 'high',
          orderId: deliveryResult.data.order_id,
          deliveryId,
          title: 'Order Completion Failed After Delivery',
          description: completionResult.error?.message || 'Delivery was marked complete but order finalization failed.',
          recommendedActions: ['Review order state', 'Run ops override if needed', 'Verify payout state'],
          slaMinutes: 15,
        },
        this.getSystemActor()
      );
      return completionResult;
    }

    return deliveryResult;
  }

  async handlePaymentFailure(
    input: PaymentFailureInput,
    actor: ActorContext
  ): Promise<OperationResult> {
    const now = new Date().toISOString();
    const failureMessage = input.message || 'Unknown payment processing error';

    const { data: currentOrder, error: fetchError } = await this.client
      .from('orders')
      .select('id, order_number, engine_status, payment_status')
      .eq('id', input.orderId)
      .single();

    if (fetchError || !currentOrder) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found for payment failure handling' },
      };
    }

    if (currentOrder.engine_status === 'payment_failed') {
      return { success: true, data: currentOrder };
    }

    const { data: updatedOrder, error: updateError } = await this.client
      .from('orders')
      .update({
        payment_status: 'failed',
        engine_status: 'payment_failed',
        status: 'cancelled',
        updated_at: now,
      })
      .eq('id', input.orderId)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: updateError.message },
      };
    }

    await this.client.from('order_status_history').insert({
      order_id: input.orderId,
      previous_status: currentOrder.engine_status,
      new_status: 'payment_failed',
      changed_by: actor.userId,
      notes: failureMessage,
    });

    this.eventEmitter.emit(
      'order.payment_failed' as DomainEventType,
      'order',
      input.orderId,
      {
        paymentIntentId: input.paymentIntentId,
        orderNumber: input.orderNumber || currentOrder.order_number,
        message: failureMessage,
      },
      actor
    );

    await this.support.createException(
      {
        type: 'payment_issue',
        severity: 'high',
        orderId: input.orderId,
        title: 'Payment Failed',
        description: `Payment failed for order ${input.orderNumber || currentOrder.order_number}: ${failureMessage}`,
        recommendedActions: ['Contact customer', 'Offer retry', 'Review payment logs'],
        slaMinutes: 30,
      },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: input.orderId,
      actor,
      previousStatus: currentOrder.engine_status,
      newStatus: 'payment_failed',
      metadata: {
        paymentStatus: 'failed',
        paymentIntentId: input.paymentIntentId,
        message: failureMessage,
      },
    });

    await this.eventEmitter.flush();

    return { success: true, data: updatedOrder };
  }

  async handleExternalRefund(
    input: ExternalRefundInput,
    actor: ActorContext
  ): Promise<OperationResult> {
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select('id, order_number, customer_id, engine_status, payment_status')
      .eq('payment_intent_id', input.paymentIntentId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found for refund sync' },
      };
    }

    const isFullRefund = input.refundedAmountCents >= input.totalAmountCents;
    const nextEngineStatus = isFullRefund ? 'refunded' : 'partially_refunded';
    const nextPaymentStatus = isFullRefund ? 'refunded' : 'partial_refunded';

    const existingRefundLedger = await this.client
      .from('ledger_entries')
      .select('id')
      .eq('order_id', order.id)
      .eq('stripe_id', input.stripeChargeId)
      .eq('entry_type', 'customer_refund')
      .maybeSingle();

    const { data: updatedOrder, error: updateError } = await this.client
      .from('orders')
      .update({
        payment_status: nextPaymentStatus,
        engine_status: nextEngineStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: updateError.message },
      };
    }

    if (!existingRefundLedger.data) {
      await this.client.from('ledger_entries').insert({
        order_id: order.id,
        entry_type: 'customer_refund',
        amount_cents: -input.refundedAmountCents,
        currency: input.currency,
        description: `Refund processed for order ${order.order_number}`,
        stripe_id: input.stripeChargeId,
      });
    }

    this.eventEmitter.emit(
      (isFullRefund ? 'order.refunded' : 'order.partially_refunded') as DomainEventType,
      'order',
      order.id,
      {
        refundedAmount: input.refundedAmountCents / 100,
        totalAmount: input.totalAmountCents / 100,
        isFullRefund,
      },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: order.id,
      actor,
      previousStatus: order.engine_status,
      newStatus: nextEngineStatus,
      metadata: {
        paymentStatus: nextPaymentStatus,
        refundedAmountCents: input.refundedAmountCents,
        totalAmountCents: input.totalAmountCents,
      },
    });

    const { data: customer } = await this.client
      .from('customers')
      .select('user_id')
      .eq('id', order.customer_id)
      .single();

    if (customer?.user_id) {
      await this.client.from('notifications').insert({
        user_id: customer.user_id,
        type: 'refund',
        title: isFullRefund ? 'Refund Processed' : 'Partial Refund Processed',
        message: `A refund of $${(input.refundedAmountCents / 100).toFixed(2)} has been issued to your payment method.`,
        data: { order_id: order.id, refund_amount: input.refundedAmountCents },
      });
    }

    await this.eventEmitter.flush();

    return { success: true, data: updatedOrder };
  }

  private getSystemActor(): ActorContext {
    return {
      userId: 'system',
      role: 'system',
    };
  }
}

export function createPlatformWorkflowEngine(
  client: SupabaseClient,
  eventEmitter: DomainEventEmitter,
  auditLogger: AuditLogger,
  orders: OrderOrchestrator,
  dispatch: DispatchEngine,
  support: SupportExceptionEngine
): PlatformWorkflowEngine {
  return new PlatformWorkflowEngine(client, eventEmitter, auditLogger, orders, dispatch, support);
}
