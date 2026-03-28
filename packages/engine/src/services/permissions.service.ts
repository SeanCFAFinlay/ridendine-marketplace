// ==========================================
// PERMISSIONS SERVICE - Role & Access Control
// ==========================================

import type { SupabaseClient } from '@ridendine/db';

// User roles
export type UserRole = 'customer' | 'chef' | 'driver' | 'ops_admin' | 'super_admin';

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY: UserRole[] = [
  'customer',
  'chef',
  'driver',
  'ops_admin',
  'super_admin',
];

export interface UserRoles {
  isCustomer: boolean;
  isChef: boolean;
  isDriver: boolean;
  isOpsAdmin: boolean;
  isSuperAdmin: boolean;
  roles: UserRole[];
  highestRole: UserRole | null;
}

// Get all roles for a user
export async function getUserRoles(
  client: SupabaseClient,
  userId: string
): Promise<UserRoles> {
  const roles: UserRole[] = [];

  // Check all role tables in parallel
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

  // Add roles based on results
  if (customerResult.data) {
    roles.push('customer');
  }

  if (chefResult.data?.status === 'approved') {
    roles.push('chef');
  }

  if (driverResult.data?.status === 'approved') {
    roles.push('driver');
  }

  if (platformResult.data?.role) {
    roles.push(platformResult.data.role as UserRole);
  }

  // Determine highest role
  let highestRole: UserRole | null = null;
  for (const role of ROLE_HIERARCHY.slice().reverse()) {
    if (roles.includes(role)) {
      highestRole = role;
      break;
    }
  }

  return {
    isCustomer: roles.includes('customer'),
    isChef: roles.includes('chef'),
    isDriver: roles.includes('driver'),
    isOpsAdmin: roles.includes('ops_admin'),
    isSuperAdmin: roles.includes('super_admin'),
    roles,
    highestRole,
  };
}

// Check if user has specific role
export function hasRole(userRoles: UserRoles, role: UserRole): boolean {
  return userRoles.roles.includes(role);
}

// Check if user has any of the specified roles
export function hasAnyRole(userRoles: UserRoles, roles: UserRole[]): boolean {
  return roles.some((role) => userRoles.roles.includes(role));
}

// Check if user is any type of admin
export function isAdmin(userRoles: UserRoles): boolean {
  return userRoles.isOpsAdmin || userRoles.isSuperAdmin;
}

// Check if user can access admin dashboard
export function canAccessAdminDashboard(userRoles: UserRoles): boolean {
  return isAdmin(userRoles);
}

// Check if user can manage orders
export function canManageOrders(userRoles: UserRoles): boolean {
  return isAdmin(userRoles) || userRoles.isChef;
}

// Check if user can manage chefs
export function canManageChefs(userRoles: UserRoles): boolean {
  return isAdmin(userRoles);
}

// Check if user can manage drivers
export function canManageDrivers(userRoles: UserRoles): boolean {
  return isAdmin(userRoles);
}

// Check if user can view financials
export function canViewFinancials(userRoles: UserRoles): boolean {
  return userRoles.isSuperAdmin;
}

// Check if user can process refunds
export function canProcessRefunds(userRoles: UserRoles): boolean {
  return isAdmin(userRoles);
}

// Check if user has permission for specific action
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
  customer: ['view_orders'],
  chef: ['view_orders', 'manage_orders'],
  driver: ['view_orders'],
  ops_admin: [
    'view_orders',
    'manage_orders',
    'view_chefs',
    'manage_chefs',
    'view_drivers',
    'manage_drivers',
    'view_customers',
    'manage_customers',
    'process_refunds',
  ],
  super_admin: [
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

export function hasPermission(
  userRoles: UserRoles,
  permission: Permission
): boolean {
  return userRoles.roles.some((role) =>
    ROLE_PERMISSIONS[role]?.includes(permission)
  );
}

// Create or update platform user
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
