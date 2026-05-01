// ==========================================
// PERMISSIONS SERVICE - Role & Access Control
// ==========================================

import type { SupabaseClient } from '@ridendine/db';
import { AppRole, normalizePlatformRole } from '@ridendine/types';

export type UserRole = (typeof AppRole)[keyof typeof AppRole];

// Role hierarchy (higher index = more permissions) — used for highestRole display only
const ROLE_HIERARCHY: UserRole[] = [
  AppRole.CUSTOMER,
  AppRole.SUPPORT_AGENT,
  AppRole.CHEF,
  AppRole.DRIVER,
  AppRole.OPS_AGENT,
  AppRole.FINANCE_ADMIN,
  AppRole.FINANCE_MANAGER,
  AppRole.OPS_ADMIN,
  AppRole.OPS_MANAGER,
  AppRole.SUPER_ADMIN,
];

export interface UserRoles {
  isCustomer: boolean;
  isChef: boolean;
  isDriver: boolean;
  isOpsAdmin: boolean;
  isSuperAdmin: boolean;
  isSupportAgent: boolean;
  isFinanceRole: boolean;
  roles: UserRole[];
  highestRole: UserRole | null;
}

// Get all roles for a user
export async function getUserRoles(
  client: SupabaseClient,
  userId: string
): Promise<UserRoles> {
  const roles: UserRole[] = [];

  const [customerResult, chefResult, driverResult, platformResult] =
    await Promise.all([
      client.from('customers').select('id').eq('user_id', userId).single(),
      client
        .from('chef_profiles')
        .select('id, status')
        .eq('user_id', userId)
        .single(),
      client
        .from('drivers')
        .select('id, status')
        .eq('user_id', userId)
        .single(),
      client
        .from('platform_users')
        .select('id, role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single(),
    ]);

  if (customerResult.data) {
    roles.push(AppRole.CUSTOMER);
  }

  if (chefResult.data?.status === 'approved') {
    roles.push(AppRole.CHEF);
  }

  if (driverResult.data?.status === 'approved') {
    roles.push(AppRole.DRIVER);
  }

  if (platformResult.data?.role) {
    const normalized = normalizePlatformRole(platformResult.data.role as string);
    if (normalized) {
      roles.push(normalized);
    }
  }

  let highestRole: UserRole | null = null;
  for (const role of ROLE_HIERARCHY.slice().reverse()) {
    if (roles.includes(role)) {
      highestRole = role;
      break;
    }
  }

  return {
    isCustomer: roles.includes(AppRole.CUSTOMER),
    isChef: roles.includes(AppRole.CHEF),
    isDriver: roles.includes(AppRole.DRIVER),
    isOpsAdmin: roles.includes(AppRole.OPS_ADMIN),
    isSuperAdmin: roles.includes(AppRole.SUPER_ADMIN),
    isSupportAgent: roles.includes(AppRole.SUPPORT_AGENT),
    isFinanceRole:
      roles.includes(AppRole.FINANCE_ADMIN) ||
      roles.includes(AppRole.FINANCE_MANAGER) ||
      roles.includes(AppRole.SUPER_ADMIN),
    roles,
    highestRole,
  };
}

export function hasRole(userRoles: UserRoles, role: UserRole): boolean {
  return userRoles.roles.includes(role);
}

export function hasAnyRole(userRoles: UserRoles, checkRoles: UserRole[]): boolean {
  return checkRoles.some((role) => userRoles.roles.includes(role));
}

const OPS_STAFF_ROLES = new Set<UserRole>([
  AppRole.OPS_ADMIN,
  AppRole.OPS_AGENT,
  AppRole.OPS_MANAGER,
  AppRole.FINANCE_ADMIN,
  AppRole.FINANCE_MANAGER,
  AppRole.SUPER_ADMIN,
  AppRole.SUPPORT_AGENT,
] as UserRole[]);

export function isAdmin(userRoles: UserRoles): boolean {
  return userRoles.roles.some((r) => OPS_STAFF_ROLES.has(r));
}

export function canAccessAdminDashboard(userRoles: UserRoles): boolean {
  return isAdmin(userRoles);
}

export function canManageOrders(userRoles: UserRoles): boolean {
  return isAdmin(userRoles) || userRoles.isChef;
}

const GOVERN_CHEF_ROLES = new Set<UserRole>(
  [AppRole.OPS_ADMIN, AppRole.OPS_MANAGER, AppRole.SUPER_ADMIN] as UserRole[]
);

export function canManageChefs(userRoles: UserRoles): boolean {
  return userRoles.roles.some((r) => GOVERN_CHEF_ROLES.has(r));
}

export function canManageDrivers(userRoles: UserRoles): boolean {
  return canManageChefs(userRoles);
}

export function canViewFinancials(userRoles: UserRoles): boolean {
  return userRoles.isFinanceRole;
}

const FINANCE_REFUND_ROLES = new Set<UserRole>(
  [AppRole.FINANCE_ADMIN, AppRole.FINANCE_MANAGER, AppRole.SUPER_ADMIN] as UserRole[]
);

export function canProcessRefunds(userRoles: UserRoles): boolean {
  return userRoles.roles.some((r) => FINANCE_REFUND_ROLES.has(r));
}

export type Permission =
  | 'view_orders'
  | 'manage_orders'
  | 'view_chefs'
  | 'manage_chefs'
  | 'view_drivers'
  | 'manage_drivers'
  | 'view_customers'
  | 'manage_customers'
  | 'view_financials'
  | 'process_refunds'
  | 'manage_platform';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [AppRole.CUSTOMER]: ['view_orders'],
  [AppRole.CHEF]: ['view_orders', 'manage_orders'],
  [AppRole.DRIVER]: ['view_orders'],
  [AppRole.OPS_AGENT]: [
    'view_orders',
    'manage_orders',
    'view_chefs',
    'manage_chefs',
    'view_drivers',
    'manage_drivers',
    'view_customers',
    'manage_customers',
  ],
  [AppRole.OPS_ADMIN]: [
    'view_orders',
    'manage_orders',
    'view_chefs',
    'manage_chefs',
    'view_drivers',
    'manage_drivers',
    'view_customers',
    'manage_customers',
  ],
  [AppRole.OPS_MANAGER]: [
    'view_orders',
    'manage_orders',
    'view_chefs',
    'manage_chefs',
    'view_drivers',
    'manage_drivers',
    'view_customers',
    'manage_customers',
  ],
  [AppRole.FINANCE_ADMIN]: [
    'view_orders',
    'view_financials',
    'process_refunds',
    'view_customers',
  ],
  [AppRole.FINANCE_MANAGER]: [
    'view_orders',
    'view_financials',
    'process_refunds',
    'view_customers',
  ],
  [AppRole.SUPPORT_AGENT]: ['view_orders', 'view_customers', 'view_chefs', 'view_drivers'],
  [AppRole.SUPPORT]: ['view_orders', 'view_customers', 'view_chefs', 'view_drivers'],
  [AppRole.SUPER_ADMIN]: [
    'view_orders',
    'manage_orders',
    'view_chefs',
    'manage_chefs',
    'view_drivers',
    'manage_drivers',
    'view_customers',
    'manage_customers',
    'view_financials',
    'process_refunds',
    'manage_platform',
  ],
};

export function hasPermission(userRoles: UserRoles, permission: Permission): boolean {
  return userRoles.roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export async function upsertPlatformUser(
  client: SupabaseClient,
  userId: string,
  role: UserRole,
  isActive: boolean = true
): Promise<{ success: boolean; error?: string }> {
  const { error } = await client.from('platform_users').upsert(
    {
      user_id: userId,
      role,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
