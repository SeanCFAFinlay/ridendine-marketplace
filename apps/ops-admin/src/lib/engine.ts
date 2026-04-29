// ==========================================
// OPS-ADMIN ENGINE CLIENT
// FND-016: uses shared getEngine/errorResponse/successResponse
// ==========================================

import { createServerClient, createAdminClient } from '@ridendine/db';
import type { ActorContext, ActorRole } from '@ridendine/types';
import { cookies } from 'next/headers';

// Re-export shared helpers
export { getAdminEngine as getEngine, errorResponse, successResponse } from '@ridendine/engine';

/**
 * Get actor context for current ops user
 */
export async function getOpsActorContext(): Promise<ActorContext | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get platform user role
  const adminClient = createAdminClient();
  const { data: platformUser } = await (adminClient as any)
    .from('platform_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  if (!platformUser) {
    return null;
  }

  // Map platform role to actor role
  const roleMap: Record<string, ActorRole> = {
    ops_agent: 'ops_agent',
    ops_manager: 'ops_manager',
    finance_admin: 'finance_admin',
    super_admin: 'super_admin',
  };

  const actorRole = roleMap[platformUser.role] || 'ops_agent';

  return {
    userId: user.id,
    role: actorRole,
    entityId: platformUser.id,
    sessionId: user.id,
  };
}

/**
 * Verify ops user has required role
 */
export function hasRequiredRole(
  actor: ActorContext,
  requiredRoles: ActorRole[]
): boolean {
  return requiredRoles.includes(actor.role);
}
