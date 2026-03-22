import type { SupabaseClient } from '@ridendine/db';

export type UserRole = 'customer' | 'chef' | 'driver' | 'ops_admin' | 'super_admin';

export interface UserRoles {
  isCustomer: boolean;
  isChef: boolean;
  isDriver: boolean;
  isOpsAdmin: boolean;
  isSuperAdmin: boolean;
  roles: UserRole[];
}

export async function getUserRoles(
  client: SupabaseClient,
  userId: string
): Promise<UserRoles> {
  const roles: UserRole[] = [];

  // Check customer
  const { data: customer } = await client
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (customer) {
    roles.push('customer');
  }

  // Check chef
  const { data: chef } = await client
    .from('chef_profiles')
    .select('id, status')
    .eq('user_id', userId)
    .single();

  if (chef && chef.status === 'approved') {
    roles.push('chef');
  }

  // Check driver
  const { data: driver } = await client
    .from('drivers')
    .select('id, status')
    .eq('user_id', userId)
    .single();

  if (driver && driver.status === 'approved') {
    roles.push('driver');
  }

  // Check platform user (ops/admin)
  // Note: This table may not exist in the generated types yet
  // Uncomment when platform_users table is created
  /*
  const { data: platformUser } = await client
    .from('platform_users')
    .select('id, role')
    .eq('user_id', userId)
    .single();

  if (platformUser) {
    roles.push(platformUser.role as UserRole);
  }
  */

  return {
    isCustomer: roles.includes('customer'),
    isChef: roles.includes('chef'),
    isDriver: roles.includes('driver'),
    isOpsAdmin: roles.includes('ops_admin'),
    isSuperAdmin: roles.includes('super_admin'),
    roles,
  };
}

export function hasRole(userRoles: UserRoles, role: UserRole): boolean {
  return userRoles.roles.includes(role);
}

export function hasAnyRole(userRoles: UserRoles, roles: UserRole[]): boolean {
  return roles.some((role) => userRoles.roles.includes(role));
}

export function isAdmin(userRoles: UserRoles): boolean {
  return userRoles.isOpsAdmin || userRoles.isSuperAdmin;
}
