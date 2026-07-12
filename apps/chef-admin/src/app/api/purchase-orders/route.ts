// ==========================================
// CHEF-ADMIN PURCHASE ORDERS API — list + create
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createPurchaseOrderSchema } from '@ridendine/validation';
import { purchaseOrderTotal } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  getEngine,
  getOperatorKitchenContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** GET /api/purchase-orders — the storefront's purchase orders. */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('purchase_orders')
      .select('*')
      .eq('kitchen_id', ctx.kitchenId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Purchase orders list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load purchase orders', 500);
    }
    return successResponse({ purchaseOrders: data ?? [] });
  } catch (error) {
    console.error('Error listing purchase orders:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/purchase-orders — create a draft purchase order with lines. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-po-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/purchase-orders',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createPurchaseOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid purchase order', 400);
    }
    const po = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;

    // If a supplier is named, it must belong to this kitchen (suppliers are a
    // shared commissary list, not per-brand).
    if (po.supplierId) {
      const { data: supplier } = await admin
        .from('suppliers')
        .select('id')
        .eq('id', po.supplierId)
        .eq('kitchen_id', ctx.kitchenId)
        .maybeSingle();
      if (!supplier) return errorResponse('VALIDATION_ERROR', 'Supplier not found for your kitchen', 400);
    }

    const total = purchaseOrderTotal(po.lines.map((l) => ({ quantity: l.quantity, unitCost: l.unitCost })));

    const { data: order, error } = await admin
      .from('purchase_orders')
      .insert({
        kitchen_id: ctx.kitchenId,
        supplier_id: po.supplierId ?? null,
        status: 'draft',
        reference: po.reference ?? null,
        notes: po.notes ?? null,
        total_cost: total,
        expected_at: po.expectedAt ?? null,
        created_by: ctx.actor.userId,
      })
      .select('*')
      .single();

    if (error || !order) {
      console.error('Purchase order create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create purchase order', 500);
    }

    const lineRows = po.lines.map((l) => ({
      purchase_order_id: order.id,
      supplier_item_id: l.supplierItemId ?? null,
      inventory_item_id: l.inventoryItemId ?? null,
      description: l.description ?? null,
      quantity: l.quantity,
      pack_size: l.packSize,
      unit_cost: l.unitCost,
    }));
    const { error: linesErr } = await admin.from('purchase_order_lines').insert(lineRows);
    if (linesErr) {
      console.error('Purchase order lines error:', linesErr);
      return errorResponse('INTERNAL_ERROR', 'Purchase order created but lines failed', 500);
    }

    await getEngine().audit.log({
      action: 'create',
      entityType: 'purchase_order',
      entityId: order.id,
      actor: ctx.actor,
      afterState: { total_cost: total, lines: po.lines.length },
    });

    return successResponse({ purchaseOrder: order, lineCount: po.lines.length }, 201);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
