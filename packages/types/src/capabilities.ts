// ==========================================
// PLATFORM CAPABILITY CONSTANTS
// Single source of truth for all 24 platform API capabilities.
// Imported by packages/engine for the guard matrix.
// ==========================================

export const PLATFORM_CAPABILITIES = [
  'platform_settings',
  'finance_refunds_read',
  'finance_refunds_sensitive',
  'finance_refunds_request',
  'finance_payouts',
  'finance_engine',
  'finance_export_ledger',
  'ops_export_operational',
  'ops_orders_read',
  'ops_orders_write',
  'ops_entity_read',
  'order_override',
  'audit_timeline_read',
  'dispatch_read',
  'dispatch_write',
  'exceptions_read',
  'exceptions_write',
  'dashboard_read',
  'dashboard_actions',
  'analytics_read',
  'support_queue',
  'announcements',
  'promos',
  'team_list',
  'team_manage',
  'customers_read',
  'customers_write',
  'chefs_governance',
  'drivers_governance',
  'deliveries_read',
  'deliveries_write',
  'engine_rules',
  'engine_maintenance',
  'storefront_ops',
  'engine_health',
] as const;

export type PlatformCapability = (typeof PLATFORM_CAPABILITIES)[number];
