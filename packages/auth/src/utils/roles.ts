import type { SupabaseClient } from '@ridendine/db';
import { type AppRole, isPlatformRole } from '@ridendine/types';

// Re-export AppRole as UserRole for backwards compatibility
export type UserRole = AppRole;

export interface UserRoles {
  isCustomer: boolean;
  isChef: boolean;
  isDriver: boolean;
  isOpsAdmin: boolean;
  isSuperAdmin: boolean;
  roles: AppRole[];
}

export async function getUserRoles(
  client: SupabaseClient,
  userId: string
): Promise<UserRoles> {
  const roles: AppRole[] = [];

  const { data: customer } = await client
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .single();
  if (customer) roles.push('customer');

  const { data: chef } = await client
    .from('chef_profiles')
    .select('id, status')
    .eq('user_id', userId)
    .single();
  if (chef && chef.status === 'approved') roles.push('chef');

  const { data: driver } = await client
    .from('drivers')
    .select('id, status')
    .eq('user_id', userId)
    .single();
  if (driver && driver.status === 'approved') roles.push('driver');

  try {
    const { data: platformUser } = await client
      .from('platform_users')
      .select('id, role, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    if (platformUser && platformUser.role) {
      roles.push(platformUser.role as AppRole);
    }
  } catch {
    // not an admin
  }

  return {
    isCustomer: roles.includes('customer'),
    isChef: roles.includes('chef'),
    isDriver: roles.includes('driver'),
    isOpsAdmin: roles.includes('ops_admin'),
    isSuperAdmin: roles.includes('super_admin'),
    roles,
  };
}

export function hasRole(userRoles: UserRoles, role: AppRole): boolean {
  return userRoles.roles.includes(role);
}

export function hasAnyRole(userRoles: UserRoles, roles: AppRole[]): boolean {
  return roles.some((role) => userRoles.roles.includes(role));
}

export function isAdmin(userRoles: UserRoles): boolean {
  return userRoles.roles.some(isPlatformRole);
}
