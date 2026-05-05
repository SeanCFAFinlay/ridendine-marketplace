import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, OperationResult, RefundReason } from '@ridendine/types';
import type { OpsCommandInput } from '@ridendine/validation';
import type { AuditLogger } from '../core/audit-logger';

type GatewayDeps = {
  client?: SupabaseClient;
  audit?: AuditLogger;
  orders?: any;
  platform?: any;
  dispatch?: any;
  ops?: any;
  commerce?: any;
  support?: any;
  payoutAutomation?: any;
  sla?: any;
};

const DEFAULT_RULES = [
  {
    id: 'auto-suspend-chef-rejections',
    name: 'Auto-suspend chef after 3 rejections in 24h',
    enabled: false,
    trigger: 'order.rejected',
    condition: 'chef_rejections_24h >= 3',
    action: 'suspend_chef',
    params: { threshold: 3, windowHours: 24 },
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'auto-flag-high-value-orders',
    name: 'Flag orders over $200 for review',
    enabled: false,
    trigger: 'order.created',
    condition: 'order_total >= 20000',
    action: 'create_exception',
    params: { thresholdCents: 20000, severity: 'medium' },
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'auto-pause-overloaded-storefront',
    name: 'Auto-pause storefront at queue capacity',
    enabled: false,
    trigger: 'kitchen_queue.updated',
    condition: 'queue_size >= max_queue_size',
    action: 'pause_storefront',
    params: {},
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'auto-escalate-long-wait',
    name: 'Escalate orders waiting 45+ minutes',
    enabled: false,
    trigger: 'sla.check',
    condition: 'order_age_minutes >= 45 AND status IN (pending, accepted)',
    action: 'create_exception',
    params: { thresholdMinutes: 45, severity: 'high' },
    createdAt: new Date(0).toISOString(),
  },
  {
    id: 'auto-notify-low-driver-supply',
    name: 'Alert when online drivers < 3',
    enabled: false,
    trigger: 'driver.status_changed',
    condition: 'online_drivers < 3',
    action: 'create_system_alert',
    params: { threshold: 3, severity: 'warning' },
    createdAt: new Date(0).toISOString(),
  },
];

function ok<T>(data: T): OperationResult<T> {
  return { success: true, data };
}

function fail(code: string, message: string): OperationResult {
  return { success: false, error: { code, message } };
}

function normalizeServiceResult<T>(result: { ok: boolean; error?: string } & T): OperationResult<T> {
  if (!result.ok) return fail('COMMAND_FAILED', result.error || 'Operation failed') as OperationResult<T>;
  return ok(result);
}

function requireClient(client?: SupabaseClient): SupabaseClient | OperationResult {
  return client ?? fail('ENGINE_MISCONFIGURED', 'Operations command gateway is missing a database client');
}

export class OperationsCommandGateway {
  constructor(private readonly deps: GatewayDeps) {}

  async execute(command: OpsCommandInput, actor: ActorContext): Promise<OperationResult> {
    switch (command.action) {
      case 'request_refund':
        return this.deps.commerce.requestRefund(
          command.orderId,
          command.amountCents,
          command.reason as RefundReason,
          command.notes,
          actor
        );
      case 'approve_refund':
        return this.deps.commerce.approveRefund(command.refundCaseId, command.approvedAmountCents, actor);
      case 'deny_refund':
        return this.deps.commerce.denyRefund(command.refundCaseId, command.reason, actor);
      case 'process_refund':
        return this.deps.commerce.createStripeRefund(command.refundCaseId, actor);
      case 'create_payout_hold':
        return this.deps.commerce.createPayoutHold(
          command.payeeType,
          command.payeeId,
          command.orderId,
          command.amountCents,
          command.reason,
          actor
        );
      case 'release_payout_hold':
        return this.deps.commerce.releasePayoutHold(command.adjustmentId, actor);
      case 'schedule_chef_payout': {
        const result = await this.deps.payoutAutomation.scheduleChefPayout({
          chefId: command.chefId,
          storefrontId: command.storefrontId,
          amountCents: command.amountCents,
          actor,
        });
        if (result.error) return fail('COMMAND_FAILED', result.error);
        return ok(result);
      }
      case 'execute_chef_run': {
        const now = new Date();
        const periodEnd = command.periodEnd || now.toISOString();
        const periodStart =
          command.periodStart || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const result = await this.deps.payoutAutomation.executeChefRun({ periodStart, periodEnd, actor });
        return result.processed > 0 ? ok(result) : fail('COMMAND_FAILED', result.errors[0] || 'No payouts processed');
      }
      case 'execute_driver_run': {
        const now = new Date();
        const periodEnd = command.periodEnd || now.toISOString();
        const periodStart =
          command.periodStart || new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const result = await this.deps.payoutAutomation.executeDriverRun({ periodStart, periodEnd, actor });
        return result.processed > 0 ? ok(result) : fail('COMMAND_FAILED', result.errors[0] || 'No payouts processed');
      }
      case 'approve_bank_payout':
        return normalizeServiceResult(
          await this.deps.payoutAutomation.approveBankPayout({
            payeeType: command.payeeType,
            payoutId: command.payoutId,
            actor,
          })
        );
      case 'export_bank_batch': {
        const payoutIds = command.payoutIds ?? (command.payoutId ? [command.payoutId] : []);
        return normalizeServiceResult(
          await this.deps.payoutAutomation.exportBankPayoutBatch({
            payeeType: command.payeeType,
            payoutIds,
            actor,
            bankBatchId: command.bankBatchId,
          })
        );
      }
      case 'mark_bank_submitted':
        return normalizeServiceResult(
          await this.deps.payoutAutomation.markBankPayoutSubmitted({
            payeeType: command.payeeType,
            payoutId: command.payoutId,
            actor,
            bankReference: command.bankReference,
          })
        );
      case 'mark_bank_paid':
        return normalizeServiceResult(
          await this.deps.payoutAutomation.markBankPayoutPaid({
            payeeType: command.payeeType,
            payoutId: command.payoutId,
            actor,
            bankReference: command.bankReference,
          })
        );
      case 'reconcile_bank_payout':
        return normalizeServiceResult(
          await this.deps.payoutAutomation.reconcileBankPayout({
            payeeType: command.payeeType,
            payoutId: command.payoutId,
            actor,
            bankReference: command.bankReference,
          })
        );
      case 'manual_assign':
        return this.deps.dispatch.manualAssign(command.deliveryId, command.driverId, actor);
      case 'force_assign':
        return this.deps.dispatch.forceAssign(command.deliveryId, command.driverId, actor, command.reason);
      case 'reassign':
        return this.deps.dispatch.reassignDelivery(command.deliveryId, command.reason, actor);
      case 'retry_assignment':
        return this.deps.dispatch.findAndAssignDriver(command.deliveryId, actor);
      case 'escalate_exception':
        if ('deliveryId' in command) {
          return this.deps.ops.escalateDeliveryException(command.deliveryId, command.reason, actor);
        }
        return this.deps.support.escalateException(command.exceptionId, command.reason, actor);
      case 'cancel_delivery':
        return this.deps.ops.cancelDelivery(command.deliveryId, command.reason, actor);
      case 'acknowledge_issue':
        return this.deps.ops.acknowledgeException(command.exceptionId, actor);
      case 'add_ops_note':
        return this.deps.ops.addDeliveryOpsNote(command.deliveryId, command.note, actor);
      case 'create_exception':
        return this.deps.support.createException(
          {
            type: command.type,
            severity: command.severity,
            orderId: command.orderId,
            customerId: command.customerId,
            chefId: command.chefId,
            driverId: command.driverId,
            deliveryId: command.deliveryId,
            title: command.title,
            description: command.description,
            recommendedActions: command.recommendedActions,
            slaMinutes: command.slaMinutes,
          },
          actor
        );
      case 'create_exception_from_ticket':
        return this.deps.support.createFromSupportTicket(
          command.ticketId,
          command.exceptionType,
          command.severity,
          actor
        );
      case 'acknowledge_exception':
        return this.deps.support.acknowledgeException(command.exceptionId, actor);
      case 'update_exception_status':
        return this.deps.support.updateExceptionStatus(command.exceptionId, command.status, command.notes, actor);
      case 'resolve_exception':
        return this.deps.support.resolveException(
          command.exceptionId,
          command.resolution,
          command.linkedRefundId,
          command.linkedPayoutAdjustmentId,
          actor
        );
      case 'add_exception_note':
        return this.deps.support.addNote(command.exceptionId, command.content, command.isInternal, actor);
      case 'accept_order':
        return this.deps.orders.acceptOrder(command.orderId, command.estimatedPrepMinutes, actor);
      case 'reject_order':
        return this.deps.orders.rejectOrder(command.orderId, command.reason, command.notes, actor);
      case 'start_preparing_order':
        return this.deps.orders.startPreparing(command.orderId, actor);
      case 'mark_order_ready':
        return this.deps.platform.markOrderReady(command.orderId, actor);
      case 'cancel_order':
        return this.deps.orders.cancelOrder(command.orderId, command.reason, command.notes, actor);
      case 'complete_order':
        return this.deps.orders.completeOrder(command.orderId, actor);
      case 'override_order_status':
        return this.deps.orders.opsOverride(command.orderId, command.targetStatus, command.reason, actor);
      case 'acknowledge_alert':
        return this.acknowledgeAlert(command.alertId, actor);
      case 'process_expired_offers': {
        const processedCount = await this.deps.dispatch.processExpiredOffers(actor);
        return ok({ processedCount });
      }
      case 'process_sla_timers': {
        const { warnings, breaches } = await this.deps.sla.processExpiredTimers(actor);
        return ok({ warningsCount: warnings.length, breachesCount: breaches.length });
      }
      case 'activate_maintenance':
        return this.activateMaintenance(command.message, actor);
      case 'deactivate_maintenance':
        return this.deactivateMaintenance(actor);
      case 'update_automation_rule':
        return this.updateAutomationRule(command.ruleId, command.enabled, command.params, actor);
      default:
        return fail('INVALID_ACTION', 'Unknown operations command');
    }
  }

  private async acknowledgeAlert(alertId: string, actor: ActorContext): Promise<OperationResult> {
    const client = requireClient(this.deps.client);
    if ('success' in client) return client;

    const { error } = await (client.from('system_alerts') as any)
      .update({
        acknowledged: true,
        acknowledged_by: actor.userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);
    if (error) return fail('UPDATE_FAILED', error.message);
    await this.deps.audit?.log({
      action: 'update',
      entityType: 'system_alert',
      entityId: alertId,
      actor,
      afterState: { acknowledged: true },
      reason: 'Ops alert acknowledged',
    });
    return ok({ acknowledged: true });
  }

  private async activateMaintenance(message: string | undefined, actor: ActorContext): Promise<OperationResult> {
    const client = requireClient(this.deps.client);
    if ('success' in client) return client;

    const maintenanceMessage = message || 'Platform is under maintenance';
    const now = new Date().toISOString();
    const { data: activeStorefronts } = await (client.from('chef_storefronts') as any)
      .select('id')
      .eq('is_active', true)
      .eq('is_paused', false);

    for (const sf of activeStorefronts || []) {
      await (client.from('chef_storefronts') as any)
        .update({
          is_paused: true,
          paused_reason: `Maintenance mode: ${maintenanceMessage}`,
          paused_at: now,
          paused_by: actor.userId,
        })
        .eq('id', sf.id);
    }

    const pausedIds = (activeStorefronts || []).map((s: { id: string }) => s.id);
    await (client.from('platform_settings') as any)
      .update({
        setting_value: {
          maintenance_mode: true,
          maintenance_message: maintenanceMessage,
          maintenance_activated_at: now,
          maintenance_activated_by: actor.userId,
          paused_storefront_ids: pausedIds,
        },
      })
      .not('id', 'is', null);

    await (client.from('system_alerts') as any).insert({
      alert_type: 'maintenance_mode',
      severity: 'warning',
      title: 'Maintenance Mode Activated',
      message: `Platform maintenance activated by ops. ${pausedIds.length} storefronts paused.`,
      metadata: { activatedBy: actor.userId, storefrontsPaused: pausedIds.length },
    });

    await this.deps.audit?.log({
      action: 'status_change',
      entityType: 'platform',
      entityId: 'maintenance',
      actor,
      afterState: { maintenanceMode: true, storefrontsPaused: pausedIds.length },
      reason: maintenanceMessage,
    });

    return ok({ storefrontsPaused: pausedIds.length });
  }

  private async deactivateMaintenance(actor: ActorContext): Promise<OperationResult> {
    const client = requireClient(this.deps.client);
    if ('success' in client) return client;

    const { data: settings } = await (client.from('platform_settings') as any)
      .select('setting_value')
      .limit(1)
      .single();
    const pausedIds = settings?.setting_value?.paused_storefront_ids || [];
    let restored = 0;

    for (const id of pausedIds) {
      const { data: sf } = await (client.from('chef_storefronts') as any)
        .select('id, paused_reason')
        .eq('id', id)
        .single();

      if (sf?.paused_reason?.startsWith('Maintenance mode:')) {
        await (client.from('chef_storefronts') as any)
          .update({
            is_paused: false,
            paused_reason: null,
            paused_at: null,
            paused_by: null,
          })
          .eq('id', id);
        restored++;
      }
    }

    await (client.from('platform_settings') as any)
      .update({ setting_value: { maintenance_mode: false } })
      .not('id', 'is', null);

    await (client.from('system_alerts') as any).insert({
      alert_type: 'maintenance_mode',
      severity: 'info',
      title: 'Maintenance Mode Deactivated',
      message: `Platform maintenance ended. ${restored} storefronts restored.`,
    });

    await this.deps.audit?.log({
      action: 'status_change',
      entityType: 'platform',
      entityId: 'maintenance',
      actor,
      afterState: { maintenanceMode: false, storefrontsRestored: restored },
      reason: 'Maintenance mode deactivated',
    });

    return ok({ storefrontsRestored: restored });
  }

  private async updateAutomationRule(
    ruleId: string,
    enabled: boolean | undefined,
    params: Record<string, unknown> | undefined,
    actor: ActorContext
  ): Promise<OperationResult> {
    const client = requireClient(this.deps.client);
    if ('success' in client) return client;

    const { data: settings } = await (client.from('platform_settings') as any)
      .select('setting_value')
      .limit(1)
      .single();
    const currentRules = settings?.setting_value?.automation_rules || DEFAULT_RULES;
    const ruleIndex = currentRules.findIndex((rule: { id: string }) => rule.id === ruleId);
    if (ruleIndex === -1) return fail('NOT_FOUND', 'Rule not found');

    const nextRules = [...currentRules];
    const before = { ...nextRules[ruleIndex] };
    nextRules[ruleIndex] = {
      ...nextRules[ruleIndex],
      ...(enabled !== undefined ? { enabled } : {}),
      ...(params !== undefined ? { params: { ...nextRules[ruleIndex].params, ...params } } : {}),
    };

    const { error } = await (client.from('platform_settings') as any)
      .update({
        setting_value: { ...settings?.setting_value, automation_rules: nextRules },
      })
      .not('id', 'is', null);
    if (error) return fail('UPDATE_FAILED', error.message);

    await this.deps.audit?.log({
      action: 'update',
      entityType: 'automation_rule',
      entityId: ruleId,
      actor,
      beforeState: before,
      afterState: nextRules[ruleIndex],
      reason: 'Automation rule updated from ops-admin',
    });

    return ok(nextRules[ruleIndex]);
  }
}

export function createOperationsCommandGateway(deps: GatewayDeps): OperationsCommandGateway {
  return new OperationsCommandGateway(deps);
}
