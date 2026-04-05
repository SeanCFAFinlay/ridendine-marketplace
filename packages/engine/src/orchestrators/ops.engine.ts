import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActorContext,
  DeliveryInterventionDetail,
  DispatchCommandCenterReadModel,
  FinanceOperationsReadModel,
  OpsDashboardReadModel,
  OperationResult,
  PlatformRuleSet,
} from '@ridendine/types';
import {
  getDeliveryInterventionDetailReadModel,
  getDispatchCommandCenterReadModel,
  getFinanceOperationsReadModel,
  getOpsDashboardReadModel,
  getPlatformSettings,
  updatePlatformSettings,
} from '@ridendine/db';
import { DomainEventEmitter } from '../core/event-emitter';
import { AuditLogger } from '../core/audit-logger';
import type { DispatchEngine } from './dispatch.engine';
import type { SupportExceptionEngine } from './support.engine';
import type { CommerceLedgerEngine } from './commerce.engine';

function assertOpsRole(actor: ActorContext): OperationResult | null {
  if (!['ops_agent', 'ops_manager', 'finance_admin', 'super_admin'].includes(actor.role)) {
    return {
      success: false,
      error: { code: 'FORBIDDEN', message: 'Ops access required' },
    };
  }
  return null;
}

export class OpsControlEngine {
  constructor(
    private readonly client: SupabaseClient,
    private readonly eventEmitter: DomainEventEmitter,
    private readonly auditLogger: AuditLogger,
    private readonly dispatchEngine: DispatchEngine,
    private readonly supportEngine: SupportExceptionEngine,
    private readonly commerceEngine: CommerceLedgerEngine
  ) {}

  async getDashboard(): Promise<OpsDashboardReadModel> {
    return getOpsDashboardReadModel(this.client);
  }

  async getPlatformRules(): Promise<PlatformRuleSet> {
    return getPlatformSettings(this.client);
  }

  async updatePlatformRules(
    input: Omit<PlatformRuleSet, 'id' | 'updatedAt'> & { id?: string },
    actor: ActorContext
  ): Promise<OperationResult<PlatformRuleSet>> {
    if (!['ops_manager', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only ops managers can update platform rules' },
      };
    }

    const beforeState = await getPlatformSettings(this.client);
    const updated = await updatePlatformSettings(this.client, input, actor.userId);

    await this.auditLogger.log({
      action: 'update',
      entityType: 'platform_settings',
      entityId: updated.id,
      actor,
      beforeState: beforeState as unknown as Record<string, unknown>,
      afterState: updated as unknown as Record<string, unknown>,
      reason: 'Platform rules updated from ops-admin',
    });

    return { success: true, data: updated };
  }

  async getDispatchCommandCenter(): Promise<DispatchCommandCenterReadModel> {
    const rules = await getPlatformSettings(this.client);
    return getDispatchCommandCenterReadModel(this.client, rules);
  }

  async getDeliveryInterventionDetail(
    deliveryId: string
  ): Promise<DeliveryInterventionDetail | null> {
    return getDeliveryInterventionDetailReadModel(this.client, deliveryId);
  }

  async escalateDeliveryException(
    deliveryId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    const guard = assertOpsRole(actor);
    if (guard) return guard;

    const detail = await getDeliveryInterventionDetailReadModel(this.client, deliveryId);
    if (!detail) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Delivery not found' },
      };
    }

    const exception = await this.supportEngine.createException(
      {
        type: 'assignment_timeout',
        severity: 'high',
        orderId: detail.order.id,
        customerId: detail.customer?.id,
        driverId: detail.driver?.id,
        deliveryId,
        title: 'Ops dispatch escalation',
        description: reason,
        recommendedActions: ['Review assignment queue', 'Reassign driver', 'Contact customer'],
        slaMinutes: 15,
      },
      actor
    );

    if (!exception.success) return exception;

    await (this.client.from('deliveries') as any)
      .update({
        escalated_to_ops: true,
        escalated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    await this.auditLogger.log({
      action: 'status_change',
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      beforeState: { escalated_to_ops: false },
      afterState: { escalated_to_ops: true },
      reason,
    });

    await this.eventEmitter.flush();
    return { success: true, data: exception.data };
  }

  async acknowledgeException(
    exceptionId: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    const guard = assertOpsRole(actor);
    if (guard) return guard;
    return this.supportEngine.acknowledgeException(exceptionId, actor);
  }

  async addDeliveryOpsNote(
    deliveryId: string,
    note: string,
    actor: ActorContext
  ): Promise<OperationResult<{ id: string }>> {
    const guard = assertOpsRole(actor);
    if (guard) {
      return guard as OperationResult<{ id: string }>;
    }

    const { data, error } = await (this.client.from('admin_notes') as any)
      .insert({
        entity_type: 'delivery',
        entity_id: deliveryId,
        content: note,
        is_internal: true,
        created_by: actor.userId,
      })
      .select('id')
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message },
      };
    }

    await this.auditLogger.log({
      action: 'update',
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      afterState: { note },
      reason: 'Ops note added',
    });

    return { success: true, data };
  }

  async cancelDelivery(
    deliveryId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult> {
    const guard = assertOpsRole(actor);
    if (guard) return guard;

    const detail = await getDeliveryInterventionDetailReadModel(this.client, deliveryId);
    if (!detail) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Delivery not found' },
      };
    }

    await (this.client.from('deliveries') as any)
      .update({
        status: 'cancelled',
        delivery_notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    await (this.client.from('orders') as any)
      .update({
        status: 'cancelled',
        engine_status: 'cancelled',
        cancel_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', detail.order.id);

    if (detail.driver?.id) {
      await (this.client.from('driver_presence') as any)
        .update({
          status: 'online',
          updated_at: new Date().toISOString(),
        })
        .eq('driver_id', detail.driver.id);
    }

    await this.auditLogger.logOverride({
      action: 'delivery_cancelled_by_ops',
      entityType: 'delivery',
      entityId: deliveryId,
      actor,
      beforeState: { status: detail.status },
      afterState: { status: 'cancelled' },
      reason,
    });

    return { success: true, data: { deliveryId } };
  }

  async getFinanceOperations(
    actor: ActorContext,
    dateRange: { start: string; end: string }
  ): Promise<OperationResult<FinanceOperationsReadModel>> {
    if (!['ops_manager', 'finance_admin', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Finance access required' },
      };
    }

    const [rules, summary] = await Promise.all([
      getPlatformSettings(this.client),
      this.commerceEngine.getFinancialSummary(dateRange),
    ]);

    const model = await getFinanceOperationsReadModel(
      this.client,
      rules,
      dateRange,
      summary
    );

    return { success: true, data: model };
  }

  processExpiredOffers(actor: ActorContext): Promise<number> {
    return this.dispatchEngine.processExpiredOffers(actor);
  }
}

export function createOpsControlEngine(
  client: SupabaseClient,
  eventEmitter: DomainEventEmitter,
  auditLogger: AuditLogger,
  dispatchEngine: DispatchEngine,
  supportEngine: SupportExceptionEngine,
  commerceEngine: CommerceLedgerEngine
): OpsControlEngine {
  return new OpsControlEngine(
    client,
    eventEmitter,
    auditLogger,
    dispatchEngine,
    supportEngine,
    commerceEngine
  );
}
