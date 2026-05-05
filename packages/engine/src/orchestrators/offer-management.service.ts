// ==========================================
// OFFER MANAGEMENT SERVICE
// Handles driver offer lifecycle: create, accept, decline, expire.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EtaService } from '@ridendine/routing';
import type { ActorContext, AssignmentAttempt, DomainEventType, OperationResult, SLAType } from '@ridendine/types';
import { getPlatformSettings } from '@ridendine/db';
import type { DomainEventEmitter } from '../core/event-emitter';
import type { AuditLogger } from '../core/audit-logger';
import type { SLAManager } from '../core/sla-manager';
import type { DriverMatchingService } from './driver-matching.service';
import { BusinessRulesEngine } from '../core/business-rules-engine';

// ==========================================
// TYPES
// ==========================================

interface DeliveryRow {
  id: string;
  order_id: string;
  driver_id?: string | null;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  estimated_distance_km?: number | null;
  delivery_fee: number;
  driver_payout: number;
  assignment_attempts_count: number;
  estimated_duration_minutes?: number | null;
}

interface ServiceSettings {
  dispatchRadiusKm: number;
  offerTimeoutSeconds: number;
  maxAssignmentAttempts: number;
}

// ==========================================
// OFFER MANAGEMENT SERVICE
// ==========================================

export class OfferManagementService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly events: DomainEventEmitter,
    private readonly audit: AuditLogger,
    private readonly sla: SLAManager,
    private readonly driverMatching: DriverMatchingService,
    private readonly eta?: EtaService
  ) {}

  // ==========================================
  // OFFER TO NEXT DRIVER
  // ==========================================

  /**
   * Rank drivers, create assignment_attempts row (pending), broadcast sanitized offer.
   * Realtime broadcast payload is preserved verbatim (FND-004 compliance).
   */
  async offerToNextDriver(
    deliveryId: string,
    actor: ActorContext
  ): Promise<OperationResult<AssignmentAttempt>> {
    const { data: delivery, error: deliveryError } = await this.client
      .from('deliveries')
      .select('*')
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Delivery not found' } };
    }

    const nowIso = new Date().toISOString();
    const { data: livePending } = await this.client
      .from('assignment_attempts')
      .select('id')
      .eq('delivery_id', deliveryId)
      .eq('response', 'pending')
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (livePending) {
      return { success: false, error: { code: 'PENDING_OFFER', message: 'A pending offer already exists for this delivery' } };
    }

    const settings = await this.loadSettings(null);
    const typedDelivery = delivery as DeliveryRow;

    if (typedDelivery.assignment_attempts_count >= settings.maxAssignmentAttempts) {
      await this.escalateToOps(deliveryId, 'max_attempts_reached', actor);
      return { success: false, error: { code: 'MAX_ATTEMPTS', message: 'Maximum assignment attempts reached' } };
    }

    const eligibleDrivers = await this.driverMatching.findEligibleDrivers(
      typedDelivery.pickup_lat,
      typedDelivery.pickup_lng,
      settings.dispatchRadiusKm
    );

    if (eligibleDrivers.length === 0) {
      if (typedDelivery.assignment_attempts_count >= 2) {
        await this.escalateToOps(deliveryId, 'no_drivers_available', actor);
      }
      return { success: false, error: { code: 'NO_DRIVERS', message: 'No eligible drivers available' } };
    }

    const { data: previousAttempts } = await this.client
      .from('assignment_attempts')
      .select('driver_id')
      .eq('delivery_id', deliveryId)
      .in('response', ['declined', 'expired']);

    const declinedIds = (previousAttempts ?? []).map((a: { driver_id: string }) => a.driver_id);
    const availableDrivers = eligibleDrivers.filter((d) => !declinedIds.includes(d.id));

    if (availableDrivers.length === 0) {
      await this.escalateToOps(deliveryId, 'all_drivers_declined', actor);
      return { success: false, error: { code: 'ALL_DECLINED', message: 'All eligible drivers have declined' } };
    }

    const ranked = await this.driverMatching.rankCandidates(deliveryId, availableDrivers);
    const driverById = new Map(availableDrivers.map((d) => [d.id, d]));
    const orderedDrivers = ranked
      .map((r) => driverById.get(r.driverId))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));

    const selectedDriver = orderedDrivers[0] ?? this.driverMatching.selectBestDriver(availableDrivers);
    if (!selectedDriver) {
      await this.escalateToOps(deliveryId, 'no_driver_selected', actor);
      return { success: false, error: { code: 'NO_DRIVER', message: 'Could not select a driver' } };
    }

    const rankRow = ranked.find((r) => r.driverId === selectedDriver.id);
    const etaMinutes =
      rankRow && Number.isFinite(rankRow.seconds) && rankRow.seconds < Number.MAX_SAFE_INTEGER / 2
        ? Math.max(1, Math.ceil(rankRow.seconds / 60))
        : selectedDriver.estimated_minutes;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + settings.offerTimeoutSeconds * 1000);

    const { data: attempt, error: attemptError } = await this.client
      .from('assignment_attempts')
      .insert({
        delivery_id: deliveryId,
        driver_id: selectedDriver.id,
        attempt_number: typedDelivery.assignment_attempts_count + 1,
        offered_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        response: 'pending',
        distance_meters: Math.round(selectedDriver.distance_km * 1000),
        estimated_minutes: etaMinutes,
      })
      .select()
      .single();

    if (attemptError || !attempt) {
      return { success: false, error: { code: 'CREATE_FAILED', message: attemptError?.message || 'Failed to create attempt' } };
    }

    await this.client
      .from('deliveries')
      .update({
        assignment_attempts_count: typedDelivery.assignment_attempts_count + 1,
        last_assignment_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', deliveryId);

    await this.client.from('notifications').insert({
      user_id: selectedDriver.user_id,
      type: 'delivery_offer',
      title: 'New Delivery Request',
      body: `New delivery available: ${typedDelivery.pickup_address} to ${typedDelivery.dropoff_address}`,
      message: `New delivery available: ${typedDelivery.pickup_address} to ${typedDelivery.dropoff_address}`,
      data: {
        deliveryId,
        attemptId: attempt.id,
        expiresAt: expiresAt.toISOString(),
        estimatedPayout: typedDelivery.driver_payout,
      },
    });

    this.events.emit(
      'driver.offer.created' as DomainEventType,
      'assignment_attempt',
      attempt.id,
      { deliveryId, driverId: selectedDriver.id, expiresAt: expiresAt.toISOString() },
      actor
    );

    // Broadcast payload — preserved verbatim (realtime broadcast logic)
    const broadcastPayload: Record<string, unknown> = {
      attemptId: attempt.id,
      deliveryId,
      expiresAt: expiresAt.toISOString(),
      pickupAddress: typedDelivery.pickup_address,
      dropoffAddress: typedDelivery.dropoff_address,
      estimatedDistanceKm: typedDelivery.estimated_distance_km ?? null,
      estimatedPayout: typedDelivery.driver_payout,
      estimatedMinutes: etaMinutes,
    };

    await this.events.broadcastDriverOffer(selectedDriver.id, broadcastPayload, 'offer');

    await this.audit.log({
      action: 'create',
      entityType: 'assignment_attempt',
      entityId: attempt.id,
      actor,
      afterState: {
        deliveryId,
        driverId: selectedDriver.id,
        expiresAt: expiresAt.toISOString(),
      },
      metadata: { dispatchOffer: true },
    });

    await this.events.flush();

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

  // ==========================================
  // ACCEPT OFFER
  // ==========================================

  async acceptOffer(
    attemptId: string,
    actor: ActorContext
  ): Promise<OperationResult<DeliveryRow>> {
    const { data: attempt, error: attemptError } = await this.client
      .from('assignment_attempts')
      .select('*, deliveries(*)')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Assignment attempt not found' } };
    }

    if (actor.role === 'driver') {
      const ownerCheck = await this.verifyDriverOwnsAttempt(actor.userId, attempt.driver_id);
      if (!ownerCheck) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'This offer is not for you' } };
      }
    }

    if (new Date() > new Date(attempt.expires_at)) {
      return { success: false, error: { code: 'EXPIRED', message: 'This offer has expired' } };
    }

    if (attempt.response !== 'pending') {
      return { success: false, error: { code: 'ALREADY_RESPONDED', message: 'You have already responded to this offer' } };
    }

    const rules = new BusinessRulesEngine(this.client);
    const ruleCheck = await rules.canDriverAcceptDelivery({
      deliveryId: attempt.delivery_id,
      driverId: actor.entityId || actor.userId,
    });
    if (!ruleCheck.allowed) {
      return { success: false, error: { code: 'BUSINESS_RULE_VIOLATION', message: ruleCheck.reason } };
    }

    const now = new Date().toISOString();

    await this.client
      .from('assignment_attempts')
      .update({ response: 'accepted', responded_at: now })
      .eq('id', attemptId);

    await this.client
      .from('assignment_attempts')
      .update({ response: 'cancelled' })
      .eq('delivery_id', attempt.delivery_id)
      .eq('response', 'pending')
      .neq('id', attemptId);

    const { data: delivery, error: deliveryError } = await this.client
      .from('deliveries')
      .update({ driver_id: attempt.driver_id, status: 'assigned', updated_at: now })
      .eq('id', attempt.delivery_id)
      .select()
      .single();

    if (deliveryError) {
      return { success: false, error: { code: 'UPDATE_FAILED', message: deliveryError.message } };
    }

    await this.client
      .from('orders')
      .update({ status: 'ready_for_pickup', engine_status: 'driver_assigned', updated_at: now })
      .eq('id', delivery.order_id);

    await this.client
      .from('driver_presence')
      .update({ status: 'busy', updated_at: now })
      .eq('driver_id', attempt.driver_id);

    await this.sla.completeTimer('delivery', attempt.delivery_id, 'dispatch_assignment' as SLAType);

    this.events.emit('driver.offer.accepted' as DomainEventType, 'assignment_attempt', attemptId, { deliveryId: attempt.delivery_id, driverId: attempt.driver_id }, actor);
    this.events.emit('driver.assigned' as DomainEventType, 'delivery', attempt.delivery_id, { driverId: attempt.driver_id }, actor);

    await this.audit.logStatusChange({
      entityType: 'delivery',
      entityId: attempt.delivery_id,
      actor,
      previousStatus: 'pending',
      newStatus: 'assigned',
      metadata: { driverId: attempt.driver_id },
    });

    await this.events.flush();

    if (this.eta) {
      try {
        await this.eta.computeFullOnAssign(attempt.delivery_id);
      } catch {
        /* optional */
      }
    }

    return { success: true, data: delivery as DeliveryRow };
  }

  // ==========================================
  // DECLINE OFFER
  // ==========================================

  async declineOffer(
    attemptId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult<void>> {
    const { data: attempt, error: attemptError } = await this.client
      .from('assignment_attempts')
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Assignment attempt not found' } };
    }

    if (actor.role === 'driver') {
      const ownerCheck = await this.verifyDriverOwnsAttempt(actor.userId, attempt.driver_id);
      if (!ownerCheck) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'This offer is not for you' } };
      }
    }

    if (attempt.response !== 'pending') {
      return { success: false, error: { code: 'ALREADY_RESPONDED', message: 'Already responded' } };
    }

    const now = new Date().toISOString();

    await this.client
      .from('assignment_attempts')
      .update({ response: 'declined', responded_at: now, decline_reason: reason })
      .eq('id', attemptId);

    this.events.emit('driver.offer.declined' as DomainEventType, 'assignment_attempt', attemptId, { deliveryId: attempt.delivery_id, driverId: attempt.driver_id, reason }, actor);
    await this.events.flush();

    await this.offerToNextDriver(attempt.delivery_id, { userId: 'system', role: 'system' });

    return { success: true };
  }

  // ==========================================
  // RESPOND TO OFFER (dispatcher)
  // ==========================================

  async respondToOffer(
    attemptId: string,
    response: 'accept' | 'decline',
    driverId: string,
    actor: ActorContext,
    declineReason?: string
  ): Promise<OperationResult<DeliveryRow | void>> {
    const { data: attempt, error } = await this.client
      .from('assignment_attempts')
      .select('driver_id')
      .eq('id', attemptId)
      .single();

    if (error || !attempt) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Assignment attempt not found' } };
    }

    if (attempt.driver_id !== driverId) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'This offer is not for this driver' } };
    }

    if (response === 'accept') return this.acceptOffer(attemptId, actor);
    return this.declineOffer(attemptId, declineReason || 'driver_declined', actor);
  }

  // ==========================================
  // PROCESS EXPIRED OFFERS (periodic job)
  // ==========================================

  async processExpiredOffers(actor: ActorContext): Promise<number> {
    const now = new Date().toISOString();
    const { data: expired } = await this.client
      .from('assignment_attempts')
      .select('id')
      .eq('response', 'pending')
      .lt('expires_at', now);

    if (!expired || expired.length === 0) return 0;

    for (const row of expired) {
      await this.expireAttempt(row.id, actor);
    }

    return expired.length;
  }

  // ==========================================
  // EXPIRE SINGLE ATTEMPT
  // ==========================================

  async expireAttempt(attemptId: string, actor: ActorContext): Promise<OperationResult<void>> {
    const now = new Date().toISOString();

    const { data: updatedRows, error: updErr } = await this.client
      .from('assignment_attempts')
      .update({ response: 'expired', responded_at: now })
      .eq('id', attemptId)
      .eq('response', 'pending')
      .lte('expires_at', now)
      .select('id, delivery_id, driver_id')
      .maybeSingle();

    if (updErr) {
      return { success: false, error: { code: 'UPDATE_FAILED', message: updErr.message } };
    }
    if (!updatedRows) return { success: true };

    await this.events.broadcastDriverOffer(
      updatedRows.driver_id as string,
      { attemptId, deliveryId: updatedRows.delivery_id, reason: 'expired' },
      'offer_expired'
    );

    this.events.emit('driver.offer.expired' as DomainEventType, 'assignment_attempt', attemptId, { deliveryId: updatedRows.delivery_id }, actor);

    const { data: delivery } = await this.client
      .from('deliveries')
      .select('assignment_attempts_count')
      .eq('id', updatedRows.delivery_id as string)
      .single();

    const settings = await this.loadSettings(null);
    const attempts = delivery?.assignment_attempts_count ?? 0;

    if (attempts >= settings.maxAssignmentAttempts) {
      await this.escalateToOps(updatedRows.delivery_id as string, 'max_attempts_reached', actor);
    } else {
      await this.offerToNextDriver(updatedRows.delivery_id as string, actor);
    }

    await this.events.flush();
    return { success: true };
  }

  // ==========================================
  // ESCALATE TO OPS (internal)
  // ==========================================

  private async escalateToOps(deliveryId: string, reason: string, actor: ActorContext): Promise<void> {
    const now = new Date().toISOString();

    await this.client
      .from('deliveries')
      .update({ escalated_to_ops: true, escalated_at: now, updated_at: now })
      .eq('id', deliveryId);

    const { data: delivery } = await this.client
      .from('deliveries')
      .select('order_id, assignment_attempts_count')
      .eq('id', deliveryId)
      .single();

    const dispatchReasons = new Set([
      'max_attempts_reached', 'max_assignment_attempts_exhausted',
      'no_drivers_available', 'all_drivers_declined', 'no_driver_selected',
    ]);
    const exceptionType = dispatchReasons.has(reason) ? 'ops_dispatch_required' : 'assignment_timeout';

    await this.client.from('order_exceptions').insert({
      exception_type: exceptionType,
      severity: 'high',
      status: 'open',
      order_id: delivery?.order_id,
      delivery_id: deliveryId,
      title: 'Delivery Assignment Failed',
      description: `Failed to assign driver. Reason: ${reason}. Attempts: ${delivery?.assignment_attempts_count ?? 0}`,
      recommended_actions: ['Manual assignment required', 'Contact nearby drivers', 'Consider order cancellation'],
      sla_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    await this.client.from('delivery_events').insert({
      delivery_id: deliveryId,
      event_type: 'ops_dispatch_required',
      event_data: {
        reason,
        attempts: delivery?.assignment_attempts_count ?? 0,
        timestamp: now,
      },
      actor_type: actor.role === 'system' ? 'system' : 'ops',
      actor_id: actor.userId !== 'system' ? actor.userId : undefined,
    });

    await this.client.from('system_alerts').insert({
      alert_type: 'dispatch_escalation',
      severity: 'error',
      title: 'Delivery Needs Manual Assignment',
      message: `Delivery ${deliveryId} requires manual assignment. Reason: ${reason}`,
      entity_type: 'delivery',
      entity_id: deliveryId,
    });

    await this.audit.log({
      action: 'status_change',
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      afterState: { escalated_to_ops: true, reason, attempts: delivery?.assignment_attempts_count ?? 0 },
    });

    this.events.emit('exception.created' as DomainEventType, 'delivery', deliveryId, { reason, escalated: true }, actor);
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private async verifyDriverOwnsAttempt(userId: string, attemptDriverId: string): Promise<boolean> {
    const { data: driver } = await this.client
      .from('drivers')
      .select('id')
      .eq('user_id', userId)
      .single();
    return Boolean(driver && driver.id === attemptDriverId);
  }

  private async loadSettings(serviceAreaId?: string | null): Promise<ServiceSettings> {
    const [settings, tuning] = await Promise.all([
      getPlatformSettings(this.client as unknown as Parameters<typeof getPlatformSettings>[0]),
      this.loadDispatchTuning(serviceAreaId),
    ]);
    return {
      dispatchRadiusKm: settings.dispatchRadiusKm,
      offerTimeoutSeconds:
        tuning?.offerTtlSeconds != null && tuning.offerTtlSeconds > 0
          ? tuning.offerTtlSeconds
          : settings.offerTimeoutSeconds,
      maxAssignmentAttempts:
        tuning?.maxOfferAttempts != null && tuning.maxOfferAttempts > 0
          ? tuning.maxOfferAttempts
          : settings.maxAssignmentAttempts,
    };
  }

  private async loadDispatchTuning(serviceAreaId?: string | null): Promise<{
    offerTtlSeconds: number | null;
    maxOfferAttempts: number | null;
  } | null> {
    let q = this.client
      .from('service_areas')
      .select('offer_ttl_seconds, max_offer_attempts')
      .eq('is_active', true);
    if (serviceAreaId) q = q.eq('id', serviceAreaId);
    const { data: rows, error } = await q.limit(1);
    if (error || !rows?.length) return null;
    const row = rows[0] as { offer_ttl_seconds: number | null; max_offer_attempts: number | null };
    return { offerTtlSeconds: row.offer_ttl_seconds, maxOfferAttempts: row.max_offer_attempts };
  }
}

// ==========================================
// FACTORY
// ==========================================

export function createOfferManagementService(
  client: SupabaseClient,
  events: DomainEventEmitter,
  audit: AuditLogger,
  sla: SLAManager,
  driverMatching: DriverMatchingService,
  eta?: EtaService
): OfferManagementService {
  return new OfferManagementService(client, events, audit, sla, driverMatching, eta);
}
