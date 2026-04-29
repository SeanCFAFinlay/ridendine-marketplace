// ==========================================
// DISPATCH ENGINE
// Centralized dispatch and delivery assignment logic
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlatformSettings } from '@ridendine/db';
import type {
  ActorContext,
  OperationResult,
  DomainEventType,
  SLAType,
  AssignmentAttempt,
} from '@ridendine/types';
import { DomainEventEmitter } from '../core/event-emitter';
import { AuditLogger } from '../core/audit-logger';
import { SLAManager } from '../core/sla-manager';
import { DRIVER_PAYOUT_PERCENT, BASE_DELIVERY_FEE } from '../constants';
import { assertValidDeliveryTransition } from './order-state-machine';
import { BusinessRulesEngine } from '../core/business-rules-engine';

interface DeliveryData {
  id: string;
  order_id: string;
  driver_id?: string;
  status: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  estimated_distance_km?: number;
  estimated_duration_minutes?: number;
  actual_pickup_time?: string;
  actual_dropoff_time?: string;
  delivery_fee: number;
  driver_payout: number;
  assignment_attempts_count: number;
  escalated_to_ops: boolean;
}

interface EligibleDriver {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  approval_state: string;
  presence_status: string;
  distance_km: number;
  estimated_minutes: number;
  rating?: number;
  total_deliveries: number;
  active_workload: number;
  recent_declines: number;
  recent_expiries: number;
  fairness_score: number;
}

export function calculateDriverAssignmentScore(driver: EligibleDriver): number {
  const distanceScore = Math.max(0, (12 - driver.distance_km) * 10);
  const ratingScore = (driver.rating || 4) * 5;
  const experienceScore = Math.min(driver.total_deliveries, 500) / 25;
  const workloadPenalty = driver.active_workload * 25;
  const declinePenalty = driver.recent_declines * 8;
  const expiryPenalty = driver.recent_expiries * 10;
  const fairnessBonus = driver.fairness_score * 12;
  return Math.round(
    distanceScore +
      ratingScore +
      experienceScore +
      fairnessBonus -
      workloadPenalty -
      declinePenalty -
      expiryPenalty
  );
}

export class DispatchEngine {
  private client: SupabaseClient;
  private eventEmitter: DomainEventEmitter;
  private auditLogger: AuditLogger;
  private slaManager: SLAManager;

  constructor(
    client: SupabaseClient,
    eventEmitter: DomainEventEmitter,
    auditLogger: AuditLogger,
    slaManager: SLAManager
  ) {
    this.client = client;
    this.eventEmitter = eventEmitter;
    this.auditLogger = auditLogger;
    this.slaManager = slaManager;
  }

  /**
   * Request dispatch for a ready order
   */
  async requestDispatch(
    orderId: string,
    actor: ActorContext
  ): Promise<OperationResult<DeliveryData>> {
    // Get order with addresses
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select(`
        *,
        storefront:chef_storefronts (
          id,
          name,
          chef:chef_profiles (
            id
          ),
          kitchen:chef_kitchens (
            address,
            lat,
            lng
          )
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
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      };
    }

    // Check if delivery already exists
    const { data: existingDelivery } = await this.client
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingDelivery) {
      return {
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Delivery already created for this order' },
      };
    }

    // Create delivery record
    const pickup = order.storefront?.kitchen;
    const dropoff = order.delivery_address;

    if (!pickup || !dropoff) {
      return {
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Missing pickup or dropoff address' },
      };
    }

    // Calculate distance (Haversine formula)
    const distance = this.calculateDistance(
      pickup.lat,
      pickup.lng,
      dropoff.lat,
      dropoff.lng
    );

    // Estimate duration (avg 30 km/h in city)
    const estimatedMinutes = Math.round((distance / 30) * 60) + 5; // +5 for pickup/dropoff

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
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: deliveryError?.message || 'Failed to create delivery' },
      };
    }

    // Update order status
    await this.client
      .from('orders')
      .update({
        engine_status: 'dispatch_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Start dispatch SLA
    await this.slaManager.startTimer({
      type: 'dispatch_assignment' as SLAType,
      entityType: 'delivery',
      entityId: delivery.id,
      metadata: { orderId },
    });

    // Emit event
    this.eventEmitter.emit(
      'dispatch.requested' as DomainEventType,
      'delivery',
      delivery.id,
      { orderId, pickup: pickup.address, dropoff: delivery.dropoff_address },
      actor
    );

    await this.auditLogger.log({
      action: 'create',
      entityType: 'delivery',
      entityId: delivery.id,
      actor,
      afterState: { status: 'pending', estimatedMinutes },
    });

    await this.eventEmitter.flush();

    // Immediately try to find and assign a driver
    await this.findAndAssignDriver(delivery.id, actor);

    return { success: true, data: delivery as DeliveryData };
  }

  /**
   * Find eligible drivers and create assignment offer
   */
  async findAndAssignDriver(
    deliveryId: string,
    actor: ActorContext
  ): Promise<OperationResult<AssignmentAttempt>> {
    // Get delivery
    const { data: delivery, error: deliveryError } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Delivery not found' },
      };
    }

    // Check if max attempts reached
    const settings = await this.getDispatchSettings();
    if (delivery.assignment_attempts_count >= settings.maxAssignmentAttempts) {
      // Escalate to ops
      await this.escalateToOps(deliveryId, 'max_attempts_reached', actor);
      return {
        success: false,
        error: { code: 'MAX_ATTEMPTS', message: 'Maximum assignment attempts reached' },
      };
    }

    // Find eligible drivers
    const eligibleDrivers = await this.findEligibleDrivers(
      delivery.pickup_lat,
      delivery.pickup_lng,
      settings.dispatchRadiusKm
    );

    if (eligibleDrivers.length === 0) {
      // No drivers available
      if (delivery.assignment_attempts_count >= 2) {
        await this.escalateToOps(deliveryId, 'no_drivers_available', actor);
      }
      return {
        success: false,
        error: { code: 'NO_DRIVERS', message: 'No eligible drivers available' },
      };
    }

    // Get drivers who already declined
    const { data: previousAttempts } = await this.client
      .from('assignment_attempts')
      .select('driver_id')
      .eq('delivery_id', deliveryId)
      .in('response', ['declined', 'expired']);

    const declinedDriverIds = previousAttempts?.map((a) => a.driver_id) || [];

    // Filter out drivers who already declined
    const availableDrivers = eligibleDrivers.filter(
      (d) => !declinedDriverIds.includes(d.id)
    );

    if (availableDrivers.length === 0) {
      await this.escalateToOps(deliveryId, 'all_drivers_declined', actor);
      return {
        success: false,
        error: { code: 'ALL_DECLINED', message: 'All eligible drivers have declined' },
      };
    }

    // Select best driver (closest with good rating)
    const selectedDriver = this.selectBestDriver(availableDrivers);
    if (!selectedDriver) {
      await this.escalateToOps(deliveryId, 'no_driver_selected', actor);
      return {
        success: false,
        error: { code: 'NO_DRIVER', message: 'Could not select a driver' },
      };
    }

    // Create assignment attempt
    const now = new Date();
    const expiresAt = new Date(now.getTime() + settings.offerTimeoutSeconds * 1000);

    const { data: attempt, error: attemptError } = await this.client
      .from('assignment_attempts')
      .insert({
        delivery_id: deliveryId,
        driver_id: selectedDriver.id,
        attempt_number: delivery.assignment_attempts_count + 1,
        offered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        response: 'pending',
        distance_meters: Math.round(selectedDriver.distance_km * 1000),
        estimated_minutes: selectedDriver.estimated_minutes,
      })
      .select()
      .single();

    if (attemptError) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: attemptError.message },
      };
    }

    // Update delivery
    await this.client
      .from('deliveries')
      .update({
        assignment_attempts_count: delivery.assignment_attempts_count + 1,
        last_assignment_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', deliveryId);

    // Create notification for driver
    await this.client.from('notifications').insert({
      user_id: selectedDriver.user_id,
      type: 'delivery_offer',
      title: 'New Delivery Request',
      body: `New delivery available: ${delivery.pickup_address} to ${delivery.dropoff_address}`,
      message: `New delivery available: ${delivery.pickup_address} to ${delivery.dropoff_address}`,
      data: {
        deliveryId,
        attemptId: attempt.id,
        expiresAt: expiresAt.toISOString(),
        estimatedPayout: delivery.driver_payout,
      },
    });

    // Emit event
    this.eventEmitter.emit(
      'driver.offer.created' as DomainEventType,
      'assignment_attempt',
      attempt.id,
      { deliveryId, driverId: selectedDriver.id, expiresAt: expiresAt.toISOString() },
      actor
    );

    await this.eventEmitter.flush();

    return {
      success: true,
      data: {
        id: attempt.id,
        deliveryId,
        driverId: selectedDriver.id,
        attemptNumber: attempt.attempt_number,
        offeredAt: attempt.offered_at,
        expiresAt: attempt.expires_at,
        respondedAt: undefined,
        response: 'pending',
        distanceMeters: attempt.distance_meters,
        estimatedMinutes: attempt.estimated_minutes,
      },
    };
  }

  /**
   * Driver accepts delivery offer
   */
  async acceptOffer(
    attemptId: string,
    actor: ActorContext
  ): Promise<OperationResult<DeliveryData>> {
    // Get attempt
    const { data: attempt, error: attemptError } = await this.client
      .from('assignment_attempts')
      .select('*, deliveries(*)')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment attempt not found' },
      };
    }

    // Verify driver owns this attempt
    if (actor.role === 'driver') {
      const { data: driver } = await this.client
        .from('drivers')
        .select('id')
        .eq('user_id', actor.userId)
        .single();

      if (!driver || driver.id !== attempt.driver_id) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'This offer is not for you' },
        };
      }
    }

    // Check if offer expired
    if (new Date() > new Date(attempt.expires_at)) {
      return {
        success: false,
        error: { code: 'EXPIRED', message: 'This offer has expired' },
      };
    }

    // Check if already responded
    if (attempt.response !== 'pending') {
      return {
        success: false,
        error: { code: 'ALREADY_RESPONDED', message: 'You have already responded to this offer' },
      };
    }

    const rules = new BusinessRulesEngine(this.client);
    const ruleCheck = await rules.canDriverAcceptDelivery({ deliveryId: attempt.delivery_id, driverId: actor.entityId || actor.userId });
    if (!ruleCheck.allowed) {
      return {
        success: false,
        error: { code: 'BUSINESS_RULE_VIOLATION', message: ruleCheck.reason },
      };
    }

    const now = new Date().toISOString();

    // Update attempt
    await this.client
      .from('assignment_attempts')
      .update({
        response: 'accepted',
        responded_at: now,
      })
      .eq('id', attemptId);

    // Expire other pending attempts for this delivery
    await this.client
      .from('assignment_attempts')
      .update({ response: 'cancelled' })
      .eq('delivery_id', attempt.delivery_id)
      .eq('response', 'pending')
      .neq('id', attemptId);

    // Update delivery with driver
    const { data: delivery, error: deliveryError } = await this.client
      .from('deliveries')
      .update({
        driver_id: attempt.driver_id,
        status: 'assigned',
        updated_at: now,
      })
      .eq('id', attempt.delivery_id)
      .select()
      .single();

    if (deliveryError) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: deliveryError.message },
      };
    }

    // Update order status
    await this.client
      .from('orders')
      .update({
        status: 'ready_for_pickup',
        engine_status: 'driver_assigned',
        updated_at: now,
      })
      .eq('id', delivery.order_id);

    // Update driver presence to busy
    await this.client
      .from('driver_presence')
      .update({ status: 'busy', updated_at: now })
      .eq('driver_id', attempt.driver_id);

    // Complete dispatch SLA
    await this.slaManager.completeTimer('delivery', attempt.delivery_id, 'dispatch_assignment' as SLAType);

    // Emit events
    this.eventEmitter.emit(
      'driver.offer.accepted' as DomainEventType,
      'assignment_attempt',
      attemptId,
      { deliveryId: attempt.delivery_id, driverId: attempt.driver_id },
      actor
    );

    this.eventEmitter.emit(
      'driver.assigned' as DomainEventType,
      'delivery',
      attempt.delivery_id,
      { driverId: attempt.driver_id },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'delivery',
      entityId: attempt.delivery_id,
      actor,
      previousStatus: 'pending',
      newStatus: 'assigned',
      metadata: { driverId: attempt.driver_id },
    });

    await this.eventEmitter.flush();

    return { success: true, data: delivery as DeliveryData };
  }

  /**
   * Driver declines delivery offer
   */
  async declineOffer(
    attemptId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    const { data: attempt, error: attemptError } = await this.client
      .from('assignment_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Assignment attempt not found' },
      };
    }

    // Verify driver owns this attempt
    if (actor.role === 'driver') {
      const { data: driver } = await this.client
        .from('drivers')
        .select('id')
        .eq('user_id', actor.userId)
        .single();

      if (!driver || driver.id !== attempt.driver_id) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'This offer is not for you' },
        };
      }
    }

    if (attempt.response !== 'pending') {
      return {
        success: false,
        error: { code: 'ALREADY_RESPONDED', message: 'Already responded' },
      };
    }

    const now = new Date().toISOString();

    // Update attempt
    await this.client
      .from('assignment_attempts')
      .update({
        response: 'declined',
        responded_at: now,
        decline_reason: reason,
      })
      .eq('id', attemptId);

    // Emit event
    this.eventEmitter.emit(
      'driver.offer.declined' as DomainEventType,
      'assignment_attempt',
      attemptId,
      { deliveryId: attempt.delivery_id, driverId: attempt.driver_id, reason },
      actor
    );

    await this.eventEmitter.flush();

    // Try to assign to next driver
    await this.findAndAssignDriver(attempt.delivery_id, {
      userId: 'system',
      role: 'system',
    });

    return { success: true };
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: string,
    actor: ActorContext,
    metadata?: { proofUrl?: string; notes?: string }
  ): Promise<OperationResult<DeliveryData>> {
    const { data: delivery, error: deliveryError } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Delivery not found' },
      };
    }

    // Verify driver owns this delivery (unless ops)
    if (actor.role === 'driver') {
      const { data: driver } = await this.client
        .from('drivers')
        .select('id')
        .eq('user_id', actor.userId)
        .single();

      if (!driver || driver.id !== delivery.driver_id) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'This delivery is not assigned to you' },
        };
      }
    }

    // Canonical delivery state machine validation
    try {
      const currentEngine = this.mapDeliveryStatusForValidation(delivery.status);
      const targetEngine = this.mapDeliveryStatusForValidation(status);
      assertValidDeliveryTransition(currentEngine, targetEngine);
    } catch {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: `Cannot transition delivery from ${delivery.status} to ${status}` },
      };
    }

    const now = new Date().toISOString();
    const previousStatus = delivery.status;

    const updateData: Record<string, unknown> = {
      status,
      updated_at: now,
    };

    // Handle specific status updates
    if (status === 'picked_up') {
      updateData.actual_pickup_time = now;
      if (metadata?.proofUrl) {
        updateData.pickup_proof_url = metadata.proofUrl;
      }
      // Start delivery SLA
      await this.slaManager.startTimer({
        type: 'driver_delivery' as SLAType,
        entityType: 'delivery',
        entityId: deliveryId,
        customDurationMinutes: delivery.estimated_duration_minutes || 30,
      });
    }

    if (status === 'delivered') {
      updateData.actual_dropoff_time = now;
      if (metadata?.proofUrl) {
        updateData.dropoff_proof_url = metadata.proofUrl;
      }
      // Complete delivery SLA
      await this.slaManager.completeTimer('delivery', deliveryId, 'driver_delivery' as SLAType);
    }

    if (metadata?.notes) {
      updateData.delivery_notes = metadata.notes;
    }

    // Update delivery
    const { data: updated, error } = await this.client
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    // Map delivery status to order engine status
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
        .eq('id', delivery.order_id);
    }

    // Create delivery tracking event
    await this.client.from('delivery_events').insert({
      delivery_id: deliveryId,
      event_type: `status_${status}`,
      event_data: { previousStatus, newStatus: status, ...metadata },
      actor_type: actor.role === 'driver' ? 'driver' : actor.role === 'system' ? 'system' : 'ops',
      actor_id: actor.userId !== 'system' ? actor.userId : undefined,
    });

    // Emit event
    const eventType = `delivery.${status.replace(/_/g, '_')}` as DomainEventType;
    this.eventEmitter.emit(
      eventType,
      'delivery',
      deliveryId,
      { previousStatus, newStatus: status },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      previousStatus,
      newStatus: status,
      metadata,
    });

    await this.eventEmitter.flush();

    // If delivered, release driver
    if (status === 'delivered') {
      await this.releaseDriver(delivery.driver_id);
    }

    return { success: true, data: updated as DeliveryData };
  }

  /**
   * Manually assign driver (ops action)
   */
  async manualAssign(
    deliveryId: string,
    driverId: string,
    actor: ActorContext
  ): Promise<OperationResult<DeliveryData>> {
    // Only ops can manually assign
    if (!['ops_agent', 'ops_manager', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only ops can manually assign drivers' },
      };
    }

    const { data: delivery } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (!delivery) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Delivery not found' },
      };
    }

    // Verify driver is available
    const { data: driver } = await this.client
      .from('drivers')
      .select('*, driver_presence(*)')
      .eq('id', driverId)
      .eq('status', 'approved')
      .single();

    if (!driver) {
      return {
        success: false,
        error: { code: 'DRIVER_NOT_FOUND', message: 'Driver not found or not approved' },
      };
    }

    if (driver.driver_presence?.status === 'busy') {
      return {
        success: false,
        error: { code: 'DRIVER_BUSY', message: 'Driver is currently busy' },
      };
    }

    const now = new Date().toISOString();

    // Update delivery
    const { data: updated, error } = await this.client
      .from('deliveries')
      .update({
        driver_id: driverId,
        status: 'assigned',
        escalated_to_ops: false,
        updated_at: now,
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    // Update driver presence
    await this.client
      .from('driver_presence')
      .update({ status: 'busy', updated_at: now })
      .eq('driver_id', driverId);

    // Cancel any pending attempts
    await this.client
      .from('assignment_attempts')
      .update({ response: 'cancelled' })
      .eq('delivery_id', deliveryId)
      .eq('response', 'pending');

    // Log override
    await this.auditLogger.logOverride({
      action: 'manual_driver_assignment',
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      beforeState: { driver_id: delivery.driver_id, status: delivery.status },
      afterState: { driver_id: driverId, status: 'assigned' },
      reason: 'Manual assignment by ops',
    });

    // Emit event
    this.eventEmitter.emit(
      'driver.assigned' as DomainEventType,
      'delivery',
      deliveryId,
      { driverId, manualAssignment: true },
      actor
    );

    await this.eventEmitter.flush();

    return { success: true, data: updated as DeliveryData };
  }

  /**
   * Reassign delivery to different driver
   */
  async reassignDelivery(
    deliveryId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    if (!['ops_agent', 'ops_manager', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only ops can reassign deliveries' },
      };
    }

    const { data: delivery } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (!delivery) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Delivery not found' },
      };
    }

    const now = new Date().toISOString();
    const previousDriverId = delivery.driver_id;

    // Release previous driver
    if (previousDriverId) {
      await this.releaseDriver(previousDriverId);
    }

    // Reset delivery for reassignment
    await this.client
      .from('deliveries')
      .update({
        driver_id: null,
        status: 'pending',
        assignment_attempts_count: 0,
        updated_at: now,
      })
      .eq('id', deliveryId);

    // Log override
    await this.auditLogger.logOverride({
      action: 'delivery_reassignment',
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      beforeState: { driver_id: previousDriverId },
      afterState: { driver_id: null, status: 'pending' },
      reason,
    });

    // Emit event
    this.eventEmitter.emit(
      'driver.reassigned' as DomainEventType,
      'delivery',
      deliveryId,
      { previousDriverId, reason },
      actor
    );

    await this.eventEmitter.flush();

    // Try to find new driver
    await this.findAndAssignDriver(deliveryId, actor);

    return { success: true };
  }

  /**
   * Get dispatch board data for ops
   */
  async getDispatchBoard(): Promise<{
    pendingDispatch: DeliveryData[];
    activeDeliveries: DeliveryData[];
    availableDrivers: EligibleDriver[];
    escalated: DeliveryData[];
  }> {
    // Pending dispatch
    const { data: pending } = await this.client
      .from('deliveries')
      .select(`
        *,
        orders (order_number, total, customer:customers(first_name, last_name))
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    // Active deliveries
    const { data: active } = await this.client
      .from('deliveries')
      .select(`
        *,
        orders (order_number, total),
        driver:drivers (first_name, last_name, phone)
      `)
      .in('status', ['assigned', 'en_route_to_pickup', 'picked_up', 'en_route_to_dropoff'])
      .order('created_at', { ascending: true });

    // Available drivers
    const settings = await this.getDispatchSettings();
    const availableDrivers = await this.findEligibleDrivers(0, 0, settings.dispatchRadiusKm, false);

    // Escalated
    const { data: escalated } = await this.client
      .from('deliveries')
      .select(`
        *,
        orders (order_number, total)
      `)
      .eq('escalated_to_ops', true)
      .eq('status', 'pending');

    return {
      pendingDispatch: (pending || []) as DeliveryData[],
      activeDeliveries: (active || []) as DeliveryData[],
      availableDrivers: availableDrivers,
      escalated: (escalated || []) as DeliveryData[],
    };
  }

  /**
   * Process expired offers (called periodically)
   */
  async processExpiredOffers(actor: ActorContext): Promise<number> {
    const now = new Date().toISOString();

    // Find expired pending offers
    const { data: expired } = await this.client
      .from('assignment_attempts')
      .select('id, delivery_id')
      .eq('response', 'pending')
      .lt('expires_at', now);

    if (!expired || expired.length === 0) {
      return 0;
    }

    // Update each expired offer
    for (const attempt of expired) {
      await this.client
        .from('assignment_attempts')
        .update({ response: 'expired' })
        .eq('id', attempt.id);

      this.eventEmitter.emit(
        'driver.offer.expired' as DomainEventType,
        'assignment_attempt',
        attempt.id,
        { deliveryId: attempt.delivery_id },
        actor
      );

      // Try to reassign
      await this.findAndAssignDriver(attempt.delivery_id, actor);
    }

    await this.eventEmitter.flush();

    return expired.length;
  }

  /**
   * Find eligible drivers near pickup location
   */
  private async findEligibleDrivers(
    pickupLat: number,
    pickupLng: number,
    maxRadiusKm = 10,
    filterByLocation = true
  ): Promise<EligibleDriver[]> {
    // Get online, approved drivers
    const { data: drivers, error } = await this.client
      .from('drivers')
      .select(`
        id,
        user_id,
        status,
        first_name,
        last_name,
        rating,
        total_deliveries,
        driver_presence!inner (
          status,
          current_lat,
          current_lng
        )
      `)
      .eq('status', 'approved')
      .eq('driver_presence.status', 'online');

    if (error || !drivers) {
      return [];
    }

    // Calculate distances and filter
    const eligible: EligibleDriver[] = [];
    const driverIds = (drivers ?? []).map((driver) => driver.id);
    const [activeDeliveriesResult, attemptsResult] = await Promise.all([
      driverIds.length
        ? ((this.client
            .from('deliveries')
            .select('driver_id')
            .in('driver_id', driverIds)
            .in('status', ['assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff']) as any) as Promise<any>)
        : Promise.resolve({ data: [], error: null }),
      driverIds.length
        ? ((this.client
            .from('assignment_attempts')
            .select('driver_id, response')
            .in('driver_id', driverIds)
            .gte('offered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) as any) as Promise<any>)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const activeWorkload = new Map<string, number>();
    for (const active of activeDeliveriesResult.data ?? []) {
      if (!active.driver_id) continue;
      activeWorkload.set(
        active.driver_id,
        (activeWorkload.get(active.driver_id) ?? 0) + 1
      );
    }

    const recentDeclines = new Map<string, number>();
    const recentExpiries = new Map<string, number>();
    for (const attempt of attemptsResult.data ?? []) {
      if (!attempt.driver_id) continue;
      if (attempt.response === 'declined') {
        recentDeclines.set(
          attempt.driver_id,
          (recentDeclines.get(attempt.driver_id) ?? 0) + 1
        );
      }
      if (attempt.response === 'expired') {
        recentExpiries.set(
          attempt.driver_id,
          (recentExpiries.get(attempt.driver_id) ?? 0) + 1
        );
      }
    }

    for (const driver of drivers) {
      // driver_presence is returned as single object with !inner join
      const presence = driver.driver_presence as unknown as {
        status: string;
        current_lat: number | null;
        current_lng: number | null;
      };
      if (!presence) continue;

      let distance = 0;
      if (filterByLocation && pickupLat && pickupLng && presence.current_lat && presence.current_lng) {
        distance = this.calculateDistance(
          presence.current_lat,
          presence.current_lng,
          pickupLat,
          pickupLng
        );

        if (distance > maxRadiusKm) continue;
      }

      const workload = activeWorkload.get(driver.id) ?? 0;

      eligible.push({
        id: driver.id,
        user_id: driver.user_id,
        first_name: driver.first_name,
        last_name: driver.last_name,
        approval_state: driver.status,
        presence_status: presence.status,
        distance_km: distance,
        estimated_minutes: Math.round((distance / 30) * 60) + 5,
        rating: driver.rating,
        total_deliveries: driver.total_deliveries,
        active_workload: workload,
        recent_declines: recentDeclines.get(driver.id) ?? 0,
        recent_expiries: recentExpiries.get(driver.id) ?? 0,
        fairness_score: 1 / (workload + 1),
      });
    }

    // Sort by distance
    return eligible.sort((a, b) => a.distance_km - b.distance_km);
  }

  /**
   * Select best driver from eligible list
   */
  private selectBestDriver(drivers: EligibleDriver[]): EligibleDriver | null {
    if (drivers.length === 0) {
      return null;
    }

    const scored = drivers.map((driver) => ({
      ...driver,
      score: calculateDriverAssignmentScore(driver),
    }));

    // Return highest scored
    return scored.sort((a, b) => b.score - a.score)[0]!;
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

  /**
   * Release driver (mark as online)
   */
  private async releaseDriver(driverId: string): Promise<void> {
    await this.client
      .from('driver_presence')
      .update({
        status: 'online',
        updated_at: new Date().toISOString(),
      })
      .eq('driver_id', driverId);
  }

  /**
   * Escalate delivery to ops
   */
  private async escalateToOps(
    deliveryId: string,
    reason: string,
    actor: ActorContext
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.client
      .from('deliveries')
      .update({
        escalated_to_ops: true,
        escalated_at: now,
        updated_at: now,
      })
      .eq('id', deliveryId);

    // Get delivery for exception
    const { data: delivery } = await this.client
      .from('deliveries')
      .select('order_id')
      .eq('id', deliveryId)
      .single();

    // Create exception
    await this.client.from('order_exceptions').insert({
      exception_type: reason === 'no_drivers_available' ? 'no_driver_available' : 'assignment_timeout',
      severity: 'high',
      status: 'open',
      order_id: delivery?.order_id,
      delivery_id: deliveryId,
      title: 'Delivery Assignment Failed',
      description: `Failed to assign driver. Reason: ${reason}`,
      recommended_actions: ['Manual assignment required', 'Contact nearby drivers', 'Consider order cancellation'],
      sla_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min deadline
    });

    // Create system alert
    await this.client.from('system_alerts').insert({
      alert_type: 'dispatch_escalation',
      severity: 'error',
      title: 'Delivery Needs Manual Assignment',
      message: `Delivery ${deliveryId} requires manual assignment. Reason: ${reason}`,
      entity_type: 'delivery',
      entity_id: deliveryId,
    });

    this.eventEmitter.emit(
      'exception.created' as DomainEventType,
      'delivery',
      deliveryId,
      { reason, escalated: true },
      actor
    );
  }

  /**
   * Calculate distance using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async getDispatchSettings(): Promise<{
    dispatchRadiusKm: number;
    offerTimeoutSeconds: number;
    maxAssignmentAttempts: number;
  }> {
    const settings = await getPlatformSettings(this.client as unknown as any);
    return {
      dispatchRadiusKm: settings.dispatchRadiusKm,
      offerTimeoutSeconds: settings.offerTimeoutSeconds,
      maxAssignmentAttempts: settings.maxAssignmentAttempts,
    };
  }
}

/**
 * Create dispatch engine instance
 */
export function createDispatchEngine(
  client: SupabaseClient,
  eventEmitter: DomainEventEmitter,
  auditLogger: AuditLogger,
  slaManager: SLAManager
): DispatchEngine {
  return new DispatchEngine(client, eventEmitter, auditLogger, slaManager);
}
