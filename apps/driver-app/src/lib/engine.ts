// ==========================================
// DRIVER-APP ENGINE CLIENT
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
 * Get actor context for current driver user
 */
export async function getDriverActorContext(): Promise<{
  actor: ActorContext;
  driverId: string;
} | null> {
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

  if (driver.status !== 'approved') {
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
