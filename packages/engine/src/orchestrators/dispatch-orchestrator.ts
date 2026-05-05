// ==========================================
// DISPATCH ORCHESTRATOR
// Thin coordinator: creates deliveries, triggers offers, handles (re)assignment.
// Delegates offer lifecycle to OfferManagementService.
// Delegates status writes to DeliveryEngine (MasterDeliveryEngine).
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EtaService } from '@ridendine/routing';
import type { ActorContext, AssignmentAttempt, DomainEventType, OperationResult, SLAType } from '@ridendine/types';
import { getPlatformSettings } from '@ridendine/db';
import type { DomainEventEmitter } from '../core/event-emitter';
import type { AuditLogger } from '../core/audit-logger';
import type { SLAManager } from '../core/sla-manager';
import type { MasterOrderEngine } from './master-order-engine';
import type { DeliveryEngine as MasterDeliveryEngine } from './delivery-engine';
import type { OfferManagementService } from './offer-management.service';
import type { DriverMatchingService, EligibleDriver } from './driver-matching.service';
import { DRIVER_PAYOUT_PERCENT, BASE_DELIVERY_FEE } from '../constants';

// ==========================================
// TYPES
// ==========================================

interface DeliveryData {
  id: string;
  order_id: string;
  driver_id?: string | null;
  status: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  estimated_distance_km?: number;
  estimated_duration_minutes?: number;
  delivery_fee: number;
  driver_payout: number;
  assignment_attempts_count: number;
  escalated_to_ops: boolean;
}

// ==========================================
// DISPATCH ORCHESTRATOR
// ==========================================

export class DispatchOrchestrator {
  constructor(
    private readonly client: SupabaseClient,
    private readonly events: DomainEventEmitter,
    private readonly audit: AuditLogger,
    private readonly sla: SLAManager,
    private readonly eta: EtaService,
    private readonly masterOrder: MasterOrderEngine,
    private readonly masterDelivery: MasterDeliveryEngine,
    private readonly offerManagement: OfferManagementService,
    private readonly driverMatching: DriverMatchingService
  ) {}

  // ==========================================
  // REQUEST DISPATCH
  // ==========================================

  async requestDispatch(
    orderId: string,
    actor: ActorContext
  ): Promise<OperationResult<DeliveryData>> {
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select(`
        *,
        storefront:chef_storefronts (
          id,
          name,
          chef:chef_profiles (id),
          kitchen:chef_kitchens (address, lat, lng)
        ),
        delivery_address:customer_addresses (
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          lat,
          lng
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } };
    }

    const { data: existingDelivery } = await this.client
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingDelivery) {
      return { success: false, error: { code: 'ALREADY_EXISTS', message: 'Delivery already created for this order' } };
    }

    const pickup = order.storefront?.kitchen;
    const dropoff = order.delivery_address;

    if (!pickup || !dropoff) {
      return { success: false, error: { code: 'INVALID_ADDRESS', message: 'Missing pickup or dropoff address' } };
    }

    const distance = haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const estimatedMinutes = Math.round((distance / 30) * 60) + 5;
    const driverPayout = Math.round(BASE_DELIVERY_FEE * (DRIVER_PAYOUT_PERCENT / 100)) / 100;

    const { data: delivery, error: deliveryError } = await this.client
      .from('deliveries')
      .insert({
        order_id: orderId,
        status: 'pending',
        pickup_address: pickup.address,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        dropoff_address: `${dropoff.address_line1}, ${dropoff.city}, ${dropoff.state} ${dropoff.postal_code}`,
        dropoff_lat: dropoff.lat,
        dropoff_lng: dropoff.lng,
        estimated_distance_km: distance,
        estimated_duration_minutes: estimatedMinutes,
        delivery_fee: order.delivery_fee,
        driver_payout: driverPayout,
        assignment_attempts_count: 0,
      })
      .select()
      .single();

    if (deliveryError || !delivery) {
      return { success: false, error: { code: 'CREATE_FAILED', message: deliveryError?.message || 'Failed to create delivery' } };
    }

    await this.client
      .from('orders')
      .update({ engine_status: 'dispatch_pending', updated_at: new Date().toISOString() })
      .eq('id', orderId);

    await this.sla.startTimer({
      type: 'dispatch_assignment' as SLAType,
      entityType: 'delivery',
      entityId: delivery.id,
      metadata: { orderId },
    });

    this.events.emit(
      'dispatch.requested' as DomainEventType,
      'delivery',
      delivery.id,
      { orderId, pickup: pickup.address, dropoff: delivery.dropoff_address },
      actor
    );

    await this.audit.log({
      action: 'create',
      entityType: 'delivery',
      entityId: delivery.id,
      actor,
      afterState: { status: 'pending', estimatedMinutes },
    });

    await this.events.flush();
    await this.offerManagement.offerToNextDriver(delivery.id, actor);

    return { success: true, data: delivery as DeliveryData };
  }

  // ==========================================
  // ON ORDER READY FOR PICKUP
  // ==========================================

  async onOrderReadyForPickup(
    orderId: string,
    actor: ActorContext
  ): Promise<OperationResult<AssignmentAttempt | null>> {
    const { data: delivery, error } = await this.client
      .from('deliveries')
      .select('id, status, driver_id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error || !delivery) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'No delivery found for this order' } };
    }

    if (delivery.driver_id || delivery.status !== 'pending') {
      return { success: true, data: null };
    }

    const nowIso = new Date().toISOString();
    const { data: livePending } = await this.client
      .from('assignment_attempts')
      .select('id')
      .eq('delivery_id', delivery.id)
      .eq('response', 'pending')
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (livePending) return { success: true, data: null };

    return this.offerManagement.offerToNextDriver(delivery.id, actor);
  }

  // ==========================================
  // MANUAL ASSIGN
  // ==========================================

  async manualAssign(
    deliveryId: string,
    driverId: string,
    actor: ActorContext,
    assignmentReason = 'Manual assignment by ops'
  ): Promise<OperationResult<DeliveryData>> {
    if (!['ops_agent', 'ops_admin', 'ops_manager', 'super_admin'].includes(actor.role)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Only ops can manually assign drivers' } };
    }

    const { data: delivery } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (!delivery) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Delivery not found' } };
    }

    const { data: driver } = await this.client
      .from('drivers')
      .select('*, driver_presence(*)')
      .eq('id', driverId)
      .eq('status', 'approved')
      .single();

    if (!driver) {
      return { success: false, error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found or not approved' } };
    }

    if (driver.driver_presence?.status === 'busy') {
      return { success: false, error: { code: 'DRIVER_BUSY', message: 'Driver is currently busy' } };
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await this.client
      .from('deliveries')
      .update({ driver_id: driverId, status: 'assigned', escalated_to_ops: false, updated_at: now })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      return { success: false, error: { code: 'UPDATE_FAILED', message: error.message } };
    }

    await this.client
      .from('driver_presence')
      .update({ status: 'busy', updated_at: now })
      .eq('driver_id', driverId);

    await this.client
      .from('assignment_attempts')
      .update({ response: 'cancelled' })
      .eq('delivery_id', deliveryId)
      .eq('response', 'pending');

    await this.audit.logOverride({
      action: 'manual_driver_assignment',
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      beforeState: { driver_id: delivery.driver_id, status: delivery.status },
      afterState: { driver_id: driverId, status: 'assigned' },
      reason: assignmentReason,
    });

    this.events.emit('driver.assigned' as DomainEventType, 'delivery', deliveryId, { driverId, manualAssignment: true }, actor);
    await this.events.flush();

    try {
      await this.eta.computeFullOnAssign(deliveryId);
    } catch {
      /* optional */
    }

    return { success: true, data: updated as DeliveryData };
  }

  // ==========================================
  // FORCE ASSIGN (wrapper)
  // ==========================================

  async forceAssign(
    deliveryId: string,
    driverId: string,
    actor: ActorContext,
    reason: string
  ): Promise<OperationResult<DeliveryData>> {
    return this.manualAssign(deliveryId, driverId, actor, reason || 'Ops force assign');
  }

  // ==========================================
  // REASSIGN DELIVERY
  // ==========================================

  async reassignDelivery(
    deliveryId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    if (!['ops_agent', 'ops_admin', 'ops_manager', 'super_admin'].includes(actor.role)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'Only ops can reassign deliveries' } };
    }

    const { data: delivery } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (!delivery) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Delivery not found' } };
    }

    const now = new Date().toISOString();
    const previousDriverId = delivery.driver_id;

    if (previousDriverId) {
      await this.client
        .from('driver_presence')
        .update({ status: 'online', updated_at: now })
        .eq('driver_id', previousDriverId);
    }

    await this.client
      .from('deliveries')
      .update({ driver_id: null, status: 'pending', assignment_attempts_count: 0, updated_at: now })
      .eq('id', deliveryId);

    await this.audit.logOverride({
      action: 'delivery_reassignment',
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      beforeState: { driver_id: previousDriverId },
      afterState: { driver_id: null, status: 'pending' },
      reason,
    });

    this.events.emit('driver.reassigned' as DomainEventType, 'delivery', deliveryId, { previousDriverId, reason }, actor);
    await this.events.flush();

    await this.offerManagement.offerToNextDriver(deliveryId, actor);

    return { success: true };
  }

  // ==========================================
  // ACCEPT OFFER (delegation to offerManagement)
  // ==========================================

  async acceptOffer(
    attemptId: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    return this.offerManagement.acceptOffer(attemptId, actor);
  }

  // ==========================================
  // DECLINE OFFER (delegation to offerManagement)
  // ==========================================

  async declineOffer(
    attemptId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    return this.offerManagement.declineOffer(attemptId, reason, actor);
  }

  // ==========================================
  // RESPOND TO OFFER (delegation to offerManagement)
  // ==========================================

  async respondToOffer(
    attemptId: string,
    response: 'accept' | 'decline',
    driverId: string,
    actor: ActorContext,
    declineReason?: string
  ): Promise<OperationResult> {
    return this.offerManagement.respondToOffer(attemptId, response, driverId, actor, declineReason);
  }

  // ==========================================
  // FIND AND ASSIGN DRIVER (delegation to offerManagement)
  // ==========================================

  async findAndAssignDriver(
    deliveryId: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    return this.offerManagement.offerToNextDriver(deliveryId, actor);
  }

  // ==========================================
  // PROCESS EXPIRED OFFERS (delegation to offerManagement)
  // ==========================================

  async processExpiredOffers(actor: ActorContext): Promise<number> {
    return this.offerManagement.processExpiredOffers(actor);
  }

  // ==========================================
  // UPDATE DELIVERY STATUS (delegation to masterDelivery)
  // ==========================================

  async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    actor: ActorContext,
    metadata?: { proofUrl?: string; notes?: string }
  ): Promise<OperationResult<{ id: string; order_id?: string; status: string }>> {
    return this.masterDelivery.updateDeliveryStatus(deliveryId, status, actor, metadata);
  }

  // ==========================================
  // DISPATCH BOARD (read-only)
  // ==========================================

  async getDispatchBoard(): Promise<{
    pendingDispatch: DeliveryData[];
    activeDeliveries: DeliveryData[];
    availableDrivers: EligibleDriver[];
    escalated: DeliveryData[];
  }> {
    const { data: pending } = await this.client
      .from('deliveries')
      .select(`*, orders (order_number, total, customer:customers(first_name, last_name))`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    const { data: active } = await this.client
      .from('deliveries')
      .select(`*, orders (order_number, total), driver:drivers (first_name, last_name, phone)`)
      .in('status', ['assigned', 'en_route_to_pickup', 'picked_up', 'en_route_to_dropoff'])
      .order('created_at', { ascending: true });

    const settings = await getPlatformSettings(this.client as unknown as Parameters<typeof getPlatformSettings>[0]);
    const availableDrivers = await this.driverMatching.findEligibleDrivers(0, 0, settings.dispatchRadiusKm, false);

    const { data: escalated } = await this.client
      .from('deliveries')
      .select(`*, orders (order_number, total)`)
      .eq('escalated_to_ops', true)
      .eq('status', 'pending');

    return {
      pendingDispatch: (pending || []) as DeliveryData[],
      activeDeliveries: (active || []) as DeliveryData[],
      availableDrivers,
      escalated: (escalated || []) as DeliveryData[],
    };
  }
}

// ==========================================
// HELPERS
// ==========================================

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ==========================================
// FACTORY
// ==========================================

export function createDispatchOrchestrator(
  client: SupabaseClient,
  events: DomainEventEmitter,
  audit: AuditLogger,
  sla: SLAManager,
  eta: EtaService,
  masterOrder: MasterOrderEngine,
  masterDelivery: MasterDeliveryEngine,
  offerManagement: OfferManagementService,
  driverMatching: DriverMatchingService
): DispatchOrchestrator {
  return new DispatchOrchestrator(
    client, events, audit, sla, eta,
    masterOrder, masterDelivery, offerManagement, driverMatching
  );
}
