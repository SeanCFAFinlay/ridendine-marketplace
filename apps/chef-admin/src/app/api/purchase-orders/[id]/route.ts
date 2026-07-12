// ==========================================
// CHEF-ADMIN PURCHASE ORDERS API — detail + update
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { updatePurchaseOrderSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/purchase-orders/[id] — order plus its lines. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const { id } = await params;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: order } = await admin
      .from('purchase_orders')
      .select('*')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!order) return errorResponse('NOT_FOUND', 'Purchase order not found', 404);

    const { data: lines } = await admin
      .from('purchase_order_lines')
      .select('*')
      .eq('purchase_order_id', id)
      .order('created_at', { ascending: true });

    return successResponse({ purchaseOrder: order, lines: lines ?? [] });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** PATCH /api/purchase-orders/[id] — update draft fields / submit / cancel. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-po-update',
      userId: ctx.actor.userId,
      routeKey: 'PATCH:/api/purchase-orders/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = updatePurchaseOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid update', 400);
    }
    const u = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: existing } = await admin
      .from('purchase_orders')
      .select('id, status')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!existing) return errorResponse('NOT_FOUND', 'Purchase order not found', 404);
    if (existing.status === 'received') {
      return errorResponse('CONFLICT', 'A received purchase order can no longer be edited', 409);
    }

    const patch: Record<string, unknown> = {};
    if (u.reference !== undefined) patch.reference = u.reference;
    if (u.notes !== undefined) patch.notes = u.notes;
    if (u.expectedAt !== undefined) patch.expected_at = u.expectedAt;
    if (u.status !== undefined) {
      patch.status = u.status;
      if (u.status === 'submitted') patch.submitted_at = new Date().toISOString();
    }

    const { data: order, error } = await admin
      .from('purchase_orders')
      .update(patch)
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (error || !order) {
      console.error('Purchase order update error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update purchase order', 500);
    }
    return successResponse({ purchaseOrder: order });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
