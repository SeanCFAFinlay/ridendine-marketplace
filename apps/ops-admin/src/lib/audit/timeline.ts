/**
 * Finance + Stripe audit timeline labels (Phase 6).
 * Maps `audit_logs` / engine actions to human-readable timeline entries for ops dashboards.
 */

export const FINANCE_AUDIT_ENTITY_TYPES = [
  'payout_run',
  'instant_payout_request',
  'stripe_payout',
  'chef_payout_blocked',
  'chef_payout_stripe_error',
  'chef_payout_reversal_failed',
  'chef_payout_row_failed',
  'driver_payout_blocked',
  'driver_payout_stripe_error',
  'driver_payout_reversal_failed',
  'driver_payout_row_failed',
  'instant_payout_blocked',
  'instant_payout_stripe_error',
  'instant_payout_ledger_critical',
  'stripe_finance_webhook_error',
] as const;

export type FinanceAuditEntityType = (typeof FINANCE_AUDIT_ENTITY_TYPES)[number];

export function isFinanceAuditEntity(entityType: string): entityType is FinanceAuditEntityType {
  return (FINANCE_AUDIT_ENTITY_TYPES as readonly string[]).includes(entityType);
}

export function financeAuditTimelineTitle(entityType: string, action: string): string {
  if (entityType === 'payout_run' && action === 'payout') return 'Payout run executed';
  if (entityType === 'instant_payout_request' && action === 'payout') return 'Instant payout';
  if (entityType === 'stripe_payout') return 'Stripe payout lifecycle';
  if (entityType.startsWith('chef_payout')) return 'Chef payout (Stripe / ledger)';
  if (entityType.startsWith('driver_payout')) return 'Driver batch payout (Stripe / ledger)';
  if (entityType.startsWith('instant_payout')) return 'Instant payout (Stripe / ledger)';
  if (entityType === 'stripe_finance_webhook_error') return 'Stripe finance webhook error';
  if (entityType === 'stripe_reconciliation') return 'Reconciliation';
  return `${entityType} · ${action}`;
}
