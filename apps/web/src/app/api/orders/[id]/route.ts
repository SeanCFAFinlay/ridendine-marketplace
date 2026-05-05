// ==========================================
// WEB ORDER DETAIL API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  getEngine,
  getCustomerActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface OrderDeliverySummary {
  driver_id: string | null;
  status: string;
  eta_pickup_at: string | null;
  eta_dropoff_at: string | null;
  route_progress_pct: number | null;
  route_to_dropoff_seconds: number | null;
  route_to_dropoff_polyline: string | null;
}

function buildCustomerTrackingSnapshot(
  publicStage: string | null | undefined,
  delivery: OrderDeliverySummary | null
): Record<string, unknown> {
  const routeSeconds =
    typeof delivery?.route_to_dropoff_seconds === 'number' &&
    Number.isFinite(delivery.route_to_dropoff_seconds)
      ? delivery.route_to_dropoff_seconds
      : null;

  return {
    public_stage: publicStage ?? 'placed',
    eta_pickup_at: delivery?.eta_pickup_at ?? null,
    eta_dropoff_at: delivery?.eta_dropoff_at ?? null,
    route_progress_pct:
      delivery?.route_progress_pct != null ? Number(delivery.route_progress_pct) : null,
    route_remaining_seconds: routeSeconds,
    route_to_dropoff_polyline: delivery?.route_to_dropoff_polyline ?? null,
  };
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

    const adminClient = createAdminClient() as unknown as SupabaseClient;

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
          eta_pickup_at,
          eta_dropoff_at,
          route_progress_pct,
          route_to_dropoff_seconds,
          route_to_dropoff_polyline,
          driver:drivers (
            first_name,
            last_name,
            phone,
            driver_vehicles (
              make,
              model,
              color,
              license_plate,
              is_active
            )
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

    const delivery = order.delivery as OrderDeliverySummary | null;
    const tracking = buildCustomerTrackingSnapshot(
      order.public_stage as string | undefined,
      delivery
    );

    return successResponse({
      order,
      timeline: timeline || [],
      allowedActions,
      tracking,
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

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.customerWrite,
      namespace: 'web-orders-patch',
      userId: customerContext.actor.userId,
      routeKey: 'PATCH:/api/orders/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

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
        const result = await engine.orders.cancelOrder({
          orderId,
          actorId: customerContext.actor.userId,
          actorType: customerContext.actor.role,
          actorRole: customerContext.actor.role,
          reason: cancelReason,
          notes,
          actor: customerContext.actor,
        });

        if (!result.success) {
          return errorResponse('CANCEL_FAILED', result.error ?? 'Cancel failed');
        }

        return successResponse(result.order);
      }

      default:
        return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Error updating order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
