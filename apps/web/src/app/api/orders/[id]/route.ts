// ==========================================
// WEB ORDER DETAIL API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getCustomerActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]
 * Get a specific order for the current customer
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;

    const customerContext = await getCustomerActorContext();
    if (!customerContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();

    // Get order with related data - verify customer owns it
    const { data: order, error } = await adminClient
      .from('orders')
      .select(`
        *,
        items:order_items (
          id,
          quantity,
          unit_price,
          total_price,
          special_instructions,
          menu_item:menu_items (
            id,
            name,
            description,
            image_url
          )
        ),
        storefront:chef_storefronts (
          id,
          name,
          slug,
          logo_url,
          phone
        ),
        delivery_address:customer_addresses (
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          delivery_instructions
        ),
        delivery:deliveries (
          id,
          status,
          driver_id,
          pickup_address,
          dropoff_address,
          estimated_pickup_at,
          actual_pickup_at,
          estimated_dropoff_at,
          actual_dropoff_at,
          driver:drivers (
            first_name,
            last_name,
            phone,
            vehicle_make,
            vehicle_model,
            vehicle_color,
            license_plate
          )
        )
      `)
      .eq('id', orderId)
      .eq('customer_id', customerContext.customerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse('NOT_FOUND', 'Order not found', 404);
      }
      return errorResponse('FETCH_ERROR', error.message);
    }

    // Get allowed actions for this customer
    const engine = getEngine();
    const allowedActions = await engine.orders.getAllowedActions(orderId, 'customer');

    // Get order timeline/history
    const { data: timeline } = await adminClient
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    // Get live driver location if delivery is in progress
    let driverLocation = null;
    const delivery = (order as any).delivery as { driver_id: string; status: string } | null;
    if (delivery?.driver_id) {
      const activeStatuses = [
        'assigned',
        'en_route_to_pickup',
        'arrived_at_pickup',
        'picked_up',
        'en_route_to_dropoff',
        'arrived_at_dropoff',
      ];

      if (activeStatuses.includes(delivery.status)) {
        const { data: presence } = await (adminClient as any)
          .from('driver_presence')
          .select('current_lat, current_lng, last_location_at')
          .eq('driver_id', delivery.driver_id)
          .single();

        if (presence?.current_lat && presence?.current_lng) {
          driverLocation = {
            lat: presence.current_lat,
            lng: presence.current_lng,
            lastUpdated: presence.last_location_at,
          };
        }
      }
    }

    return successResponse({
      order,
      timeline: timeline || [],
      allowedActions,
      driverLocation,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * PATCH /api/orders/[id]
 * Customer order actions (cancel, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;

    const customerContext = await getCustomerActorContext();
    if (!customerContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();

    // Verify customer owns this order
    const { data: order } = await adminClient
      .from('orders')
      .select('id, customer_id, status')
      .eq('id', orderId)
      .single();

    if (!order || order.customer_id !== customerContext.customerId) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    const body = await request.json();
    const { action, reason, notes } = body;

    const engine = getEngine();

    switch (action) {
      case 'cancel': {
        const cancelReason = reason || 'customer_requested';
        const result = await engine.orders.cancelOrder(
          orderId,
          cancelReason,
          notes,
          customerContext.actor
        );

        if (!result.success) {
          return errorResponse(result.error!.code, result.error!.message);
        }

        return successResponse(result.data);
      }

      default:
        return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
