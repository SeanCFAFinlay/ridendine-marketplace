// ==========================================
// UNIFIED ROLE DEFINITIONS
// Single source of truth for all role types across the platform.
// ==========================================

/**
 * Application-level roles — the identity of a user on the platform.
 * A user may have multiple app roles (e.g., customer + chef).
 */
export const AppRole = {
  CUSTOMER: 'customer',
  CHEF: 'chef',
  DRIVER: 'driver',
  OPS_ADMIN: 'ops_admin',
  OPS_AGENT: 'ops_agent',
  OPS_MANAGER: 'ops_manager',
  FINANCE_ADMIN: 'finance_admin',
  FINANCE_MANAGER: 'finance_manager',
  SUPER_ADMIN: 'super_admin',
  /** Legacy DB value `support` — normalized to SUPPORT_AGENT at read boundaries */
  SUPPORT: 'support',
  SUPPORT_AGENT: 'support_agent',
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];

/** All platform-level (ops/admin) roles stored in `platform_users.role` or normalized equivalents */
export const PLATFORM_ROLES: AppRole[] = [
  AppRole.OPS_ADMIN,
  AppRole.OPS_AGENT,
  AppRole.OPS_MANAGER,
  AppRole.FINANCE_ADMIN,
  AppRole.FINANCE_MANAGER,
  AppRole.SUPER_ADMIN,
  AppRole.SUPPORT,
  AppRole.SUPPORT_AGENT,
];

/** Roles that can access the ops-admin dashboard shell (session + platform row) */
export const OPS_DASHBOARD_ROLES: AppRole[] = [
  AppRole.OPS_ADMIN,
  AppRole.OPS_AGENT,
  AppRole.OPS_MANAGER,
  AppRole.FINANCE_ADMIN,
  AppRole.FINANCE_MANAGER,
  AppRole.SUPER_ADMIN,
  AppRole.SUPPORT_AGENT,
];

/** Roles that can perform financial operations (exports, payouts, refunds) */
export const FINANCE_ROLES: AppRole[] = [
  AppRole.FINANCE_ADMIN,
  AppRole.FINANCE_MANAGER,
  AppRole.SUPER_ADMIN,
];

/** Roles that can govern chefs/drivers/storefronts */
export const GOVERNANCE_ROLES: AppRole[] = [
  AppRole.OPS_ADMIN,
  AppRole.OPS_MANAGER,
  AppRole.SUPER_ADMIN,
];

/**
 * Check if a role is a platform/admin role
 */
export function isPlatformRole(role: string): boolean {
  return PLATFORM_ROLES.includes(role as AppRole);
}

/**
 * Check if a role can access financial operations
 */
export function isFinanceRole(role: string): boolean {
  return FINANCE_ROLES.includes(role as AppRole);
}

/**
 * Check if a role can perform governance actions
 */
export function isGovernanceRole(role: string): boolean {
  return GOVERNANCE_ROLES.includes(role as AppRole);
}

/** Map raw `platform_users.role` to canonical AppRole for UI / permissions helpers */
export function normalizePlatformRole(dbRole: string): AppRole | null {
  const map: Record<string, AppRole> = {
    ops_admin: AppRole.OPS_ADMIN,
    ops_agent: AppRole.OPS_AGENT,
    ops_manager: AppRole.OPS_MANAGER,
    finance_admin: AppRole.FINANCE_ADMIN,
    finance_manager: AppRole.FINANCE_MANAGER,
    super_admin: AppRole.SUPER_ADMIN,
    support: AppRole.SUPPORT_AGENT,
    support_agent: AppRole.SUPPORT_AGENT,
  };
  return map[dbRole] ?? null;
}
