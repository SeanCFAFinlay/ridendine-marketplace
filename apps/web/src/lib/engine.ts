// ==========================================
// WEB APP ENGINE CLIENT
// FND-016: uses shared getEngine/errorResponse/successResponse
// ==========================================

import { createServerClient, createAdminClient } from '@ridendine/db';
import type { ActorContext } from '@ridendine/types';
import { cookies } from 'next/headers';
import { registerPaymentAdapter } from '@ridendine/engine';
import { stripePaymentAdapter } from './stripe-adapter';

// Wire Stripe adapter so engine can void payments on reject/cancel
registerPaymentAdapter(stripePaymentAdapter);

// Re-export shared helpers so existing imports don't break
export { getAdminEngine as getEngine, errorResponse, successResponse } from '@ridendine/engine';

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
