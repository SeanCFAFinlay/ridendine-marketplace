import {
  createAdminClient,
  getActiveDeliveriesForDriver,
  type SupabaseClient,
} from '@ridendine/db';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();
    const deliveries = await getActiveDeliveriesForDriver(
      adminClient as unknown as SupabaseClient,
      driverContext.driverId
    );

    return successResponse({ deliveries });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
