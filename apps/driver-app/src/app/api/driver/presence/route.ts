// ==========================================
// DRIVER-APP PRESENCE API
// Powered by Central Engine
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

type DriverPresenceStatus = 'offline' | 'online' | 'busy';

/**
 * GET /api/driver/presence
 * Get current driver's presence status
 */
export async function GET() {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const adminClient = createAdminClient();

    const { data: presence, error } = await adminClient
      .from('driver_presence')
      .select('*')
      .eq('driver_id', driverContext.driverId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return errorResponse('FETCH_ERROR', error.message);
    }

    return successResponse({
      presence: presence || {
        driver_id: driverContext.driverId,
        status: 'offline',
        current_lat: null,
        current_lng: null,
        last_location_at: null,
      },
    });
  } catch (error) {
    console.error('Error fetching presence:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * PATCH /api/driver/presence
 * Update driver's presence status (online/offline/busy)
 */
export async function PATCH(request: NextRequest) {
  try {
    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses: DriverPresenceStatus[] = ['offline', 'online', 'busy'];
    if (!status || !validStatuses.includes(status)) {
      return errorResponse(
        'INVALID_STATUS',
        `Status must be one of: ${validStatuses.join(', ')}`
      );
    }

    const adminClient = createAdminClient();
    const engine = getEngine();

    // Upsert presence record
    const { data: presence, error } = await adminClient
      .from('driver_presence')
      .upsert(
        {
          driver_id: driverContext.driverId,
          status,
          last_status_change_at: new Date().toISOString(),
        },
        {
          onConflict: 'driver_id',
        }
      )
      .select()
      .single();

    if (error) {
      return errorResponse('UPDATE_ERROR', error.message);
    }

    // Log status change via audit
    await engine.audit.log({
      action: 'status_change',
      entityType: 'driver',
      entityId: driverContext.driverId,
      actor: driverContext.actor,
      afterState: { status },
    });

    // Emit event for dispatch system
    engine.events.emit(
      'driver_status_changed',
      'driver',
      driverContext.driverId,
      { status },
      driverContext.actor
    );
    await engine.events.flush();

    // If going offline with active delivery, emit warning
    if (status === 'offline') {
      const { data: activeDelivery } = await adminClient
        .from('deliveries')
        .select('id, status')
        .eq('driver_id', driverContext.driverId)
        .not('status', 'in', '("delivered","cancelled","failed")')
        .maybeSingle();

      if (activeDelivery) {
        // Create exception for ops to handle
        await engine.support.createException(
          {
            type: 'driver_issue',
            severity: 'medium',
            deliveryId: activeDelivery.id,
            driverId: driverContext.driverId,
            title: 'Driver Went Offline',
            description: 'Driver went offline with active delivery',
            recommendedActions: ['Reassign delivery', 'Contact driver'],
          },
          driverContext.actor
        );
      }
    }

    return successResponse({ presence });
  } catch (error) {
    console.error('Error updating presence:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
