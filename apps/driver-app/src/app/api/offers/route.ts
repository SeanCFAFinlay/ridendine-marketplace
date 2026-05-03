// ==========================================
// DRIVER-APP DELIVERY OFFERS API
// Shows pending delivery offers for drivers
// ==========================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getDriverActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/offers
 * Get pending delivery offers for the current driver
 */
export async function GET() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();

    // Get pending offers for this driver
    const { data: offers, error } = await adminClient
      .from('assignment_attempts')
      .select(`
        *,
        delivery:deliveries (
          id,
          pickup_address,
          pickup_lat,
          pickup_lng,
          dropoff_address,
          dropoff_lat,
          dropoff_lng,
          estimated_distance_km,
          estimated_duration_minutes,
          driver_payout,
          orders!inner (
            order_number,
            total,
            tip,
            storefront:chef_storefronts (name)
          )
        )
      `)
      .eq('driver_id', driverContext.driverId)
      .eq('response', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('offered_at', { ascending: false });

    if (error) {
      return errorResponse('FETCH_ERROR', error.message);
    }

    return successResponse({
      offers: offers || [],
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * POST /api/offers
 * Accept or decline an offer
 */
export async function POST(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const body = await request.json();
    const { action, attemptId, reason, driverId } = body;

    if (!attemptId) {
      return errorResponse('MISSING_ATTEMPT', 'Attempt ID is required');
    }

    const engine = getEngine();
    const { actor, driverId: sessionDriverId } = driverContext;
    const resolvedDriverId = typeof driverId === 'string' ? driverId : sessionDriverId;
    if (resolvedDriverId !== sessionDriverId) {
      return errorResponse('FORBIDDEN', 'Driver mismatch');
    }

    if (action === 'accept') {
      const result = await engine.dispatch.respondToOffer(
        attemptId,
        'accept',
        resolvedDriverId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    if (action === 'decline') {
      const result = await engine.dispatch.respondToOffer(
        attemptId,
        'decline',
        resolvedDriverId,
        actor,
        reason || 'Driver declined'
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse({ declined: true });
    }

    return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  } catch (error) {
    console.error('Error handling offer:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
