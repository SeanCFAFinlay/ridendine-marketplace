// ==========================================
// SLA MANAGER
// Monitors and enforces service level agreements
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SLATimer, SLAType, SLAStatus, ActorContext } from '@ridendine/types';
import { SLA_DURATIONS } from '@ridendine/types';
import { DomainEventEmitter } from './event-emitter';
import { DomainEventType } from '@ridendine/types';

export class SLAManager {
  private client: SupabaseClient;
  private eventEmitter: DomainEventEmitter;

  constructor(client: SupabaseClient, eventEmitter: DomainEventEmitter) {
    this.client = client;
    this.eventEmitter = eventEmitter;
  }

  /**
   * Start a new SLA timer
   */
  async startTimer(params: {
    type: SLAType;
    entityType: string;
    entityId: string;
    customDurationMinutes?: number;
    metadata?: Record<string, unknown>;
  }): Promise<SLATimer | null> {
    const duration = SLA_DURATIONS[params.type];
    const durationMinutes = params.customDurationMinutes || duration.breach;
    const warningMinutes = params.customDurationMinutes
      ? Math.floor(params.customDurationMinutes * 0.7)
      : duration.warning;

    const now = new Date();
    const warningAt = new Date(now.getTime() + warningMinutes * 60 * 1000);
    const deadlineAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const timer: Partial<SLATimer> = {
      id: crypto.randomUUID(),
      type: params.type,
      status: 'active',
      entityType: params.entityType,
      entityId: params.entityId,
      startedAt: now.toISOString(),
      warningAt: warningAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      metadata: params.metadata,
    };

    const { data, error } = await this.client
      .from('sla_timers')
      .insert({
        id: timer.id,
        sla_type: timer.type,
        status: timer.status,
        entity_type: timer.entityType,
        entity_id: timer.entityId,
        started_at: timer.startedAt,
        warning_at: timer.warningAt,
        deadline_at: timer.deadlineAt,
        metadata: timer.metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create SLA timer:', error);
      return null;
    }

    return this.mapToTimer(data);
  }

  /**
   * Complete an SLA timer
   */
  async completeTimer(
    entityType: string,
    entityId: string,
    slaType: SLAType
  ): Promise<{ success: boolean; timer?: SLATimer; wasBreach?: boolean }> {
    const now = new Date().toISOString();

    // Find active timer
    const { data: existing, error: findError } = await this.client
      .from('sla_timers')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('sla_type', slaType)
      .eq('status', 'active')
      .single();

    if (findError || !existing) {
      return { success: false };
    }

    const wasBreach = new Date() > new Date(existing.deadline_at);
    const newStatus: SLAStatus = wasBreach ? 'breached' : 'completed';

    const { data, error } = await this.client
      .from('sla_timers')
      .update({
        status: newStatus,
        completed_at: now,
        breached_at: wasBreach ? now : null,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return { success: false };
    }

    return {
      success: true,
      timer: this.mapToTimer(data),
      wasBreach,
    };
  }

  /**
   * Cancel an SLA timer
   */
  async cancelTimer(
    entityType: string,
    entityId: string,
    slaType?: SLAType
  ): Promise<{ success: boolean }> {
    let query = this.client
      .from('sla_timers')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'active');

    if (slaType) {
      query = query.eq('sla_type', slaType);
    }

    const { error } = await query;
    return { success: !error };
  }

  /**
   * Check and process expired timers (called periodically)
   */
  async processExpiredTimers(actor: ActorContext): Promise<{
    warnings: SLATimer[];
    breaches: SLATimer[];
  }> {
    const now = new Date().toISOString();
    const warnings: SLATimer[] = [];
    const breaches: SLATimer[] = [];

    // Find timers that need warning
    const { data: warningTimers } = await this.client
      .from('sla_timers')
      .select('*')
      .eq('status', 'active')
      .lt('warning_at', now)
      .gt('deadline_at', now);

    if (warningTimers) {
      for (const timer of warningTimers) {
        const { error } = await this.client
          .from('sla_timers')
          .update({ status: 'warning', updated_at: now })
          .eq('id', timer.id);

        if (!error) {
          const mappedTimer = this.mapToTimer(timer);
          warnings.push(mappedTimer);

          // Emit warning event
          this.eventEmitter.emit(
            DomainEventType.SLA_WARNING,
            timer.entity_type,
            timer.entity_id,
            { slaType: timer.sla_type, deadlineAt: timer.deadline_at },
            actor
          );

          // Create system alert
          await this.createAlert(mappedTimer, 'warning');
        }
      }
    }

    // Find timers that have breached
    const { data: breachedTimers } = await this.client
      .from('sla_timers')
      .select('*')
      .in('status', ['active', 'warning'])
      .lt('deadline_at', now);

    if (breachedTimers) {
      for (const timer of breachedTimers) {
        const { error } = await this.client
          .from('sla_timers')
          .update({
            status: 'breached',
            breached_at: now,
            updated_at: now,
          })
          .eq('id', timer.id);

        if (!error) {
          const mappedTimer = this.mapToTimer(timer);
          breaches.push(mappedTimer);

          // Emit breach event
          this.eventEmitter.emit(
            DomainEventType.SLA_BREACHED,
            timer.entity_type,
            timer.entity_id,
            { slaType: timer.sla_type, deadlineAt: timer.deadline_at },
            actor
          );

          // Create system alert
          await this.createAlert(mappedTimer, 'breach');

          // Create exception for critical SLAs
          if (['chef_response', 'dispatch_assignment'].includes(timer.sla_type)) {
            await this.createException(mappedTimer);
          }
        }
      }
    }

    return { warnings, breaches };
  }

  /**
   * Get active SLA timers for an entity
   */
  async getActiveTimers(
    entityType: string,
    entityId: string
  ): Promise<SLATimer[]> {
    const { data, error } = await this.client
      .from('sla_timers')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .in('status', ['active', 'warning'])
      .order('deadline_at', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(this.mapToTimer);
  }

  /**
   * Get breached timers for dashboard
   */
  async getBreachedTimers(limit = 50): Promise<SLATimer[]> {
    const { data, error } = await this.client
      .from('sla_timers')
      .select('*')
      .eq('status', 'breached')
      .order('breached_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map(this.mapToTimer);
  }

  /**
   * Get SLA metrics for reporting
   */
  async getMetrics(params: {
    startDate: string;
    endDate: string;
    slaType?: SLAType;
  }): Promise<{
    total: number;
    completed: number;
    breached: number;
    breachRate: number;
    averageCompletionMinutes: number;
  }> {
    let query = this.client
      .from('sla_timers')
      .select('*')
      .gte('started_at', params.startDate)
      .lte('started_at', params.endDate)
      .in('status', ['completed', 'breached']);

    if (params.slaType) {
      query = query.eq('sla_type', params.slaType);
    }

    const { data, error } = await query;

    if (error || !data) {
      return {
        total: 0,
        completed: 0,
        breached: 0,
        breachRate: 0,
        averageCompletionMinutes: 0,
      };
    }

    const total = data.length;
    const completed = data.filter((t: { status: string }) => t.status === 'completed').length;
    const breached = data.filter((t: { status: string }) => t.status === 'breached').length;

    const completionTimes = data
      .filter((t: { completed_at?: string }) => t.completed_at)
      .map((t: { started_at: string; completed_at: string }) => {
        const start = new Date(t.started_at).getTime();
        const end = new Date(t.completed_at).getTime();
        return (end - start) / (1000 * 60); // Minutes
      });

    const averageCompletionMinutes =
      completionTimes.length > 0
        ? completionTimes.reduce((a: number, b: number) => a + b, 0) / completionTimes.length
        : 0;

    return {
      total,
      completed,
      breached,
      breachRate: total > 0 ? (breached / total) * 100 : 0,
      averageCompletionMinutes: Math.round(averageCompletionMinutes),
    };
  }

  private async createAlert(timer: SLATimer, alertType: 'warning' | 'breach'): Promise<void> {
    const severity = alertType === 'breach' ? 'error' : 'warning';
    const title = alertType === 'breach'
      ? `SLA Breached: ${timer.type}`
      : `SLA Warning: ${timer.type}`;

    await this.client.from('system_alerts').insert({
      alert_type: `sla_${alertType}`,
      severity,
      title,
      message: `${timer.type} SLA ${alertType} for ${timer.entityType} ${timer.entityId}`,
      entity_type: timer.entityType,
      entity_id: timer.entityId,
      metadata: { slaTimerId: timer.id, slaType: timer.type },
    });
  }

  private async createException(timer: SLATimer): Promise<void> {
    const exceptionType = timer.type === 'chef_response'
      ? 'chef_no_response'
      : timer.type === 'dispatch_assignment'
        ? 'no_driver_available'
        : 'system_error';

    await this.client.from('order_exceptions').insert({
      exception_type: exceptionType,
      severity: 'high',
      status: 'open',
      order_id: timer.entityType === 'order' ? timer.entityId : null,
      delivery_id: timer.entityType === 'delivery' ? timer.entityId : null,
      title: `SLA Breach: ${timer.type}`,
      description: `The ${timer.type} SLA has been breached. Immediate attention required.`,
      recommended_actions: ['Contact customer', 'Escalate to ops manager'],
      sla_deadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min to resolve
    });
  }

  private mapToTimer(row: Record<string, unknown>): SLATimer {
    return {
      id: row.id as string,
      type: row.sla_type as SLAType,
      status: row.status as SLAStatus,
      entityType: row.entity_type as string,
      entityId: row.entity_id as string,
      startedAt: row.started_at as string,
      warningAt: row.warning_at as string | undefined,
      deadlineAt: row.deadline_at as string,
      completedAt: row.completed_at as string | undefined,
      breachedAt: row.breached_at as string | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
    };
  }
}

/**
 * Create SLA manager instance
 */
export function createSLAManager(
  client: SupabaseClient,
  eventEmitter: DomainEventEmitter
): SLAManager {
  return new SLAManager(client, eventEmitter);
}
