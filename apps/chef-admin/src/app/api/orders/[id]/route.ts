// ==========================================
// CHEF-ADMIN ORDER API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  getEngine,
  getChefActorContext,
  verifyChefOwnsOrder,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import type { OrderRejectReason } from '@ridendine/types';
import { syncKitchenState } from '@/lib/kitchen-sync';
import { snapshotOrderRecipeCosts } from '@/lib/recipe-snapshot';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;

    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    // Verify chef owns this order
    const ownsOrder = await verifyChefOwnsOrder(chefContext.storefrontId, orderId);
    if (!ownsOrder) {
      return errorResponse('FORBIDDEN', 'This order does not belong to your storefront', 403);
    }

    const adminClient = createAdminClient();

    // Get order with related data
    const { data: order, error } = await adminClient
      .from('orders')
      .select(`
        *,
        customer:customers (
          id, first_name, last_name, phone, email
        ),
        delivery_address:customer_addresses (
          address_line1, address_line2, city, state, postal_code, lat, lng,
          delivery_instructions
        ),
        items:order_items (
          id, quantity, unit_price, total_price, special_instructions,
          menu_item:menu_items (id, name, description)
        ),
        delivery:deliveries (
          id, status, driver_id,
          driver:drivers (first_name, last_name, phone)
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return errorResponse('NOT_FOUND', 'Order not found', 404);
    }

    // Get allowed actions for this chef
    const engine = getEngine();
    const allowedActions = await engine.orders.getAllowedActions(orderId, 'chef_user');

    return successResponse({
      order,
      allowedActions,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: orderId } = await params;

    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-orders-patch',
      userId: chefContext.actor.userId,
      routeKey: 'PATCH:/api/orders/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    // Verify chef owns this order
    const ownsOrder = await verifyChefOwnsOrder(chefContext.storefrontId, orderId);
    if (!ownsOrder) {
      return errorResponse('FORBIDDEN', 'This order does not belong to your storefront', 403);
    }

    const rawBody = await request.text();
    const body = rawBody.trim() ? JSON.parse(rawBody) : {};
    const { action, ...actionParams } = body;

    return applyOrderAction(orderId, action, actionParams, chefContext.actor);
  } catch (error) {
    console.error('Error updating order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

type ChefActor = NonNullable<Awaited<ReturnType<typeof getChefActorContext>>>['actor'];

/**
 * Shared internal action dispatcher. The legacy status-based fallback calls
 * this directly instead of re-entering the PATCH route handler, so auth and
 * the rate limiter run exactly once per request.
 */
async function applyOrderAction(
  orderId: string,
  action: string | undefined,
  actionParams: Record<string, any>,
  actor: ChefActor
): Promise<Response> {
  const engine = getEngine();

  switch (action) {
    case 'accept': {
      const result = await engine.orders.acceptOrder(
        orderId,
        actionParams.estimatedPrepMinutes || 20,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      await syncKitchenState(orderId);
      // Capture point-in-time recipe cost so historical profitability is stable.
      await snapshotOrderRecipeCosts(orderId);
      return successResponse(result.data);
    }

    case 'reject': {
      if (!actionParams.reason) {
        return errorResponse('MISSING_REASON', 'Rejection reason is required');
      }
      const result = await engine.orders.rejectOrder(
        orderId,
        actionParams.reason as OrderRejectReason,
        actionParams.notes,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      await syncKitchenState(orderId);
      return successResponse(result.data);
    }

    case 'start_preparing': {
      const result = await engine.orders.startPreparing(orderId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      await syncKitchenState(orderId);
      return successResponse(result.data);
    }

    case 'mark_ready': {
      const result = await engine.platform.markOrderReady(orderId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      await syncKitchenState(orderId);
      return successResponse(result.data);
    }

    case 'update_prep_time': {
      if (!actionParams.estimatedPrepMinutes) {
        return errorResponse('MISSING_TIME', 'Estimated prep time is required');
      }
      const result = await engine.kitchen.updatePrepTime(
        orderId,
        actionParams.estimatedPrepMinutes,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse({ updated: true });
    }

    // Legacy status-based update for backwards compatibility
    case undefined: {
      const { status, ...rest } = actionParams;
      if (!status) {
        return errorResponse('MISSING_ACTION', 'Action or status is required');
      }

      // Map legacy status to action
      const statusActionMap: Record<string, string> = {
        accepted: 'accept',
        preparing: 'start_preparing',
        ready_for_pickup: 'mark_ready',
        rejected: 'reject',
      };

      const mappedAction = statusActionMap[status];
      if (!mappedAction) {
        return errorResponse('INVALID_STATUS', `Invalid status: ${status}`);
      }

      // Dispatch the mapped action through the shared internal logic — does
      // NOT re-run auth or count against the rate limiter a second time.
      return applyOrderAction(orderId, mappedAction, rest, actor);
    }

    default:
      return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  }
}
