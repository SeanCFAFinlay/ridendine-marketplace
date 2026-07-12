// ==========================================
// CHEF-ADMIN INVENTORY API — item detail + update
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { updateInventoryItemSchema } from '@ridendine/validation';
import { computeOnHand, computeStockStatus, computeReorderSuggestion } from '@ridendine/engine';
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

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/inventory/[id] — item, ledger-derived on-hand, recent movements. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const { id } = await params;
    const admin = createAdminClient() as unknown as SupabaseClient;

    // Scoping by kitchen_id is the ownership check.
    const { data: item } = await admin
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();

    if (!item) return errorResponse('NOT_FOUND', 'Inventory item not found', 404);

    const { data: movements } = await admin
      .from('inventory_stock_movements')
      .select('id, movement_type, quantity, unit_cost, note, created_at')
      .eq('inventory_item_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    const onHand = computeOnHand((movements ?? []).map((m) => ({ quantity: Number(m.quantity) })));
    const statusInput = {
      onHand: Number(item.current_quantity ?? 0),
      reorderPoint: item.reorder_point,
      parQuantity: item.par_quantity,
    };

    return successResponse({
      item,
      ledgerOnHand: onHand,
      stockStatus: computeStockStatus(statusInput),
      reorderSuggestion: computeReorderSuggestion(statusInput),
      movements: movements ?? [],
    });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** PATCH /api/inventory/[id] — update item fields (not quantity; that goes through movements). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-inventory-update',
      userId: ctx.actor.userId,
      routeKey: 'PATCH:/api/inventory/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = updateInventoryItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid update', 400);
    }
    const u = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;

    // Ensure the item exists in this kitchen before updating.
    const { data: existing } = await admin
      .from('inventory_items')
      .select('id')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!existing) return errorResponse('NOT_FOUND', 'Inventory item not found', 404);

    const patch: Record<string, unknown> = {};
    if (u.name !== undefined) patch.name = u.name;
    if (u.category !== undefined) patch.category = u.category;
    if (u.unit !== undefined) patch.unit = u.unit;
    if (u.parQuantity !== undefined) patch.par_quantity = u.parQuantity;
    if (u.reorderPoint !== undefined) patch.reorder_point = u.reorderPoint;
    if (u.costPerUnit !== undefined) patch.cost_per_unit = u.costPerUnit;
    if (u.storageLocationId !== undefined) patch.storage_location_id = u.storageLocationId;
    if (u.expiryDate !== undefined) patch.expiry_date = u.expiryDate;
    if (u.lotCode !== undefined) patch.lot_code = u.lotCode;
    if (u.isActive !== undefined) patch.is_active = u.isActive;

    const { data: item, error } = await admin
      .from('inventory_items')
      .update(patch)
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (error || !item) {
      console.error('Inventory update error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update inventory item', 500);
    }

    await getEngine().audit.log({
      action: 'update',
      entityType: 'inventory_item',
      entityId: id,
      actor: ctx.actor,
      afterState: patch,
    });

    return successResponse({ item });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
