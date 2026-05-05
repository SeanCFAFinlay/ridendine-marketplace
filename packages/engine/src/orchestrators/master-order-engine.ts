// ==========================================
// MASTER ORDER ENGINE
// Single authority for all order lifecycle transitions.
// No order status may change without going through this engine.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, DomainEventType, OperationResult } from '@ridendine/types';
import { EngineOrderStatus, getAllowedActions } from '@ridendine/types';
import type { AuditLogger } from '../core/audit-logger';
import type { DomainEventEmitter } from '../core/event-emitter';
import {
  assertValidOrderTransition,
  isValidOrderTransition,
  isTerminalOrderStatus,
  ENGINE_TO_LEGACY_ORDER_STATUS,
  InvalidTransitionError,
} from './order-state-machine';
import type { PaymentAdapter } from '../types/payment-adapter';
import { createLedgerService } from '../services/ledger.service';
import { PLATFORM_FEE_PERCENT, DRIVER_PAYOUT_PERCENT } from '../constants';

// ==========================================
// TYPES
// ==========================================

export interface TransitionOrderInput {
  orderId: string;
  action: string;
  targetStatus: EngineOrderStatus;
  actorType: string;
  actorId: string;
  actorRole?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface OrderTransitionResult {
  success: boolean;
  order: {
    id: string;
    engine_status: string;
    status: string;
    previous_engine_status: string;
  };
  error?: string;
}

interface OrderRecord {
  id: string;
  engine_status: string;
  status: string;
  customer_id: string;
  storefront_id: string;
  payment_status?: string;
  payment_intent_id?: string | null;
  [key: string]: unknown;
}

// Actor permission matrix: which actor types can trigger which transitions
const ACTOR_PERMISSION_MATRIX: Record<string, Set<string>> = {
  // Customer actions
  customer: new Set([
    'cancel_order',
    'request_cancel',
  ]),
  // Chef actions
  chef_user: new Set([
    'accept_order',
    'reject_order',
    'start_preparing',
    'mark_ready',
  ]),
  chef_manager: new Set([
    'accept_order',
    'reject_order',
    'start_preparing',
    'mark_ready',
  ]),
  // Driver actions
  driver: new Set([
    'start_pickup_route',
    'confirm_pickup',
    'start_dropoff_route',
    'confirm_delivery',
  ]),
  // Ops actions
  ops_agent: new Set([
    'accept_order',
    'reject_order',
    'start_preparing',
    'mark_ready',
    'cancel_order',
    'complete_order',
    'request_dispatch',
    'assign_driver',
    'ops_override',
    'mark_failed',
    'mark_exception',
    'request_refund',
  ]),
  ops_manager: new Set([
    'accept_order',
    'reject_order',
    'start_preparing',
    'mark_ready',
    'cancel_order',
    'complete_order',
    'request_dispatch',
    'assign_driver',
    'ops_override',
    'mark_failed',
    'mark_exception',
    'request_refund',
    'process_refund',
  ]),
  finance_admin: new Set([
    'process_refund',
  ]),
  super_admin: new Set([
    'accept_order',
    'reject_order',
    'start_preparing',
    'mark_ready',
    'cancel_order',
    'complete_order',
    'request_dispatch',
    'assign_driver',
    'ops_override',
    'mark_failed',
    'mark_exception',
    'request_refund',
    'process_refund',
  ]),
  // System actions
  system: new Set([
    'create_order',
    'authorize_payment',
    'submit_order',
    'request_dispatch',
    'assign_driver',
    'start_pickup_route',
    'confirm_pickup',
    'start_dropoff_route',
    'confirm_delivery',
    'complete_order',
    'mark_failed',
    'mark_exception',
    'cancel_order',
  ]),
};

// Action -> event type mapping
const ACTION_EVENT_MAP: Record<string, string> = {
  create_order: 'order.created',
  authorize_payment: 'order.payment_authorized',
  submit_order: 'order.submitted',
  accept_order: 'order.accepted',
  reject_order: 'order.rejected',
  start_preparing: 'order.prep_started',
  mark_ready: 'order.ready',
  request_dispatch: 'dispatch.requested',
  assign_driver: 'driver.assigned',
  start_pickup_route: 'delivery.en_route_pickup',
  confirm_pickup: 'delivery.picked_up',
  start_dropoff_route: 'delivery.en_route_dropoff',
  confirm_delivery: 'delivery.completed',
  complete_order: 'order.completed',
  request_cancel: 'order.cancel_requested',
  cancel_order: 'order.cancelled',
  request_refund: 'refund.requested',
  process_refund: 'refund.processed',
  mark_failed: 'order.failed',
  mark_exception: 'exception.created',
  ops_override: 'ops.override.executed',
};

// ==========================================
// MASTER ORDER ENGINE
// ==========================================

// Shared order data shape used by legacy-alias methods
interface OrderData {
  id: string;
  order_number: string;
  customer_id: string;
  storefront_id: string;
  status: string;
  engine_status: EngineOrderStatus;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  tip: number;
  total: number;
  payment_status: string;
  payment_intent_id?: string | null;
  estimated_prep_minutes?: number;
  actual_prep_minutes?: number;
  prep_started_at?: string;
  ready_at?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

export class MasterOrderEngine {
  private paymentAdapter?: PaymentAdapter;

  constructor(
    private client: SupabaseClient,
    private audit: AuditLogger,
    private events: DomainEventEmitter,
    paymentAdapter?: PaymentAdapter,
  ) {
    this.paymentAdapter = paymentAdapter;
  }

  // ==========================================
  // CORE TRANSITION METHOD
  // Every order status change MUST go through this method.
  // ==========================================

  async transitionOrder(input: TransitionOrderInput): Promise<OrderTransitionResult> {
    const { orderId, action, targetStatus, actorType, actorId, actorRole, reason, metadata } = input;

    // 1. Load current order
    const { data: order, error: loadError } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (loadError || !order) {
      return {
        success: false,
        order: { id: orderId, engine_status: '', status: '', previous_engine_status: '' },
        error: `Order not found: ${orderId}`,
      };
    }

    const currentEngineStatus = (order as OrderRecord).engine_status || (order as OrderRecord).status;
    const previousEngineStatus = currentEngineStatus;

    // 2. Validate actor permission
    const resolvedRole = actorRole || actorType;
    const allowedActions = ACTOR_PERMISSION_MATRIX[resolvedRole];
    if (!allowedActions || !allowedActions.has(action)) {
      return {
        success: false,
        order: { id: orderId, engine_status: currentEngineStatus, status: (order as OrderRecord).status, previous_engine_status: previousEngineStatus },
        error: `Actor ${resolvedRole} is not permitted to perform action: ${action}`,
      };
    }

    // 3. Validate state machine transition (ops_override bypasses for ops_manager/super_admin)
    if (action !== 'ops_override') {
      if (!isValidOrderTransition(currentEngineStatus, targetStatus)) {
        return {
          success: false,
          order: { id: orderId, engine_status: currentEngineStatus, status: (order as OrderRecord).status, previous_engine_status: previousEngineStatus },
          error: `Invalid order transition: ${currentEngineStatus} -> ${targetStatus}`,
        };
      }
    }

    // 4. Map to legacy status
    const legacyStatus = ENGINE_TO_LEGACY_ORDER_STATUS[targetStatus] || (order as OrderRecord).status;

    // 5. Persist the order update
    const updateData: Record<string, unknown> = {
      engine_status: targetStatus,
      status: legacyStatus,
      updated_at: new Date().toISOString(),
    };

    // Add contextual fields
    if (reason) {
      if (action === 'cancel_order') {
        updateData.cancellation_reason = reason;
        updateData.cancelled_by = actorId;
        updateData.cancelled_at = new Date().toISOString();
      }
      if (action === 'reject_order') {
        updateData.rejection_reason = reason;
      }
    }
    if (metadata) {
      if (metadata.rejection_notes) updateData.rejection_notes = metadata.rejection_notes;
      if (metadata.cancellation_notes) updateData.cancellation_notes = metadata.cancellation_notes;
      if (metadata.estimated_prep_minutes) updateData.estimated_prep_minutes = metadata.estimated_prep_minutes;
      if (metadata.actual_prep_minutes) updateData.actual_prep_minutes = metadata.actual_prep_minutes;
      if (metadata.prep_started_at) updateData.prep_started_at = metadata.prep_started_at;
      if (metadata.ready_at) updateData.ready_at = metadata.ready_at;
      if (metadata.completed_at) updateData.completed_at = metadata.completed_at;
      if (metadata.payment_status) updateData.payment_status = metadata.payment_status;
      if (metadata.payment_intent_id) updateData.payment_intent_id = metadata.payment_intent_id;
    }

    const { error: updateError } = await this.client
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) {
      return {
        success: false,
        order: { id: orderId, engine_status: currentEngineStatus, status: (order as OrderRecord).status, previous_engine_status: previousEngineStatus },
        error: `Failed to update order: ${updateError.message}`,
      };
    }

    // 6. Insert order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousEngineStatus,
      new_status: targetStatus,
      status: targetStatus,
      notes: reason || `${action} by ${actorType}`,
      changed_by: actorId,
    }).then(() => {/* ignore insert errors for history - non-critical */});

    // 7. Insert audit log
    await this.audit.log({
      action: 'status_change',
      entityType: 'order',
      entityId: orderId,
      actor: {
        userId: actorId,
        role: resolvedRole as ActorContext['role'],
      },
      beforeState: { engine_status: previousEngineStatus, status: (order as OrderRecord).status },
      afterState: { engine_status: targetStatus, status: legacyStatus },
      reason: reason || action,
      metadata: { ...metadata, action },
    });

    // 8. Emit event
    const eventType = ACTION_EVENT_MAP[action] || `order.${action}`;
    this.events.emit(
      eventType as DomainEventType,
      'order',
      orderId,
      {
        orderId,
        previousStatus: previousEngineStatus,
        nextStatus: targetStatus,
        action,
        actorType,
        actorId,
        reason,
        ...metadata,
      },
      {
        userId: actorId,
        role: resolvedRole as ActorContext['role'],
      },
    );

    // 9. Return canonical result
    return {
      success: true,
      order: {
        id: orderId,
        engine_status: targetStatus,
        status: legacyStatus,
        previous_engine_status: previousEngineStatus,
      },
    };
  }

  // ==========================================
  // CONVENIENCE METHODS
  // Each calls transitionOrder with the correct parameters.
  // ==========================================

  async chefAccept(input: { orderId: string; actorId: string; actorRole?: string; estimatedPrepMinutes?: number }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'accept_order',
      targetStatus: EngineOrderStatus.ACCEPTED,
      actorType: 'chef',
      actorId: input.actorId,
      actorRole: input.actorRole || 'chef_user',
      metadata: input.estimatedPrepMinutes ? { estimated_prep_minutes: input.estimatedPrepMinutes } : undefined,
    });
  }

  async chefReject(input: { orderId: string; actorId: string; actorRole?: string; reason: string; notes?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'reject_order',
      targetStatus: EngineOrderStatus.REJECTED,
      actorType: 'chef',
      actorId: input.actorId,
      actorRole: input.actorRole || 'chef_user',
      reason: input.reason,
      metadata: input.notes ? { rejection_notes: input.notes } : undefined,
    });
  }

  async markPreparing(input: { orderId: string; actorId: string; actorRole?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'start_preparing',
      targetStatus: EngineOrderStatus.PREPARING,
      actorType: 'chef',
      actorId: input.actorId,
      actorRole: input.actorRole || 'chef_user',
      metadata: { prep_started_at: new Date().toISOString() },
    });
  }

  async markReadyForPickup(input: { orderId: string; actorId: string; actorRole?: string; actualPrepMinutes?: number }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'mark_ready',
      targetStatus: EngineOrderStatus.READY,
      actorType: 'chef',
      actorId: input.actorId,
      actorRole: input.actorRole || 'chef_user',
      metadata: {
        ready_at: new Date().toISOString(),
        ...(input.actualPrepMinutes ? { actual_prep_minutes: input.actualPrepMinutes } : {}),
      },
    });
  }

  async requestDriverAssignment(input: { orderId: string; actorId: string; actorRole?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'request_dispatch',
      targetStatus: EngineOrderStatus.DISPATCH_PENDING,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: input.actorRole || 'system',
    });
  }

  async markDriverOffered(input: { orderId: string; actorId: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'assign_driver',
      targetStatus: EngineOrderStatus.DRIVER_OFFERED,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: 'system',
    });
  }

  async markDriverAssigned(input: { orderId: string; actorId: string; driverId?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'assign_driver',
      targetStatus: EngineOrderStatus.DRIVER_ASSIGNED,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: 'system',
      metadata: input.driverId ? { driver_id: input.driverId } : undefined,
    });
  }

  async markPickedUp(input: { orderId: string; actorId: string; actorRole?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'confirm_pickup',
      targetStatus: EngineOrderStatus.PICKED_UP,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: input.actorRole || 'driver',
    });
  }

  async markDelivered(input: { orderId: string; actorId: string; actorRole?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'confirm_delivery',
      targetStatus: EngineOrderStatus.DELIVERED,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: input.actorRole || 'driver',
    });
  }

  async completeOrder(input: { orderId: string; actorId: string; actorRole?: string }) {
    const result = await this.transitionOrder({
      orderId: input.orderId,
      action: 'complete_order',
      targetStatus: EngineOrderStatus.COMPLETED,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: input.actorRole || 'system',
      metadata: { completed_at: new Date().toISOString() },
    });

    if (!result.success) return result;

    const { data: orderRow } = await this.client
      .from('orders')
      .select('*')
      .eq('id', input.orderId)
      .single();

    if (!orderRow) return result;

    const order = orderRow as OrderData;
    const { data: deliveryRow } = await this.client
      .from('deliveries')
      .select('driver_id')
      .eq('order_id', input.orderId)
      .maybeSingle();
    const driverId = (deliveryRow?.driver_id as string | null) ?? null;

    const ledger = createLedgerService(this.client);

    const captureResult = await ledger.recordCustomerCapture({
      orderId: input.orderId,
      orderNumber: order.order_number,
      totalCents: Math.round(order.total * 100),
      taxCents: Math.round(order.tax * 100),
      currency: 'CAD',
      stripePaymentIntentId: order.payment_intent_id ?? null,
    });
    if (captureResult.errors.length > 0) {
      console.error('[completeOrder] ledger capture', captureResult.errors);
    }

    const payResult = await ledger.recordOrderPayment({
      orderId: input.orderId,
      storefrontId: order.storefront_id,
      driverId,
      subtotalCents: Math.round(order.subtotal * 100),
      deliveryFeeCents: Math.round(order.delivery_fee * 100),
      currency: 'CAD',
    });
    if (payResult.errors.length > 0) {
      console.error('[completeOrder] ledger payables', payResult.errors);
    }

    if (order.tip > 0) {
      const tipRes = await ledger.recordTipPayable({
        orderId: input.orderId,
        driverId,
        tipCents: Math.round(order.tip * 100),
        currency: 'CAD',
      });
      if (tipRes.error) console.error('[completeOrder] ledger tip', tipRes.error);
    }

    return result;
  }

  async cancelOrder(input: {
    orderId: string;
    actorId: string;
    actorType: string;
    actorRole?: string;
    reason: string;
    notes?: string;
    actor?: ActorContext;
  }) {
    const result = await this.transitionOrder({
      orderId: input.orderId,
      action: 'cancel_order',
      targetStatus: EngineOrderStatus.CANCELLED,
      actorType: input.actorType,
      actorId: input.actorId,
      actorRole: input.actorRole || input.actorType,
      reason: input.reason,
      metadata: input.notes ? { cancellation_notes: input.notes } : undefined,
    });

    if (!result.success) return result;

    // FND-017: void payment intent if present and in processing state
    const { data: orderRow } = await this.client
      .from('orders')
      .select('payment_intent_id, payment_status, total, order_number')
      .eq('id', input.orderId)
      .single();

    const actor: ActorContext = input.actor ?? {
      userId: input.actorId,
      role: (input.actorRole || input.actorType) as ActorContext['role'],
    };

    if (orderRow?.payment_intent_id && orderRow.payment_status === 'processing') {
      await this.voidPaymentIntent({
        orderId: input.orderId,
        orderNumber: orderRow.order_number as string,
        orderTotal: orderRow.total as number,
        paymentIntentId: orderRow.payment_intent_id as string,
        reason: input.reason,
        context: 'cancellation',
        actor,
      });
    }

    return result;
  }

  async refundOrder(input: { orderId: string; actorId: string; actorRole?: string; reason?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'process_refund',
      targetStatus: EngineOrderStatus.REFUNDED,
      actorType: 'ops',
      actorId: input.actorId,
      actorRole: input.actorRole || 'ops_manager',
      reason: input.reason,
      metadata: { payment_status: 'refunded' },
    });
  }

  async authorizePayment(input: { orderId: string; actorId: string; paymentIntentId?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'authorize_payment',
      targetStatus: EngineOrderStatus.PAYMENT_AUTHORIZED,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: 'system',
      metadata: {
        payment_status: 'processing',
        ...(input.paymentIntentId ? { payment_intent_id: input.paymentIntentId } : {}),
      },
    });
  }

  async submitToChef(input: { orderId: string; actorId: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'submit_order',
      targetStatus: EngineOrderStatus.PENDING,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: 'system',
    });
  }

  async createOrderFromCart(input: { orderId: string; actorId: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'create_order',
      targetStatus: EngineOrderStatus.CHECKOUT_PENDING,
      actorType: 'customer',
      actorId: input.actorId,
      actorRole: 'system',
    });
  }

  // Sync order status when delivery changes (called by DeliveryEngine)
  async syncFromDelivery(input: { orderId: string; actorId: string; deliveryAction: string; targetOrderStatus: EngineOrderStatus }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: input.deliveryAction,
      targetStatus: input.targetOrderStatus,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: 'system',
    });
  }

  // ==========================================
  // LEGACY-NAME ALIASES
  // One-liners so app callsites keep working without changes.
  // ==========================================

  /** Legacy alias: delegates to chefAccept */
  async acceptOrder(
    orderId: string,
    estimatedPrepMinutes: number,
    actor: ActorContext,
  ): Promise<OperationResult<{ id: string; engine_status: string; status: string; previous_engine_status: string }>> {
    const result = await this.chefAccept({
      orderId,
      actorId: actor.userId,
      actorRole: actor.role,
      estimatedPrepMinutes,
    });
    if (!result.success) {
      return { success: false, error: { code: 'TRANSITION_FAILED', message: result.error ?? 'Accept failed' } };
    }
    return { success: true, data: result.order };
  }

  /** Legacy alias: delegates to chefReject + FND-017 void logic */
  async rejectOrder(
    orderId: string,
    reason: string,
    notes: string | undefined,
    actor: ActorContext,
  ): Promise<OperationResult<{ id: string; engine_status: string; status: string; previous_engine_status: string }>> {
    const result = await this.chefReject({
      orderId,
      actorId: actor.userId,
      actorRole: actor.role,
      reason,
      notes,
    });

    if (!result.success) {
      return { success: false, error: { code: 'TRANSITION_FAILED', message: result.error ?? 'Reject failed' } };
    }

    // FND-017: void payment intent if present
    const { data: orderRow } = await this.client
      .from('orders')
      .select('payment_intent_id, payment_status, total, order_number')
      .eq('id', orderId)
      .single();

    if (orderRow?.payment_intent_id) {
      await this.voidPaymentIntent({
        orderId,
        orderNumber: orderRow.order_number as string,
        orderTotal: orderRow.total as number,
        paymentIntentId: orderRow.payment_intent_id as string,
        reason,
        context: 'rejection',
        actor,
      });
    }

    return { success: true, data: result.order };
  }

  /** Legacy alias: delegates to markPreparing */
  async startPreparing(
    orderId: string,
    actor: ActorContext,
  ): Promise<OperationResult<{ id: string; engine_status: string; status: string; previous_engine_status: string }>> {
    const result = await this.markPreparing({
      orderId,
      actorId: actor.userId,
      actorRole: actor.role,
    });
    if (!result.success) {
      return { success: false, error: { code: 'TRANSITION_FAILED', message: result.error ?? 'Start preparing failed' } };
    }
    return { success: true, data: result.order };
  }

  /** Get allowed actions for a given order state and actor role */
  async getAllowedActions(orderId: string, actorRole: string): Promise<string[]> {
    const { data, error } = await this.client
      .from('orders')
      .select('engine_status')
      .eq('id', orderId)
      .single();

    if (error || !data) return [];

    const actions = getAllowedActions(
      (data as { engine_status: EngineOrderStatus }).engine_status,
      actorRole as ActorContext['role'],
    );

    return actions.map((a) => a.action);
  }

  /** Ops force status change that bypasses state machine validation */
  async opsOverride(
    orderId: string,
    targetStatus: EngineOrderStatus,
    reason: string,
    actor: ActorContext,
  ): Promise<OperationResult<OrderData>> {
    if (!['ops_admin', 'ops_manager', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only ops managers can perform overrides' },
      };
    }

    const { data: orderRow, error: loadError } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (loadError || !orderRow) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } };
    }

    const order = orderRow as OrderData;
    const previousStatus = order.engine_status;
    const now = new Date().toISOString();

    await this.audit.logOverride({
      action: 'force_status_change',
      entityType: 'order',
      entityId: orderId,
      actor,
      beforeState: { status: previousStatus },
      afterState: { status: targetStatus },
      reason,
    });

    const legacyStatus = ENGINE_TO_LEGACY_ORDER_STATUS[targetStatus] || order.status;

    const { data: updated, error: updateError } = await this.client
      .from('orders')
      .update({ status: legacyStatus, engine_status: targetStatus, updated_at: now })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: { code: 'UPDATE_FAILED', message: updateError.message } };
    }

    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: targetStatus,
      changed_by: actor.userId,
      notes: `OPS OVERRIDE: ${reason}`,
    });

    this.events.emit(
      'ops.override.executed' as DomainEventType,
      'order',
      orderId,
      { previousStatus, newStatus: targetStatus, reason },
      actor,
    );

    await this.events.flush();

    return { success: true, data: updated as OrderData };
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  /** FND-017: attempt Stripe void then write ledger entry + optional exception */
  private async voidPaymentIntent(params: {
    orderId: string;
    orderNumber: string;
    orderTotal: number;
    paymentIntentId: string;
    reason: string;
    context: 'rejection' | 'cancellation';
    actor: ActorContext;
  }): Promise<void> {
    let stripeVoidSucceeded = false;
    let stripeStatus = 'unknown';

    if (this.paymentAdapter) {
      try {
        const result = await this.paymentAdapter.cancelPaymentIntent(params.paymentIntentId);
        stripeVoidSucceeded = result.cancelled;
        stripeStatus = result.status;
      } catch (err) {
        stripeStatus = 'stripe_error';
        await this.audit.log({
          action: 'override',
          entityType: 'order',
          entityId: params.orderId,
          actor: params.actor,
          metadata: {
            warning: 'stripe_void_failed',
            paymentIntentId: params.paymentIntentId,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    await this.client.from('ledger_entries').insert({
      order_id: params.orderId,
      entry_type: stripeVoidSucceeded ? 'customer_charge_void' : 'customer_charge_void_pending',
      amount_cents: -Math.round(params.orderTotal * 100),
      currency: 'CAD',
      description: `Payment void ${stripeVoidSucceeded ? 'completed' : 'pending'} due to ${params.context}: ${params.reason} (stripe: ${stripeStatus})`,
      stripe_id: params.paymentIntentId,
      metadata: { stripeStatus, voidAttempted: !!this.paymentAdapter },
    });

    if (!stripeVoidSucceeded && this.paymentAdapter) {
      await this.client.from('order_exceptions').insert({
        exception_type: 'payment_void_failed',
        severity: 'high',
        status: 'open',
        order_id: params.orderId,
        title: `Payment Void Failed on ${params.context === 'rejection' ? 'Rejection' : 'Cancellation'}`,
        description: `Failed to void Stripe PaymentIntent ${params.paymentIntentId} for ${params.context === 'rejection' ? 'rejected' : 'cancelled'} order ${params.orderNumber}. Status: ${stripeStatus}`,
        recommended_actions: ['Check Stripe dashboard', 'Manual void or refund may be required'],
      });
    }
  }
}

// Factory function
export function createMasterOrderEngine(
  client: SupabaseClient,
  audit: AuditLogger,
  events: DomainEventEmitter,
  paymentAdapter?: PaymentAdapter,
): MasterOrderEngine {
  return new MasterOrderEngine(client, audit, events, paymentAdapter);
}
