// ==========================================
// CHEF-ADMIN SUPPLIERS API — supplier catalogue item
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { supplierItemSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/suppliers/[id]/items — add a catalogue item and seed price history. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-supplier-item-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/suppliers/[id]/items',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id: supplierId } = await params;
    const parsed = supplierItemSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid supplier item', 400);
    }
    const it = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;

    // Confirm the supplier belongs to this kitchen.
    const { data: supplier } = await admin
      .from('suppliers')
      .select('id')
      .eq('id', supplierId)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!supplier) return errorResponse('NOT_FOUND', 'Supplier not found', 404);

    const { data: item, error } = await admin
      .from('supplier_items')
      .insert({
        supplier_id: supplierId,
        kitchen_id: ctx.kitchenId,
        inventory_item_id: it.inventoryItemId ?? null,
        supplier_sku: it.supplierSku ?? null,
        name: it.name,
        pack_size: it.packSize,
        pack_unit: it.packUnit ?? null,
        unit_cost: it.unitCost,
      })
      .select('*')
      .single();

    if (error || !item) {
      console.error('Supplier item create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create supplier item', 500);
    }

    // Seed price history so future cost changes are traceable.
    await admin.from('supplier_price_history').insert({
      supplier_item_id: item.id,
      kitchen_id: ctx.kitchenId,
      unit_cost: it.unitCost,
      pack_size: it.packSize,
      source: 'manual',
    });

    return successResponse({ item }, 201);
  } catch (error) {
    console.error('Error creating supplier item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
