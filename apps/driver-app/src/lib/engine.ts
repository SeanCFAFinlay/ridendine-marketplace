// ==========================================
// DRIVER-APP ENGINE CLIENT
// FND-016: uses shared getEngine/errorResponse/successResponse
// ==========================================

import { createServerClient, createAdminClient } from '@ridendine/db';
import type { ActorContext } from '@ridendine/types';
import { cookies } from 'next/headers';

// Re-export shared helpers
export { getAdminEngine as getEngine, errorResponse, successResponse } from '@ridendine/engine';

export type GetDriverActorOptions = {
  /**
   * When true (default), only `approved` drivers receive a context (dispatch + location APIs).
   * When false, any existing driver row is returned (e.g. profile PATCH while pending).
   */
  requireApproved?: boolean;
};

/**
 * Get actor context for current driver user
 */
export async function getDriverActorContext(options?: GetDriverActorOptions): Promise<{
  actor: ActorContext;
  driverId: string;
} | null> {
  const requireApproved = options?.requireApproved !== false;

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Get driver profile
  const adminClient = createAdminClient();
  const { data: driver } = await adminClient
    .from('drivers')
    .select('id, status')
    .eq('user_id', user.id)
    .single();

  if (!driver) {
    return null;
  }

  if (requireApproved && driver.status !== 'approved') {
    return null;
  }

  return {
    actor: {
      userId: user.id,
      role: 'driver',
      entityId: driver.id,
    },
    driverId: driver.id,
  };
}

/**
 * Verify driver is assigned to a delivery
 */
export async function verifyDriverOwnsDelivery(
  driverId: string,
  deliveryId: string
): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data: delivery } = await adminClient
    .from('deliveries')
    .select('driver_id')
    .eq('id', deliveryId)
    .single();

  return delivery?.driver_id === driverId;
}
