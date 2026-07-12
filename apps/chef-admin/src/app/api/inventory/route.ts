// ==========================================
// CHEF-ADMIN INVENTORY API — list + create
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createInventoryItemSchema } from '@ridendine/validation';
import { computeStockStatus } from '@ridendine/engine';
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

/** GET /api/inventory — list the storefront's inventory items with stock status. */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('inventory_items')
      .select('*')
      .eq('kitchen_id', ctx.kitchenId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Inventory list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load inventory', 500);
    }

    const items = (data ?? []).map((item) => ({
      ...item,
      stockStatus: computeStockStatus({
        onHand: Number(item.current_quantity ?? 0),
        reorderPoint: item.reorder_point,
        parQuantity: item.par_quantity,
      }),
    }));

    return successResponse({ items });
  } catch (error) {
    console.error('Error listing inventory:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/inventory — create an inventory item (seeds the ledger if it opens with stock). */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-inventory-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/inventory',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createInventoryItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid inventory item', 400);
    }
    const input = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: item, error } = await admin
      .from('inventory_items')
      .insert({
        kitchen_id: ctx.kitchenId,
        name: input.name,
        category: input.category ?? null,
        unit: input.unit,
        current_quantity: input.initialQuantity,
        par_quantity: input.parQuantity ?? null,
        reorder_point: input.reorderPoint ?? null,
        cost_per_unit: input.costPerUnit,
        storage_location_id: input.storageLocationId ?? null,
        expiry_date: input.expiryDate ?? null,
        lot_code: input.lotCode ?? null,
      })
      .select('*')
      .single();

    if (error || !item) {
      console.error('Inventory create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create inventory item', 500);
    }

    // Seed the ledger so on-hand reconciles with the opening quantity.
    if (input.initialQuantity > 0) {
      await admin.from('inventory_stock_movements').insert({
        kitchen_id: ctx.kitchenId,
        inventory_item_id: item.id,
        movement_type: 'receive',
        quantity: input.initialQuantity,
        unit_cost: input.costPerUnit,
        note: 'Opening stock',
        created_by: ctx.actor.userId,
      });
    }

    await getEngine().audit.log({
      action: 'create',
      entityType: 'inventory_item',
      entityId: item.id,
      actor: ctx.actor,
      afterState: { name: item.name, current_quantity: item.current_quantity },
    });

    return successResponse({ item }, 201);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
