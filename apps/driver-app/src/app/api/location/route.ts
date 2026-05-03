// ==========================================
// DRIVER-APP LOCATION API
// Powered by Central Engine
// ==========================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { locationUpdateSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  isPlausibleClientIsoTime,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  getEngine,
  getDriverActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

const RATE_STORE = 'driver-location-post';

const ACTIVE_DELIVERY = new Set([
  'assigned',
  'en_route_to_pickup',
  'arrived_at_pickup',
  'picked_up',
  'en_route_to_dropoff',
  'arrived_at_dropoff',
]);

const CUSTOMER_LEG = new Set(['picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff']);

function rateLimitedResponse(retryAfter: number) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many location updates; try again shortly',
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, retryAfter)),
      },
    }
  );
}

/**
 * POST /api/location
 * Update driver's current location
 */
export async function POST(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      const unauthRl = await evaluateRateLimit({
        request,
        policy: RATE_LIMIT_POLICIES.auth,
        namespace: `${RATE_STORE}-unauth`,
        routeKey: 'POST:/api/location',
      });
      if (!unauthRl.allowed) {
        return rateLimitPolicyResponse(unauthRl);
      }
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const { driverId } = driverContext;

    const rl = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.driverLocation,
      namespace: RATE_STORE,
      driverId,
      routeKey: 'POST:/api/location',
    });
    if (!rl.allowed) {
      return rateLimitedResponse(rl.retryAfter ?? 60);
    }

    const rawBody = (await request.json()) as Record<string, unknown>;
    if (rawBody.recordedAt != null) {
      if (
        typeof rawBody.recordedAt !== 'string' ||
        !isPlausibleClientIsoTime(rawBody.recordedAt)
      ) {
        return errorResponse(
          'INVALID_TIMESTAMP',
          'recordedAt must be a valid ISO time within acceptable clock skew',
          400
        );
      }
    }

    const validationResult = locationUpdateSchema.safeParse(rawBody);

    if (!validationResult.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400);
    }

    const { lat, lng, accuracy, heading, speed, deliveryId } = validationResult.data;

    if (lat === 0 && lng === 0) {
      return errorResponse(
        'INVALID_COORDINATES',
        'Coordinates (0,0) are not accepted',
        400
      );
    }

    const adminClient = createAdminClient();

    if (deliveryId) {
      const { data: dCheck, error: dErr } = await adminClient
        .from('deliveries')
        .select('id, driver_id')
        .eq('id', deliveryId)
        .maybeSingle();

      if (dErr || !dCheck || dCheck.driver_id !== driverId) {
        return errorResponse('FORBIDDEN', 'Delivery is not assigned to this driver', 403);
      }
    }

    const engine = getEngine();

    const locationTimestamp = new Date().toISOString();
    await adminClient
      .from('driver_presence')
      .upsert(
        {
          driver_id: driverId,
          current_lat: lat,
          current_lng: lng,
          last_location_lat: lat,
          last_location_lng: lng,
          last_location_update: locationTimestamp,
          last_location_at: locationTimestamp,
          last_updated_at: locationTimestamp,
          updated_at: locationTimestamp,
        },
        {
          onConflict: 'driver_id',
        }
      );

    await adminClient.from('driver_locations').insert({
      driver_id: driverId,
      lat,
      lng,
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      recorded_at: locationTimestamp,
    });

    if (deliveryId) {
      const { data: delivery } = await adminClient
        .from('deliveries')
        .select('id, driver_id, status, order_id')
        .eq('id', deliveryId)
        .single();

      if (delivery && delivery.driver_id === driverId) {
        if (ACTIVE_DELIVERY.has(delivery.status)) {
          await adminClient.from('delivery_tracking_events').insert({
            delivery_id: deliveryId,
            driver_id: driverId,
            lat,
            lng,
            accuracy: accuracy ?? null,
            recorded_at: locationTimestamp,
          });
        }

        if (delivery.order_id && CUSTOMER_LEG.has(delivery.status)) {
          const refreshed = await engine.eta.refreshFromDriverPing(deliveryId, { lat, lng });

          const { data: snapRaw } = await adminClient
            .from('deliveries')
            .select('eta_pickup_at, route_to_dropoff_polyline')
            .eq('id', deliveryId)
            .maybeSingle();

          const { data: ordRaw } = await adminClient
            .from('orders')
            .select('public_stage')
            .eq('id', delivery.order_id)
            .maybeSingle();

          const snap = snapRaw as {
            eta_pickup_at?: string | null;
            route_to_dropoff_polyline?: string | null;
          } | null;
          const ord = ordRaw as { public_stage?: string } | null;

          await engine.events.broadcastPublic(delivery.order_id as string, {
            public_stage: ord?.public_stage ?? 'on_the_way',
            eta_pickup_at: snap?.eta_pickup_at ?? null,
            eta_dropoff_at: refreshed.etaDropoffAt.toISOString(),
            route_progress_pct: refreshed.progressPct,
            route_remaining_seconds: refreshed.remainingSeconds,
            route_to_dropoff_polyline: snap?.route_to_dropoff_polyline ?? null,
          });
        }
      }
    }

    return successResponse({
      recordedAt: locationTimestamp,
    });
  } catch (error) {
    console.error('Error updating location:', error instanceof Error ? error.message : 'unknown');
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
