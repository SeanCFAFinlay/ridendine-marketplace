// ==========================================
// WEB APP ENGINE CLIENT
// Provides access to the central business engine
// ==========================================

import { createServerClient, createAdminClient } from '@ridendine/db';
import { createCentralEngine, type CentralEngine } from '@ridendine/engine';
import type { ActorContext } from '@ridendine/types';
import { cookies } from 'next/headers';

// Singleton engine instance
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
 * Get actor context for current customer user
 */
export async function getCustomerActorContext(): Promise<{
  actor: ActorContext;
  customerId: string;
} | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get customer profile
  const adminClient = createAdminClient();
  const { data: customer } = await adminClient
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!customer) {
    return null;
  }

  return {
    actor: {
      userId: user.id,
      role: 'customer',
      entityId: customer.id,
    },
    customerId: customer.id,
  };
}

/**
 * Get system actor context for automated operations
 */
export function getSystemActor(): ActorContext {
  return {
    userId: 'system',
    role: 'system',
  };
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
