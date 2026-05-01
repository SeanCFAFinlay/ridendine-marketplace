// ==========================================
// ENGINE SERVER HELPERS
// Shared server-side context utilities for all apps
// Requires next/headers - must be imported from server components/routes only
// ==========================================

import { createServerClient, createAdminClient } from '@ridendine/db';
import { createCentralEngine, type CentralEngine } from './index';
import type { ActorContext, ActorRole } from '@ridendine/types';
import { cookies } from 'next/headers';

let engineInstance: CentralEngine | null = null;

export function getEngine(): CentralEngine {
  if (!engineInstance) {
    const client = createAdminClient();
    engineInstance = createCentralEngine(client);
  }
  return engineInstance;
}

export function getSystemActor(): ActorContext {
  return { userId: 'system', role: 'system' };
}

export function hasRequiredRole(actor: ActorContext, requiredRoles: ActorRole[]): boolean {
  return requiredRoles.includes(actor.role);
}

// -- Customer context --

export async function getCustomerActorContext(): Promise<{ actor: ActorContext; customerId: string } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: customer } = await adminClient
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!customer) return null;

  return {
    actor: { userId: user.id, role: 'customer', entityId: customer.id },
    customerId: customer.id,
  };
}

// -- Chef context --

export async function getChefActorContext(): Promise<{ actor: ActorContext; chefId: string; storefrontId: string } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: chefProfile } = await adminClient
    .from('chef_profiles')
    .select('id, status')
    .eq('user_id', user.id)
    .single();
  if (!chefProfile) return null;

  const { data: storefront } = await adminClient
    .from('chef_storefronts')
    .select('id')
    .eq('chef_id', chefProfile.id)
    .single();
  if (!storefront) return null;

  return {
    actor: { userId: user.id, role: 'chef_user', entityId: chefProfile.id },
    chefId: chefProfile.id,
    storefrontId: storefront.id,
  };
}

export async function getChefBasicContext(): Promise<{ userId: string; chefId: string; chefStatus: string; storefrontId: string | null } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: chefProfile } = await adminClient
    .from('chef_profiles')
    .select('id, status')
    .eq('user_id', user.id)
    .single();
  if (!chefProfile) return null;

  const { data: storefront } = await adminClient
    .from('chef_storefronts')
    .select('id')
    .eq('chef_id', chefProfile.id)
    .single();

  return {
    userId: user.id,
    chefId: chefProfile.id,
    chefStatus: chefProfile.status,
    storefrontId: storefront?.id || null,
  };
}

// -- Driver context --

export async function getDriverActorContext(): Promise<{ actor: ActorContext; driverId: string } | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: driver } = await adminClient
    .from('drivers')
    .select('id, status')
    .eq('user_id', user.id)
    .single();
  if (!driver || driver.status !== 'approved') return null;

  return {
    actor: { userId: user.id, role: 'driver', entityId: driver.id },
    driverId: driver.id,
  };
}

// -- Ops context --

export async function getOpsActorContext(): Promise<ActorContext | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: platformUser } = await (adminClient as any)
    .from('platform_users')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();
  if (!platformUser) return null;

  const roleMap: Record<string, ActorRole> = {
    ops_admin: 'ops_admin',
    ops_agent: 'ops_agent',
    ops_manager: 'ops_manager',
    finance_admin: 'finance_admin',
    finance_manager: 'finance_manager',
    super_admin: 'super_admin',
    support: 'support_agent',
    support_agent: 'support_agent',
  };

  const mappedRole = roleMap[platformUser.role as string];
  if (!mappedRole) {
    return null;
  }

  return {
    userId: user.id,
    role: mappedRole,
    entityId: platformUser.id,
    sessionId: user.id,
  };
}

// -- Ownership verification --

export async function verifyChefOwnsStorefront(chefId: string, storefrontId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('chef_storefronts')
    .select('chef_id')
    .eq('id', storefrontId)
    .single();
  return data?.chef_id === chefId;
}

export async function verifyChefOwnsOrder(storefrontId: string, orderId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('orders')
    .select('storefront_id')
    .eq('id', orderId)
    .single();
  return data?.storefront_id === storefrontId;
}

export async function verifyDriverOwnsDelivery(driverId: string, deliveryId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('deliveries')
    .select('driver_id')
    .eq('id', deliveryId)
    .single();
  return data?.driver_id === driverId;
}

export async function verifyMenuItemOwnership(storefrontId: string, menuItemId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('menu_items')
    .select('storefront_id')
    .eq('id', menuItemId)
    .single();
  return data?.storefront_id === storefrontId;
}

export {
  guardPlatformApi,
  hasPlatformApiCapability,
  type PlatformApiCapability,
} from './services/platform-api-guards';
