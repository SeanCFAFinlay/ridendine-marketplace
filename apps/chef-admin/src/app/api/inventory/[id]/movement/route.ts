// ==========================================
// CHEF-ADMIN INVENTORY API — record a stock movement
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { inventoryMovementSchema } from '@ridendine/validation';
import { signedMovementQuantity, applyMovementToQuantity, type MovementType } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

const SIGNED_TYPES = new Set(['adjustment', 'count_correction', 'transfer']);

/** POST /api/inventory/[id]/movement — append to the ledger and update the cached quantity. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-inventory-movement',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/inventory/[id]/movement',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = inventoryMovementSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid movement', 400);
    }
    const m = parsed.data;
    const type = m.movementType as MovementType;

    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: item } = await admin
      .from('inventory_items')
      .select('id, current_quantity')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!item) return errorResponse('NOT_FOUND', 'Inventory item not found', 404);

    // Directional types use a positive magnitude; the signed group passes through.
    const signedQty = SIGNED_TYPES.has(type)
      ? (m.signedQuantity as number)
      : signedMovementQuantity(type, m.magnitude as number);

    const { data: movement, error: moveErr } = await admin
      .from('inventory_stock_movements')
      .insert({
        kitchen_id: ctx.kitchenId,
        inventory_item_id: id,
        movement_type: type,
        quantity: signedQty,
        unit_cost: m.unitCost ?? null,
        reference_type: m.referenceType ?? null,
        reference_id: m.referenceId ?? null,
        note: m.note ?? null,
        created_by: ctx.actor.userId,
      })
      .select('*')
      .single();

    if (moveErr || !movement) {
      console.error('Inventory movement error:', moveErr);
      return errorResponse('INTERNAL_ERROR', 'Failed to record movement', 500);
    }

    const newQuantity = applyMovementToQuantity(Number(item.current_quantity ?? 0), signedQty);
    const { data: updated, error: updErr } = await admin
      .from('inventory_items')
      .update({ current_quantity: newQuantity })
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (updErr) {
      console.error('Inventory quantity sync error:', updErr);
      return errorResponse('INTERNAL_ERROR', 'Movement recorded but quantity sync failed', 500);
    }

    return successResponse({ movement, item: updated });
  } catch (error) {
    console.error('Error recording inventory movement:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
