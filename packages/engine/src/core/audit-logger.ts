// ==========================================
// AUDIT LOGGER
// Centralized audit logging for all operations
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, AuditEntry, AuditAction } from '@ridendine/types';

export class AuditLogger {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Log an audit entry
   */
  async log(params: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    actor: ActorContext;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEntry | null> {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actor: params.actor,
      beforeState: params.beforeState,
      afterState: params.afterState,
      reason: params.reason,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    const { error } = await this.client.from('audit_logs').insert({
      id: entry.id,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      old_data: entry.beforeState,
      new_data: entry.afterState,
      user_id: entry.actor.userId,
      actor_role: entry.actor.role,
      reason: entry.reason,
      metadata: entry.metadata,
      created_at: entry.timestamp,
    });

    if (error) {
      console.error('Failed to log audit entry:', error);
      return null;
    }

    return entry;
  }

  /**
   * Log a status change
   */
  async logStatusChange(params: {
    entityType: string;
    entityId: string;
    actor: ActorContext;
    previousStatus: string;
    newStatus: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEntry | null> {
    return this.log({
      action: 'status_change',
      entityType: params.entityType,
      entityId: params.entityId,
      actor: params.actor,
      beforeState: { status: params.previousStatus },
      afterState: { status: params.newStatus },
      reason: params.reason,
      metadata: params.metadata,
    });
  }

  /**
   * Log an ops override
   */
  async logOverride(params: {
    action: string;
    entityType: string;
    entityId: string;
    actor: ActorContext;
    beforeState: Record<string, unknown>;
    afterState: Record<string, unknown>;
    reason: string;
    approvedBy?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.client.from('ops_override_logs').insert({
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      before_state: params.beforeState,
      after_state: params.afterState,
      reason: params.reason,
      actor_user_id: params.actor.userId,
      actor_role: params.actor.role,
      approved_by: params.approvedBy,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Also log to regular audit log
    await this.log({
      action: 'override',
      entityType: params.entityType,
      entityId: params.entityId,
      actor: params.actor,
      beforeState: params.beforeState,
      afterState: params.afterState,
      reason: params.reason,
    });

    return { success: true };
  }

  /**
   * Get audit trail for an entity
   */
  async getAuditTrail(
    entityType: string,
    entityId: string,
    limit = 50
  ): Promise<AuditEntry[]> {
    const { data, error } = await this.client
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      action: row.action as AuditAction,
      entityType: row.entity_type,
      entityId: row.entity_id,
      actor: {
        userId: row.user_id,
        role: (row.actor_role ?? 'system') as ActorContext['role'],
      } satisfies ActorContext,
      beforeState: row.old_data,
      afterState: row.new_data,
      reason: row.reason ?? undefined,
      metadata: row.metadata ?? undefined,
      timestamp: row.created_at,
    }));
  }
}

/**
 * Create audit logger instance
 */
export function createAuditLogger(client: SupabaseClient): AuditLogger {
  return new AuditLogger(client);
}
