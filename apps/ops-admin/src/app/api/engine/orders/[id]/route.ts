// ==========================================
// OPS-ADMIN ORDER ACTIONS API
// Powered by Central Engine
// ==========================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import type { EngineOrderStatus, OrderCancelReason } from '@ridendine/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/orders/[id]
 * Get order details with full timeline
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const engine = getEngine();
  const adminClient = createAdminClient();

  // Get order
  const { data: order, error } = await adminClient
    .from('orders')
    .select(`
      *,
      customer:customers (
        id, first_name, last_name, email, phone
      ),
      storefront:chef_storefronts (
        id, name, slug,
        chef:chef_profiles (id, display_name, phone)
      ),
      delivery_address:customer_addresses (
        address_line1, address_line2, city, state, postal_code
      ),
      items:order_items (
        id, quantity, unit_price, total_price,
        menu_item:menu_items (name, description)
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

  // Get order timeline from audit
  const timeline = await engine.audit.getAuditTrail('order', orderId);

  // Get any linked exceptions (cast to any for new table)
  const { data: exceptions } = await (adminClient as any)
    .from('order_exceptions')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  // Get allowed actions
  const allowedActions = await engine.orders.getAllowedActions(orderId, actor.role);

  // Get financials
  const financials = await engine.commerce.getOrderFinancials(orderId);

  return successResponse({
    order,
    timeline,
    exceptions: exceptions || [],
    allowedActions,
    financials: financials.success ? financials.data : null,
  });
}

/**
 * PATCH /api/engine/orders/[id]
 * Update order status or perform actions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const body = await request.json();
  const { action, ...actionParams } = body;

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
      return successResponse(result.data);
    }

    case 'reject': {
      const result = await engine.orders.rejectOrder(
        orderId,
        actionParams.reason,
        actionParams.notes,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'start_preparing': {
      const result = await engine.orders.startPreparing(orderId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'mark_ready': {
      const result = await engine.orders.markReady(orderId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'cancel': {
      const result = await engine.orders.cancelOrder(
        orderId,
        actionParams.reason as OrderCancelReason,
        actionParams.notes,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'complete': {
      const result = await engine.orders.completeOrder(orderId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'override': {
      // Only managers can override
      if (!['ops_manager', 'super_admin'].includes(actor.role)) {
        return errorResponse('FORBIDDEN', 'Only managers can perform overrides', 403);
      }

      const result = await engine.orders.opsOverride(
        orderId,
        actionParams.targetStatus as EngineOrderStatus,
        actionParams.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    default:
      return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  }
}
