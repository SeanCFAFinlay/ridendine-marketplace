// ==========================================
// DRIVER-APP DELIVERY API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getDriverActorContext,
  verifyDriverOwnsDelivery,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: deliveryId } = await params;

    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    // Verify driver owns this delivery
    const ownsDelivery = await verifyDriverOwnsDelivery(driverContext.driverId, deliveryId);
    if (!ownsDelivery) {
      return errorResponse('FORBIDDEN', 'This delivery is not assigned to you', 403);
    }

    const adminClient = createAdminClient();

    // Get delivery with related data
    const { data: delivery, error } = await adminClient
      .from('deliveries')
      .select(`
        *,
        orders!inner (
          id,
          order_number,
          total,
          tip,
          special_instructions,
          customer:customers (
            first_name,
            last_name,
            phone
          ),
          storefront:chef_storefronts (
            name,
            phone,
            kitchen:chef_kitchens (
              address,
              lat,
              lng
            )
          ),
          items:order_items (
            quantity,
            menu_item:menu_items (name)
          )
        )
      `)
      .eq('id', deliveryId)
      .single();

    if (error || !delivery) {
      return errorResponse('NOT_FOUND', 'Delivery not found', 404);
    }

    // Get any active assignment attempt
    const { data: activeAttempt } = await (adminClient as any)
      .from('assignment_attempts')
      .select('*')
      .eq('delivery_id', deliveryId)
      .eq('driver_id', driverContext.driverId)
      .eq('response', 'pending')
      .single();

    return successResponse({
      delivery,
      activeAttempt,
    });
  } catch (error) {
    console.error('Error fetching delivery:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: deliveryId } = await params;

    const driverContext = await getDriverActorContext();
    if (!driverContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or not approved', 401);
    }

    const body = await request.json();
    const { action, status, proofUrl, notes } = body;

    const engine = getEngine();
    const { actor, driverId } = driverContext;

    // Handle assignment attempt responses (accept/decline offer)
    if (action === 'accept_offer') {
      if (!body.attemptId) {
        return errorResponse('MISSING_ATTEMPT', 'Attempt ID is required');
      }
      const result = await engine.dispatch.acceptOffer(body.attemptId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    if (action === 'decline_offer') {
      if (!body.attemptId) {
        return errorResponse('MISSING_ATTEMPT', 'Attempt ID is required');
      }
      const result = await engine.dispatch.declineOffer(
        body.attemptId,
        body.reason || 'Driver declined',
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse({ declined: true });
    }

    // For status updates, verify ownership
    const ownsDelivery = await verifyDriverOwnsDelivery(driverId, deliveryId);
    if (!ownsDelivery) {
      return errorResponse('FORBIDDEN', 'This delivery is not assigned to you', 403);
    }

    // Handle status updates
    if (action === 'update_status' || status) {
      const newStatus = status || body.newStatus;

      const validStatuses = [
        'en_route_to_pickup',
        'arrived_at_pickup',
        'picked_up',
        'en_route_to_dropoff',
        'arrived_at_dropoff',
        'delivered',
      ];

      if (!newStatus || !validStatuses.includes(newStatus)) {
        return errorResponse(
          'INVALID_STATUS',
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        );
      }

      const workflowResult = newStatus === 'delivered'
        ? await engine.platform.completeDeliveredOrder(deliveryId, actor, { proofUrl, notes })
        : await engine.dispatch.updateDeliveryStatus(
            deliveryId,
            newStatus,
            actor,
            { proofUrl, notes }
          );

      if (!workflowResult.success) {
        return errorResponse(workflowResult.error!.code, workflowResult.error!.message);
      }

      return successResponse(workflowResult.data);
    }

    return errorResponse('INVALID_ACTION', `Unknown action: ${action || 'none'}`);
  } catch (error) {
    console.error('Error updating delivery:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
