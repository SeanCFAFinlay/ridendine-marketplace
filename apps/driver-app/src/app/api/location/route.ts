// ==========================================
// DRIVER-APP LOCATION API
// Powered by Central Engine
// ==========================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { locationUpdateSchema } from '@ridendine/validation';
import {
  getEngine,
  getDriverActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

// Rate limiting (in-memory, per-instance)
const RATE_LIMIT_MS = 5000;
const locationUpdateTimestamps = new Map<string, number>();

/**
 * POST /api/location
 * Update driver's current location
 */
export async function POST(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const { driverId } = driverContext;

    // Rate limit check
    const lastUpdate = locationUpdateTimestamps.get(driverId);
    const now = Date.now();
    if (lastUpdate && now - lastUpdate < RATE_LIMIT_MS) {
      return errorResponse(
        'RATE_LIMITED',
        'Please wait before sending another update',
        429
      );
    }

    const body = await request.json();
    const validationResult = locationUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        400
      );
    }

    const { lat, lng, accuracy, heading, speed, deliveryId } = validationResult.data;

    const adminClient = createAdminClient();
    const engine = getEngine();

    // Update driver's current location in driver_presence
    // Write both field names so they stay in sync (migration 00010 also syncs via trigger)
    const locationTimestamp = new Date().toISOString();
    await adminClient
      .from('driver_presence')
      .upsert({
        driver_id: driverId,
        current_lat: lat,
        current_lng: lng,
        last_location_lat: lat,
        last_location_lng: lng,
        last_location_update: locationTimestamp,
        last_location_at: locationTimestamp,
        last_updated_at: locationTimestamp,
        updated_at: locationTimestamp,
      }, {
        onConflict: 'driver_id',
      });

    // Record location history
    await (adminClient as any).from('driver_locations').insert({
      driver_id: driverId,
      lat,
      lng,
      accuracy,
      heading,
      speed,
      recorded_at: new Date().toISOString(),
    });

    // If actively delivering, create tracking event
    if (deliveryId) {
      // Verify driver owns this delivery
      const { data: delivery } = await adminClient
        .from('deliveries')
        .select('driver_id, status')
        .eq('id', deliveryId)
        .single();

      if (delivery && delivery.driver_id === driverId) {
        // Only track if delivery is in an active status
        const activeStatuses = [
          'assigned',
          'en_route_to_pickup',
          'arrived_at_pickup',
          'picked_up',
          'en_route_to_dropoff',
          'arrived_at_dropoff',
        ];

        if (activeStatuses.includes(delivery.status)) {
          await (adminClient as any).from('delivery_tracking_events').insert({
            delivery_id: deliveryId,
            driver_id: driverId,
            lat,
            lng,
            accuracy,
            recorded_at: new Date().toISOString(),
          });

          // Emit realtime event for customer tracking
          engine.events.emit(
            'driver_location_updated',
            'delivery',
            deliveryId,
            {
              lat,
              lng,
              heading,
              speed,
              deliveryStatus: delivery.status,
            },
            driverContext.actor
          );
          await engine.events.flush();
        }
      }
    }

    locationUpdateTimestamps.set(driverId, now);

    return successResponse({
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
