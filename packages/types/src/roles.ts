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
  SUPER_ADMIN: 'super_admin',
  SUPPORT: 'support',
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];

/** All platform-level (ops/admin) roles */
export const PLATFORM_ROLES: AppRole[] = [
  AppRole.OPS_ADMIN,
  AppRole.OPS_AGENT,
  AppRole.OPS_MANAGER,
  AppRole.FINANCE_ADMIN,
  AppRole.SUPER_ADMIN,
  AppRole.SUPPORT,
];

/** Roles that can access the ops-admin dashboard */
export const OPS_DASHBOARD_ROLES: AppRole[] = [
  AppRole.OPS_ADMIN,
  AppRole.OPS_AGENT,
  AppRole.OPS_MANAGER,
  AppRole.FINANCE_ADMIN,
  AppRole.SUPER_ADMIN,
];

/** Roles that can perform financial operations */
export const FINANCE_ROLES: AppRole[] = [
  AppRole.OPS_MANAGER,
  AppRole.FINANCE_ADMIN,
  AppRole.SUPER_ADMIN,
];

/** Roles that can govern chefs/drivers/storefronts */
export const GOVERNANCE_ROLES: AppRole[] = [
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
