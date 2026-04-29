// ==========================================
// MASTER ORDER ENGINE
// Single authority for all order lifecycle transitions.
// No order status may change without going through this engine.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, DomainEventType } from '@ridendine/types';
import { EngineOrderStatus } from '@ridendine/types';
import type { AuditLogger } from '../core/audit-logger';
import type { DomainEventEmitter } from '../core/event-emitter';
import {
  assertValidOrderTransition,
  isValidOrderTransition,
  isTerminalOrderStatus,
  ENGINE_TO_LEGACY_ORDER_STATUS,
  InvalidTransitionError,
} from './order-state-machine';

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

export class MasterOrderEngine {
  constructor(
    private client: SupabaseClient,
    private audit: AuditLogger,
    private events: DomainEventEmitter,
  ) {}

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
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'complete_order',
      targetStatus: EngineOrderStatus.COMPLETED,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: input.actorRole || 'system',
      metadata: { completed_at: new Date().toISOString() },
    });
  }

  async cancelOrder(input: { orderId: string; actorId: string; actorType: string; actorRole?: string; reason: string; notes?: string }) {
    return this.transitionOrder({
      orderId: input.orderId,
      action: 'cancel_order',
      targetStatus: EngineOrderStatus.CANCELLED,
      actorType: input.actorType,
      actorId: input.actorId,
      actorRole: input.actorRole || input.actorType,
      reason: input.reason,
      metadata: input.notes ? { cancellation_notes: input.notes } : undefined,
    });
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
}

// Factory function
export function createMasterOrderEngine(
  client: SupabaseClient,
  audit: AuditLogger,
  events: DomainEventEmitter,
): MasterOrderEngine {
  return new MasterOrderEngine(client, audit, events);
}
