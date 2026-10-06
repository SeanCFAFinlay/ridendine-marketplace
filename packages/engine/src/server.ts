// ==========================================
// ENGINE SERVER HELPERS
// Shared server-side context utilities for all apps
// Requires next/headers - must be imported from server components/routes only
// ==========================================

import { createServerClient, createAdminClient } from '@ridendine/db';
import { createCentralEngine, type CentralEngine } from './index';
import type { ActorContext, ActorRole } from '@ridendine/types';
import { cookies, headers } from 'next/headers';

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

export type GetChefActorOptions = {
  /**
   * When true (default), only `approved` chefs receive privileged context.
   * Onboarding flows should use getChefBasicContext instead.
   */
  requireApproved?: boolean;
};

export async function getChefActorContext(
  options?: GetChefActorOptions
): Promise<{ actor: ActorContext; chefId: string; storefrontId: string } | null> {
  const requireApproved = options?.requireApproved !== false;
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
  if (requireApproved && chefProfile.status !== 'approved') return null;

  const { data: storefront } = await adminClient
    .from('chef_storefronts')
    .select('id')
    .eq('chef_id', chefProfile.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
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
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    userId: user.id,
    chefId: chefProfile.id,
    chefStatus: chefProfile.status,
    storefrontId: storefront?.id || null,
  };
}

// -- Operator (ghost-kitchen commissary) context --

export type GetOperatorKitchenOptions = {
  /**
   * When true (default), only `approved` chef profiles receive operator context.
   */
  requireApproved?: boolean;
};

/**
 * Resolves the ghost-kitchen operator's commissary context.
 *
 *   kitchenId    = the chef_kitchen owned by the signed-in operator. SHARED-ops
 *                  tables (inventory, suppliers, labour, production) scope here.
 *   storefrontId = the ACTIVE brand, taken from the `x-brand-id` header (cookie
 *                  fallback) and validated to belong to kitchenId; null when
 *                  unset/invalid. BRAND-scoped surfaces (menu, recipes, orders)
 *                  use this.
 *
 * Additive to getChefActorContext: independent single-storefront chefs keep
 * using that helper unchanged. A spoofed x-brand-id can never cross kitchens
 * because the brand is re-validated against kitchen_id here.
 */
export async function getOperatorKitchenContext(
  options?: GetOperatorKitchenOptions
): Promise<{ actor: ActorContext; kitchenId: string; storefrontId: string | null } | null> {
  const requireApproved = options?.requireApproved !== false;
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
  if (requireApproved && chefProfile.status !== 'approved') return null;

  // The commissary kitchen this operator owns. Pilot: one kitchen per operator.
  const { data: kitchen } = await adminClient
    .from('chef_kitchens')
    .select('id')
    .eq('chef_id', chefProfile.id)
    .limit(1)
    .maybeSingle();
  if (!kitchen) return null;

  // Active brand: x-brand-id header wins, cookie is the fallback. Validate it
  // belongs to this kitchen before trusting it.
  const headerStore = await headers();
  const requestedBrandId =
    headerStore.get('x-brand-id') || cookieStore.get('x-brand-id')?.value || null;

  let storefrontId: string | null = null;
  if (requestedBrandId) {
    const { data: brand } = await adminClient
      .from('chef_storefronts')
      .select('id')
      .eq('id', requestedBrandId)
      .eq('kitchen_id', kitchen.id)
      .maybeSingle();
    storefrontId = brand?.id ?? null;
  }

  return {
    actor: { userId: user.id, role: 'chef_user', entityId: chefProfile.id },
    kitchenId: kitchen.id,
    storefrontId,
  };
}

// -- Driver context --

export type GetDriverActorOptions = {
  /**
   * When true (default), only `approved` drivers receive dispatch context.
   * Profile/onboarding routes can pass false while the driver is still pending.
   */
  requireApproved?: boolean;
};

export async function getDriverActorContext(
  options?: GetDriverActorOptions
): Promise<{ actor: ActorContext; driverId: string } | null> {
  const requireApproved = options?.requireApproved !== false;
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
  if (!driver) return null;
  if (requireApproved && driver.status !== 'approved') return null;

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

export type { PlatformCapability } from '@ridendine/types';
