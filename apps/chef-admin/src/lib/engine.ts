// ==========================================
// CHEF-ADMIN ENGINE CLIENT
// Provides access to the central business engine
// ==========================================

import { createServerClient, createAdminClient } from '@ridendine/db';
import { createCentralEngine, type CentralEngine } from '@ridendine/engine';
import type { ActorContext } from '@ridendine/types';
import { cookies } from 'next/headers';

// Singleton engine instance (uses admin client for full access)
let engineInstance: CentralEngine | null = null;

/**
 * Get the central engine instance
 */
export function getEngine(): CentralEngine {
  if (!engineInstance) {
    const client = createAdminClient();
    engineInstance = createCentralEngine(client);
  }
  return engineInstance;
}

/**
 * Get actor context for current chef user
 * Returns null if user is not authenticated or not a chef
 */
export async function getChefActorContext(): Promise<{
  actor: ActorContext;
  chefId: string;
  storefrontId: string;
} | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get chef profile
  const adminClient = createAdminClient();
  const { data: chefProfile } = await adminClient
    .from('chef_profiles')
    .select('id, status')
    .eq('user_id', user.id)
    .single();

  if (!chefProfile) {
    return null;
  }

  // Get storefront
  const { data: storefront } = await adminClient
    .from('chef_storefronts')
    .select('id')
    .eq('chef_id', chefProfile.id)
    .single();

  if (!storefront) {
    return null;
  }

  return {
    actor: {
      userId: user.id,
      role: 'chef_user',
      entityId: chefProfile.id,
    },
    chefId: chefProfile.id,
    storefrontId: storefront.id,
  };
}

/**
 * Get basic chef context (allows chefs without storefront)
 * Used for storefront creation and onboarding
 */
export async function getChefBasicContext(): Promise<{
  userId: string;
  chefId: string;
  chefStatus: string;
  storefrontId: string | null;
} | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get chef profile
  const adminClient = createAdminClient();
  const { data: chefProfile } = await adminClient
    .from('chef_profiles')
    .select('id, status')
    .eq('user_id', user.id)
    .single();

  if (!chefProfile) {
    return null;
  }

  // Get storefront (optional)
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

/**
 * Verify chef owns a storefront
 */
export async function verifyChefOwnsStorefront(
  chefId: string,
  storefrontId: string
): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data: storefront } = await adminClient
    .from('chef_storefronts')
    .select('chef_id')
    .eq('id', storefrontId)
    .single();

  return storefront?.chef_id === chefId;
}

/**
 * Verify chef owns an order (via storefront)
 */
export async function verifyChefOwnsOrder(
  storefrontId: string,
  orderId: string
): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data: order } = await adminClient
    .from('orders')
    .select('storefront_id')
    .eq('id', orderId)
    .single();

  return order?.storefront_id === storefrontId;
}

/**
 * Standard error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400
): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}

/**
 * Standard success response
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json(
    { success: true, data },
    { status }
  );
}
