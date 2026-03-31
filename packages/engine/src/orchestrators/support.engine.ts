// ==========================================
// SUPPORT & EXCEPTION ENGINE
// Structured operational incident handling
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActorContext,
  OperationResult,
  Exception,
  ExceptionType,
  ExceptionSeverity,
  ExceptionStatus,
  DomainEventType,
} from '@ridendine/types';
import { DomainEventEmitter } from '../core/event-emitter';
import { AuditLogger } from '../core/audit-logger';

interface ExceptionInput {
  type: ExceptionType;
  severity: ExceptionSeverity;
  orderId?: string;
  customerId?: string;
  chefId?: string;
  driverId?: string;
  deliveryId?: string;
  title: string;
  description: string;
  recommendedActions?: string[];
  slaMinutes?: number;
}

interface ExceptionNote {
  id: string;
  exception_id: string;
  content: string;
  is_internal: boolean;
  created_by: string;
  created_at: string;
}

export class SupportExceptionEngine {
  private client: SupabaseClient;
  private eventEmitter: DomainEventEmitter;
  private auditLogger: AuditLogger;

  constructor(
    client: SupabaseClient,
    eventEmitter: DomainEventEmitter,
    auditLogger: AuditLogger
  ) {
    this.client = client;
    this.eventEmitter = eventEmitter;
    this.auditLogger = auditLogger;
  }

  /**
   * Create a new exception/incident
   */
  async createException(
    input: ExceptionInput,
    actor: ActorContext
  ): Promise<OperationResult<Exception>> {
    const slaDeadline = input.slaMinutes
      ? new Date(Date.now() + input.slaMinutes * 60 * 1000).toISOString()
      : null;

    const { data: exception, error } = await this.client
      .from('order_exceptions')
      .insert({
        exception_type: input.type,
        severity: input.severity,
        status: 'open',
        order_id: input.orderId,
        customer_id: input.customerId,
        chef_id: input.chefId,
        driver_id: input.driverId,
        delivery_id: input.deliveryId,
        title: input.title,
        description: input.description,
        recommended_actions: input.recommendedActions || [],
        sla_deadline: slaDeadline,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message },
      };
    }

    // Update order exception count if linked to order
    if (input.orderId) {
      await this.client.rpc('increment_order_exception_count', { order_id: input.orderId });
    }

    // Create system alert for high/critical severity
    if (['high', 'critical'].includes(input.severity)) {
      await this.client.from('system_alerts').insert({
        alert_type: `exception_${input.severity}`,
        severity: input.severity === 'critical' ? 'critical' : 'error',
        title: `${input.severity.toUpperCase()}: ${input.title}`,
        message: input.description,
        entity_type: 'order_exception',
        entity_id: exception.id,
      });
    }

    // Emit event
    this.eventEmitter.emit(
      'exception.created' as DomainEventType,
      'order_exception',
      exception.id,
      { type: input.type, severity: input.severity, orderId: input.orderId },
      actor
    );

    await this.auditLogger.log({
      action: 'create',
      entityType: 'order_exception',
      entityId: exception.id,
      actor,
      afterState: { type: input.type, severity: input.severity, status: 'open' },
    });

    await this.eventEmitter.flush();

    return { success: true, data: this.mapException(exception) };
  }

  /**
   * Acknowledge exception (ops starts looking at it)
   */
  async acknowledgeException(
    exceptionId: string,
    actor: ActorContext
  ): Promise<OperationResult<Exception>> {
    const { data: exception, error } = await this.client
      .from('order_exceptions')
      .update({
        status: 'acknowledged',
        assigned_to: actor.entityId || actor.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', exceptionId)
      .eq('status', 'open')
      .select()
      .single();

    if (error || !exception) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to acknowledge or already acknowledged' },
      };
    }

    await this.auditLogger.logStatusChange({
      entityType: 'order_exception',
      entityId: exceptionId,
      actor,
      previousStatus: 'open',
      newStatus: 'acknowledged',
    });

    return { success: true, data: this.mapException(exception) };
  }

  /**
   * Update exception status
   */
  async updateExceptionStatus(
    exceptionId: string,
    status: ExceptionStatus,
    notes?: string,
    actor?: ActorContext
  ): Promise<OperationResult<Exception>> {
    const { data: current } = await this.client
      .from('order_exceptions')
      .select('status')
      .eq('id', exceptionId)
      .single();

    if (!current) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exception not found' },
      };
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.internal_notes = notes;
    }

    const { data: exception, error } = await this.client
      .from('order_exceptions')
      .update(updateData)
      .eq('id', exceptionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    if (actor) {
      await this.auditLogger.logStatusChange({
        entityType: 'order_exception',
        entityId: exceptionId,
        actor,
        previousStatus: current.status,
        newStatus: status,
      });
    }

    return { success: true, data: this.mapException(exception) };
  }

  /**
   * Escalate exception
   */
  async escalateException(
    exceptionId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult<Exception>> {
    const now = new Date().toISOString();

    const { data: exception, error } = await this.client
      .from('order_exceptions')
      .update({
        status: 'escalated',
        severity: 'critical', // Escalation bumps to critical
        escalated_at: now,
        internal_notes: reason,
        updated_at: now,
      })
      .eq('id', exceptionId)
      .select()
      .single();

    if (error || !exception) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to escalate' },
      };
    }

    // Create system alert
    await this.client.from('system_alerts').insert({
      alert_type: 'exception_escalated',
      severity: 'critical',
      title: `ESCALATED: ${exception.title}`,
      message: `Escalation reason: ${reason}`,
      entity_type: 'order_exception',
      entity_id: exceptionId,
    });

    // Emit event
    this.eventEmitter.emit(
      'exception.escalated' as DomainEventType,
      'order_exception',
      exceptionId,
      { reason },
      actor
    );

    await this.auditLogger.log({
      action: 'status_change',
      entityType: 'order_exception',
      entityId: exceptionId,
      actor,
      beforeState: { status: 'in_progress' },
      afterState: { status: 'escalated', severity: 'critical' },
      reason,
    });

    await this.eventEmitter.flush();

    return { success: true, data: this.mapException(exception) };
  }

  /**
   * Resolve exception
   */
  async resolveException(
    exceptionId: string,
    resolution: string,
    linkedRefundId?: string,
    linkedPayoutAdjustmentId?: string,
    actor?: ActorContext
  ): Promise<OperationResult<Exception>> {
    const now = new Date().toISOString();

    const { data: exception, error } = await this.client
      .from('order_exceptions')
      .update({
        status: 'resolved',
        resolution,
        resolved_by: actor?.userId,
        resolved_at: now,
        linked_refund_id: linkedRefundId,
        linked_payout_adjustment_id: linkedPayoutAdjustmentId,
        updated_at: now,
      })
      .eq('id', exceptionId)
      .select()
      .single();

    if (error || !exception) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to resolve' },
      };
    }

    // Mark related alert as resolved
    await this.client
      .from('system_alerts')
      .update({ auto_resolved: true, resolved_at: now })
      .eq('entity_type', 'order_exception')
      .eq('entity_id', exceptionId);

    // Emit event
    if (actor) {
      this.eventEmitter.emit(
        'exception.resolved' as DomainEventType,
        'order_exception',
        exceptionId,
        { resolution },
        actor
      );

      await this.auditLogger.logStatusChange({
        entityType: 'order_exception',
        entityId: exceptionId,
        actor,
        previousStatus: exception.status,
        newStatus: 'resolved',
        metadata: { resolution },
      });

      await this.eventEmitter.flush();
    }

    return { success: true, data: this.mapException(exception) };
  }

  /**
   * Add note to exception
   */
  async addNote(
    exceptionId: string,
    content: string,
    isInternal: boolean,
    actor: ActorContext
  ): Promise<OperationResult<ExceptionNote>> {
    const { data: note, error } = await this.client
      .from('admin_notes')
      .insert({
        entity_type: 'order_exception',
        entity_id: exceptionId,
        content,
        is_internal: isInternal,
        created_by: actor.userId,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message },
      };
    }

    return {
      success: true,
      data: {
        id: note.id,
        exception_id: exceptionId,
        content: note.content,
        is_internal: note.is_internal,
        created_by: note.created_by,
        created_at: note.created_at,
      },
    };
  }

  /**
   * Get exception by ID
   */
  async getException(exceptionId: string): Promise<OperationResult<Exception>> {
    const { data, error } = await this.client
      .from('order_exceptions')
      .select(`
        *,
        orders (order_number, total, status),
        customers (first_name, last_name, email),
        chef_profiles (display_name),
        drivers (first_name, last_name),
        notes:admin_notes (*)
      `)
      .eq('id', exceptionId)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Exception not found' },
      };
    }

    return { success: true, data: this.mapException(data) };
  }

  /**
   * Get open exceptions queue
   */
  async getExceptionQueue(filters?: {
    status?: ExceptionStatus[];
    severity?: ExceptionSeverity[];
    type?: ExceptionType[];
    assignedTo?: string;
  }): Promise<Exception[]> {
    let query = this.client
      .from('order_exceptions')
      .select(`
        *,
        orders (order_number, total),
        customers (first_name, last_name)
      `)
      .order('created_at', { ascending: true });

    if (filters?.status) {
      query = query.in('status', filters.status);
    } else {
      query = query.in('status', ['open', 'acknowledged', 'in_progress', 'escalated']);
    }

    if (filters?.severity) {
      query = query.in('severity', filters.severity);
    }

    if (filters?.type) {
      query = query.in('exception_type', filters.type);
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    const { data, error } = await query;

    if (error || !data) return [];
    return data.map(this.mapException);
  }

  /**
   * Get exception counts by severity
   */
  async getExceptionCounts(): Promise<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    escalated: number;
  }> {
    const { data, error } = await this.client
      .from('order_exceptions')
      .select('severity, status')
      .in('status', ['open', 'acknowledged', 'in_progress', 'escalated']);

    if (error || !data) {
      return { critical: 0, high: 0, medium: 0, low: 0, total: 0, escalated: 0 };
    }

    return {
      critical: data.filter((e) => e.severity === 'critical').length,
      high: data.filter((e) => e.severity === 'high').length,
      medium: data.filter((e) => e.severity === 'medium').length,
      low: data.filter((e) => e.severity === 'low').length,
      total: data.length,
      escalated: data.filter((e) => e.status === 'escalated').length,
    };
  }

  /**
   * Get recommended actions for exception type
   */
  getRecommendedActions(type: ExceptionType): string[] {
    const actionMap: Record<string, string[]> = {
      chef_no_response: [
        'Contact chef directly',
        'Reassign to another chef',
        'Cancel and refund customer',
      ],
      chef_rejected_order: [
        'Contact customer with alternatives',
        'Suggest similar chefs',
        'Process full refund',
      ],
      item_sold_out_after_order: [
        'Contact customer for substitution',
        'Offer partial refund',
        'Cancel item and adjust order',
      ],
      prep_delay: [
        'Notify customer of delay',
        'Offer compensation',
        'Consider order cancellation if excessive',
      ],
      no_driver_available: [
        'Manual driver assignment',
        'Contact nearby drivers directly',
        'Extend search radius',
        'Consider order cancellation',
      ],
      driver_late_pickup: [
        'Contact driver for ETA',
        'Reassign if unresponsive',
        'Notify chef and customer',
      ],
      driver_late_dropoff: [
        'Contact driver for ETA',
        'Update customer with delay',
        'Consider compensation',
      ],
      pickup_issue: [
        'Contact chef to verify',
        'Contact driver for details',
        'Document with photos',
      ],
      damaged_order: [
        'Request photos from customer',
        'Process refund for damaged items',
        'Flag driver if recurring',
      ],
      missing_items: [
        'Verify with chef',
        'Process partial refund',
        'Create feedback for chef',
      ],
      customer_unreachable: [
        'Multiple contact attempts',
        'Leave order in safe location',
        'Return to chef if required',
      ],
      customer_dispute: [
        'Review order details',
        'Contact both parties',
        'Determine appropriate resolution',
      ],
      refund_request: [
        'Review order history',
        'Verify complaint validity',
        'Process appropriate refund amount',
      ],
      fraud_suspicion: [
        'Flag account for review',
        'Hold payout if applicable',
        'Escalate to management',
      ],
      payment_failed: [
        'Retry payment',
        'Contact customer for new payment method',
        'Cancel if payment cannot be resolved',
      ],
    };

    return actionMap[type] || ['Review situation', 'Contact relevant parties', 'Document findings'];
  }

  /**
   * Create exception from support ticket
   */
  async createFromSupportTicket(
    ticketId: string,
    exceptionType: ExceptionType,
    severity: ExceptionSeverity,
    actor: ActorContext
  ): Promise<OperationResult<Exception>> {
    // Get ticket details
    const { data: ticket, error: ticketError } = await this.client
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Support ticket not found' },
      };
    }

    return this.createException(
      {
        type: exceptionType,
        severity,
        orderId: ticket.order_id,
        customerId: ticket.customer_id,
        title: `Support Ticket: ${ticket.subject}`,
        description: ticket.message,
        recommendedActions: this.getRecommendedActions(exceptionType),
        slaMinutes: severity === 'critical' ? 15 : severity === 'high' ? 30 : 60,
      },
      actor
    );
  }

  /**
   * Get SLA status for exceptions
   */
  async getSLAStatus(): Promise<{
    onTrack: number;
    atRisk: number;
    breached: number;
  }> {
    const now = new Date();
    const { data, error } = await this.client
      .from('order_exceptions')
      .select('sla_deadline')
      .in('status', ['open', 'acknowledged', 'in_progress'])
      .not('sla_deadline', 'is', null);

    if (error || !data) {
      return { onTrack: 0, atRisk: 0, breached: 0 };
    }

    let onTrack = 0;
    let atRisk = 0;
    let breached = 0;

    for (const exception of data) {
      const deadline = new Date(exception.sla_deadline);
      const timeRemaining = deadline.getTime() - now.getTime();
      const fifteenMinutes = 15 * 60 * 1000;

      if (timeRemaining < 0) {
        breached++;
      } else if (timeRemaining < fifteenMinutes) {
        atRisk++;
      } else {
        onTrack++;
      }
    }

    return { onTrack, atRisk, breached };
  }

  private mapException(row: Record<string, unknown>): Exception {
    return {
      id: row.id as string,
      type: row.exception_type as ExceptionType,
      severity: row.severity as ExceptionSeverity,
      status: row.status as ExceptionStatus,
      orderId: row.order_id as string | undefined,
      customerId: row.customer_id as string | undefined,
      chefId: row.chef_id as string | undefined,
      driverId: row.driver_id as string | undefined,
      deliveryId: row.delivery_id as string | undefined,
      title: row.title as string,
      description: row.description as string,
      recommendedActions: row.recommended_actions as string[] | undefined,
      internalNotes: row.internal_notes as string | undefined,
      resolution: row.resolution as string | undefined,
      resolvedBy: row.resolved_by as string | undefined,
      resolvedAt: row.resolved_at as string | undefined,
      linkedRefundId: row.linked_refund_id as string | undefined,
      linkedPayoutAdjustmentId: row.linked_payout_adjustment_id as string | undefined,
      slaDeadline: row.sla_deadline as string | undefined,
      escalatedAt: row.escalated_at as string | undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

/**
 * Create support exception engine instance
 */
export function createSupportExceptionEngine(
  client: SupabaseClient,
  eventEmitter: DomainEventEmitter,
  auditLogger: AuditLogger
): SupportExceptionEngine {
  return new SupportExceptionEngine(client, eventEmitter, auditLogger);
}
