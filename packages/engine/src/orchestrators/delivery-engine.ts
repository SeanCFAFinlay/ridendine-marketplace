// ==========================================
// DELIVERY ENGINE
// Single authority for all delivery lifecycle transitions.
// No delivery status may change without going through this engine.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, DomainEventType, SLAType } from '@ridendine/types';
import { EngineOrderStatus, EngineDeliveryStatus } from '@ridendine/types';
import type { AuditLogger } from '../core/audit-logger';
import type { DomainEventEmitter } from '../core/event-emitter';
import type { SLAManager } from '../core/sla-manager';
import type { MasterOrderEngine } from './master-order-engine';
import type { EtaService } from '@ridendine/routing';
import {
  assertValidDeliveryTransition,
  isValidDeliveryTransition,
  isTerminalDeliveryStatus,
  ENGINE_TO_LEGACY_DELIVERY_STATUS,
  InvalidTransitionError,
} from './order-state-machine';

// ==========================================
// TYPES
// ==========================================

export interface TransitionDeliveryInput {
  deliveryId: string;
  action: string;
  targetStatus: EngineDeliveryStatus;
  actorType: string;
  actorId: string;
  actorRole?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryTransitionResult {
  success: boolean;
  delivery: {
    id: string;
    status: string;
    previous_status: string;
    order_id: string;
  };
  error?: string;
}

// Actor permission matrix for delivery actions
const DELIVERY_ACTOR_PERMISSIONS: Record<string, Set<string>> = {
  driver: new Set([
    'accept_delivery',
    'reject_delivery',
    'mark_en_route_to_pickup',
    'mark_arrived_at_pickup',
    'mark_picked_up',
    'mark_en_route_to_customer',
    'mark_arrived_at_customer',
    'mark_delivered',
  ]),
  ops_agent: new Set([
    'offer_delivery',
    'accept_delivery',
    'reject_delivery',
    'mark_en_route_to_pickup',
    'mark_arrived_at_pickup',
    'mark_picked_up',
    'mark_en_route_to_customer',
    'mark_arrived_at_customer',
    'mark_delivered',
    'fail_delivery',
    'cancel_delivery',
  ]),
  ops_manager: new Set([
    'offer_delivery',
    'accept_delivery',
    'reject_delivery',
    'mark_en_route_to_pickup',
    'mark_arrived_at_pickup',
    'mark_picked_up',
    'mark_en_route_to_customer',
    'mark_arrived_at_customer',
    'mark_delivered',
    'fail_delivery',
    'cancel_delivery',
  ]),
  super_admin: new Set([
    'offer_delivery',
    'accept_delivery',
    'reject_delivery',
    'mark_en_route_to_pickup',
    'mark_arrived_at_pickup',
    'mark_picked_up',
    'mark_en_route_to_customer',
    'mark_arrived_at_customer',
    'mark_delivered',
    'fail_delivery',
    'cancel_delivery',
  ]),
  system: new Set([
    'offer_delivery',
    'accept_delivery',
    'reject_delivery',
    'mark_en_route_to_pickup',
    'mark_arrived_at_pickup',
    'mark_picked_up',
    'mark_en_route_to_customer',
    'mark_arrived_at_customer',
    'mark_delivered',
    'fail_delivery',
    'cancel_delivery',
  ]),
};

// Action -> event mapping
const DELIVERY_ACTION_EVENT_MAP: Record<string, string> = {
  offer_delivery: 'delivery.offered',
  accept_delivery: 'delivery.accepted',
  reject_delivery: 'delivery.rejected',
  mark_en_route_to_pickup: 'delivery.en_route_pickup',
  mark_arrived_at_pickup: 'delivery.arrived_pickup',
  mark_picked_up: 'delivery.picked_up',
  mark_en_route_to_customer: 'delivery.en_route_dropoff',
  mark_arrived_at_customer: 'delivery.arrived_dropoff',
  mark_delivered: 'delivery.completed',
  fail_delivery: 'delivery.failed',
  cancel_delivery: 'delivery.cancelled',
};

// Delivery status -> order status sync map (when delivery changes, order may change too)
const DELIVERY_TO_ORDER_SYNC: Partial<Record<string, EngineOrderStatus>> = {
  [EngineDeliveryStatus.EN_ROUTE_TO_PICKUP]: EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP,
  [EngineDeliveryStatus.PICKED_UP]: EngineOrderStatus.PICKED_UP,
  [EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER]: EngineOrderStatus.DRIVER_EN_ROUTE_CUSTOMER,
  [EngineDeliveryStatus.DELIVERED]: EngineOrderStatus.DELIVERED,
};

// ==========================================
// DELIVERY ENGINE
// ==========================================

export class DeliveryEngine {
  constructor(
    private client: SupabaseClient,
    private audit: AuditLogger,
    private events: DomainEventEmitter,
    private masterOrderEngine: MasterOrderEngine,
    private sla?: SLAManager,
    private eta?: EtaService
  ) {}

  // ==========================================
  // CORE TRANSITION METHOD
  // ==========================================

  async transitionDelivery(input: TransitionDeliveryInput): Promise<DeliveryTransitionResult> {
    const { deliveryId, action, targetStatus, actorType, actorId, actorRole, reason, metadata } = input;

    // 1. Load delivery
    const { data: delivery, error: loadError } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (loadError || !delivery) {
      return {
        success: false,
        delivery: { id: deliveryId, status: '', previous_status: '', order_id: '' },
        error: `Delivery not found: ${deliveryId}`,
      };
    }

    const currentStatus = delivery.status as string;
    const previousStatus = currentStatus;
    const orderId = delivery.order_id as string;

    // 2. Validate actor permission
    const resolvedRole = actorRole || actorType;
    const allowedActions = DELIVERY_ACTOR_PERMISSIONS[resolvedRole];
    if (!allowedActions || !allowedActions.has(action)) {
      return {
        success: false,
        delivery: { id: deliveryId, status: currentStatus, previous_status: previousStatus, order_id: orderId },
        error: `Actor ${resolvedRole} is not permitted to perform delivery action: ${action}`,
      };
    }

    // 3. Validate delivery transition
    // Map current legacy status to engine status for validation
    const engineCurrentStatus = this.mapLegacyToEngine(currentStatus);
    if (!isValidDeliveryTransition(engineCurrentStatus, targetStatus)) {
      return {
        success: false,
        delivery: { id: deliveryId, status: currentStatus, previous_status: previousStatus, order_id: orderId },
        error: `Invalid delivery transition: ${engineCurrentStatus} -> ${targetStatus}`,
      };
    }

    // 4. Map to legacy status for DB
    const legacyStatus = ENGINE_TO_LEGACY_DELIVERY_STATUS[targetStatus] || currentStatus;

    // 5. Update delivery through DB
    const updateData: Record<string, unknown> = {
      status: legacyStatus,
      updated_at: new Date().toISOString(),
    };

    // Add contextual fields
    if (targetStatus === EngineDeliveryStatus.ACCEPTED && metadata?.driver_id) {
      updateData.driver_id = metadata.driver_id;
    }
    if (targetStatus === EngineDeliveryStatus.PICKED_UP) {
      updateData.actual_pickup_at = new Date().toISOString();
    }
    if (targetStatus === EngineDeliveryStatus.DELIVERED) {
      updateData.actual_dropoff_at = new Date().toISOString();
    }

    const { error: updateError } = await this.client
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId);

    if (updateError) {
      return {
        success: false,
        delivery: { id: deliveryId, status: currentStatus, previous_status: previousStatus, order_id: orderId },
        error: `Failed to update delivery: ${updateError.message}`,
      };
    }

    // 6. Insert delivery event
    await this.client.from('delivery_events').insert({
      delivery_id: deliveryId,
      event_type: action,
      event_data: { previous_status: previousStatus, new_status: targetStatus, ...metadata },
      actor_type: actorType,
      actor_id: actorId,
    }).then(() => {/* non-critical */});

    // 7. Insert audit log
    await this.audit.log({
      action: 'status_change',
      entityType: 'delivery',
      entityId: deliveryId,
      actor: {
        userId: actorId,
        role: resolvedRole as ActorContext['role'],
      },
      beforeState: { status: previousStatus },
      afterState: { status: targetStatus },
      reason: reason || action,
      metadata: { ...metadata, action, order_id: orderId },
    });

    // 8. Emit event
    const eventType = DELIVERY_ACTION_EVENT_MAP[action] || `delivery.${action}`;
    this.events.emit(
      eventType as DomainEventType,
      'delivery',
      deliveryId,
      {
        deliveryId,
        orderId,
        previousStatus,
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

    // 5b. Sync linked order status where appropriate
    const orderTargetStatus = DELIVERY_TO_ORDER_SYNC[targetStatus];
    if (orderTargetStatus && orderId) {
      await this.masterOrderEngine.syncFromDelivery({
        orderId,
        actorId,
        deliveryAction: action,
        targetOrderStatus: orderTargetStatus,
      });
    }

    // 9. Return canonical delivery
    return {
      success: true,
      delivery: {
        id: deliveryId,
        status: targetStatus,
        previous_status: previousStatus,
        order_id: orderId,
      },
    };
  }

  // ==========================================
  // CONVENIENCE METHODS
  // ==========================================

  async offerDeliveryToDriver(input: { deliveryId: string; actorId: string; driverId: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'offer_delivery',
      targetStatus: EngineDeliveryStatus.OFFERED,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: 'system',
      metadata: { driver_id: input.driverId },
    });
  }

  async driverAcceptDelivery(input: { deliveryId: string; actorId: string; driverId: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'accept_delivery',
      targetStatus: EngineDeliveryStatus.ACCEPTED,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: 'driver',
      metadata: { driver_id: input.driverId },
    });
  }

  async driverRejectDelivery(input: { deliveryId: string; actorId: string; reason?: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'reject_delivery',
      targetStatus: EngineDeliveryStatus.UNASSIGNED,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: 'driver',
      reason: input.reason,
    });
  }

  async markEnRouteToPickup(input: { deliveryId: string; actorId: string; actorRole?: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'mark_en_route_to_pickup',
      targetStatus: EngineDeliveryStatus.EN_ROUTE_TO_PICKUP,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: input.actorRole || 'driver',
    });
  }

  async markArrivedAtPickup(input: { deliveryId: string; actorId: string; actorRole?: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'mark_arrived_at_pickup',
      targetStatus: EngineDeliveryStatus.ARRIVED_AT_PICKUP,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: input.actorRole || 'driver',
    });
  }

  async markPickedUp(input: { deliveryId: string; actorId: string; actorRole?: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'mark_picked_up',
      targetStatus: EngineDeliveryStatus.PICKED_UP,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: input.actorRole || 'driver',
    });
  }

  async markEnRouteToCustomer(input: { deliveryId: string; actorId: string; actorRole?: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'mark_en_route_to_customer',
      targetStatus: EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: input.actorRole || 'driver',
    });
  }

  async markArrivedAtCustomer(input: { deliveryId: string; actorId: string; actorRole?: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'mark_arrived_at_customer',
      targetStatus: EngineDeliveryStatus.ARRIVED_AT_CUSTOMER,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: input.actorRole || 'driver',
    });
  }

  async markDelivered(input: { deliveryId: string; actorId: string; actorRole?: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'mark_delivered',
      targetStatus: EngineDeliveryStatus.DELIVERED,
      actorType: 'driver',
      actorId: input.actorId,
      actorRole: input.actorRole || 'driver',
    });
  }

  async failDelivery(input: { deliveryId: string; actorId: string; actorRole?: string; reason: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'fail_delivery',
      targetStatus: EngineDeliveryStatus.FAILED,
      actorType: 'system',
      actorId: input.actorId,
      actorRole: input.actorRole || 'system',
      reason: input.reason,
    });
  }

  async cancelDelivery(input: { deliveryId: string; actorId: string; actorRole?: string; reason: string }) {
    return this.transitionDelivery({
      deliveryId: input.deliveryId,
      action: 'cancel_delivery',
      targetStatus: EngineDeliveryStatus.CANCELLED,
      actorType: 'ops',
      actorId: input.actorId,
      actorRole: input.actorRole || 'ops_agent',
      reason: input.reason,
    });
  }

  // ==========================================
  // UPDATE DELIVERY STATUS (canonical home for delivery_events writes)
  // ==========================================

  /**
   * Write delivery status, insert delivery_events (FND-004: event_data: key preserved verbatim),
   * sync orders.engine_status via MasterOrderEngine, complete SLAs, recompute ETA,
   * release driver on delivered, emit events.
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    actor: ActorContext,
    metadata?: { proofUrl?: string; notes?: string }
  ): Promise<{ success: boolean; data?: { id: string; status: string }; error?: { code: string; message: string } }> {
    const { data: delivery, error: deliveryError } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Delivery not found' } };
    }

    if (actor.role === 'driver') {
      const { data: driver } = await this.client
        .from('drivers')
        .select('id')
        .eq('user_id', actor.userId)
        .single();
      if (!driver || driver.id !== delivery.driver_id) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'This delivery is not assigned to you' } };
      }
    }

    try {
      const currentEngine = this.mapDeliveryStatusForValidation(delivery.status as string);
      const targetEngine = this.mapDeliveryStatusForValidation(status);
      assertValidDeliveryTransition(currentEngine, targetEngine);
    } catch {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: `Cannot transition delivery from ${delivery.status} to ${status}` },
      };
    }

    const now = new Date().toISOString();
    const previousStatus = delivery.status as string;

    const updateData: Record<string, unknown> = { status, updated_at: now };

    if (status === 'picked_up') {
      updateData.actual_pickup_time = now;
      if (metadata?.proofUrl) updateData.pickup_proof_url = metadata.proofUrl;
      if (this.sla) {
        await this.sla.startTimer({
          type: 'driver_delivery' as SLAType,
          entityType: 'delivery',
          entityId: deliveryId,
          customDurationMinutes: (delivery.estimated_duration_minutes as number | undefined) || 30,
        });
      }
    }

    if (status === 'delivered') {
      updateData.actual_dropoff_time = now;
      if (metadata?.proofUrl) updateData.dropoff_proof_url = metadata.proofUrl;
      if (this.sla) {
        await this.sla.completeTimer('delivery', deliveryId, 'driver_delivery' as SLAType);
      }
    }

    if (metadata?.notes) updateData.delivery_notes = metadata.notes;

    const { data: updated, error } = await this.client
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
    }

    if (status === 'picked_up' && this.eta) {
      try { await this.eta.computeDropLegOnPickup(deliveryId); } catch { /* optional */ }
    }

    // Sync order engine_status
    const orderStatusMap: Record<string, string> = {
      en_route_to_pickup: 'driver_en_route_pickup',
      picked_up: 'picked_up',
      en_route_to_dropoff: 'driver_en_route_dropoff',
      delivered: 'delivered',
    };

    if (orderStatusMap[status]) {
      await this.client
        .from('orders')
        .update({
          engine_status: orderStatusMap[status],
          status: status === 'delivered' ? 'delivered' : delivery.status,
          updated_at: now,
        })
        .eq('id', delivery.order_id as string);
    }

    // FND-004: event_data: key — preserved verbatim
    await this.client.from('delivery_events').insert({
      delivery_id: deliveryId,
      event_type: `status_${status}`,
      event_data: { previousStatus, newStatus: status, ...metadata },
      actor_type: actor.role === 'driver' ? 'driver' : actor.role === 'system' ? 'system' : 'ops',
      actor_id: actor.userId !== 'system' ? actor.userId : undefined,
    });

    const eventType = `delivery.${status.replace(/_/g, '_')}` as DomainEventType;
    this.events.emit(eventType, 'delivery', deliveryId, { previousStatus, newStatus: status }, actor);

    await this.audit.logStatusChange({
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      previousStatus,
      newStatus: status,
      metadata,
    });

    await this.events.flush();

    if (status === 'delivered') {
      await this.client
        .from('driver_presence')
        .update({ status: 'online', updated_at: new Date().toISOString() })
        .eq('driver_id', delivery.driver_id as string);
    }

    return { success: true, data: updated as { id: string; status: string } };
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private mapLegacyToEngine(legacyStatus: string): string {
    const map: Record<string, string> = {
      pending: EngineDeliveryStatus.UNASSIGNED,
      assigned: EngineDeliveryStatus.ACCEPTED,
      accepted: EngineDeliveryStatus.ACCEPTED,
      en_route_to_pickup: EngineDeliveryStatus.EN_ROUTE_TO_PICKUP,
      arrived_at_pickup: EngineDeliveryStatus.ARRIVED_AT_PICKUP,
      picked_up: EngineDeliveryStatus.PICKED_UP,
      en_route_to_dropoff: EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER,
      arrived_at_dropoff: EngineDeliveryStatus.ARRIVED_AT_CUSTOMER,
      delivered: EngineDeliveryStatus.DELIVERED,
      completed: EngineDeliveryStatus.DELIVERED,
      failed: EngineDeliveryStatus.FAILED,
      cancelled: EngineDeliveryStatus.CANCELLED,
      // Engine statuses map to themselves
      unassigned: EngineDeliveryStatus.UNASSIGNED,
      offered: EngineDeliveryStatus.OFFERED,
      en_route_to_customer: EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER,
      arrived_at_customer: EngineDeliveryStatus.ARRIVED_AT_CUSTOMER,
    };
    return map[legacyStatus] || legacyStatus;
  }

  private mapDeliveryStatusForValidation(legacyStatus: string): string {
    const map: Record<string, string> = {
      pending: 'unassigned',
      assigned: 'accepted',
      accepted: 'accepted',
      en_route_to_pickup: 'en_route_to_pickup',
      arrived_at_pickup: 'arrived_at_pickup',
      picked_up: 'picked_up',
      en_route_to_dropoff: 'en_route_to_customer',
      en_route_to_customer: 'en_route_to_customer',
      arrived_at_dropoff: 'arrived_at_customer',
      arrived_at_customer: 'arrived_at_customer',
      delivered: 'delivered',
      failed: 'failed',
      cancelled: 'cancelled',
    };
    return map[legacyStatus] || legacyStatus;
  }
}

// Factory function
export function createDeliveryEngine(
  client: SupabaseClient,
  audit: AuditLogger,
  events: DomainEventEmitter,
  masterOrderEngine: MasterOrderEngine,
  sla?: SLAManager,
  eta?: EtaService
): DeliveryEngine {
  return new DeliveryEngine(client, audit, events, masterOrderEngine, sla, eta);
}
