// ==========================================
// CHEF-ADMIN PRODUCTION API — complete a batch
//
// Consumes the batch's inputs from inventory (consume_batch movements) and adds
// any produced outputs to inventory (receive movements), then records the actual
// yield and waste. Ties production to the Stage 7 stock ledger.
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { completeBatchSchema } from '@ridendine/validation';
import { applyMovementToQuantity } from '@ridendine/engine';
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

async function adjustInventory(
  admin: SupabaseClient,
  kitchenId: string,
  inventoryItemId: string,
  signedQty: number,
  movementType: 'consume_batch' | 'receive',
  batchId: string,
  userId: string
) {
  // inventory_items is the shared commissary pool — scope by kitchen_id.
  const { data: item } = await admin
    .from('inventory_items')
    .select('id, current_quantity')
    .eq('id', inventoryItemId)
    .eq('kitchen_id', kitchenId)
    .maybeSingle();
  if (!item) return false;

  await admin.from('inventory_stock_movements').insert({
    kitchen_id: kitchenId,
    inventory_item_id: inventoryItemId,
    movement_type: movementType,
    quantity: signedQty,
    reference_type: 'production_batch',
    reference_id: batchId,
    note: movementType === 'consume_batch' ? 'Batch input' : 'Batch output',
    created_by: userId,
  });
  await admin
    .from('inventory_items')
    .update({ current_quantity: applyMovementToQuantity(Number(item.current_quantity ?? 0), signedQty) })
    .eq('id', inventoryItemId)
    .eq('kitchen_id', kitchenId);
  return true;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-batch-complete',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/production/batches/[id]/complete',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = completeBatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid completion', 400);
    }
    const c = parsed.data;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: batch } = await admin
      .from('production_batches')
      .select('id, status')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!batch) return errorResponse('NOT_FOUND', 'Batch not found', 404);
    if (batch.status === 'completed' || batch.status === 'cancelled') {
      return errorResponse('CONFLICT', `Cannot complete a ${batch.status} batch`, 409);
    }

    // Consume inputs (only those not already consumed).
    const { data: inputs } = await admin
      .from('production_batch_inputs')
      .select('*')
      .eq('batch_id', id);
    let consumed = 0;
    for (const input of inputs ?? []) {
      if (input.consumed || !input.inventory_item_id || Number(input.quantity ?? 0) <= 0) continue;
      const ok = await adjustInventory(
        admin,
        ctx.kitchenId,
        input.inventory_item_id,
        -Math.abs(Number(input.quantity)),
        'consume_batch',
        id,
        ctx.actor.userId
      );
      if (ok) {
        consumed += 1;
        await admin.from('production_batch_inputs').update({ consumed: true }).eq('id', input.id);
      }
    }

    // Produce outputs (prepared stock back into inventory).
    let produced = 0;
    for (const output of c.outputs) {
      await admin.from('production_batch_outputs').insert({
        batch_id: id,
        inventory_item_id: output.inventoryItemId ?? null,
        menu_item_id: output.menuItemId ?? null,
        quantity: output.quantity,
      });
      if (output.inventoryItemId && output.quantity > 0) {
        const ok = await adjustInventory(
          admin,
          ctx.kitchenId,
          output.inventoryItemId,
          Math.abs(output.quantity),
          'receive',
          id,
          ctx.actor.userId
        );
        if (ok) produced += 1;
      }
    }

    const { data: updated, error } = await admin
      .from('production_batches')
      .update({
        status: 'completed',
        actual_yield: c.actualYield,
        waste_quantity: c.wasteQuantity,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (error || !updated) {
      console.error('Batch complete error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to complete batch', 500);
    }

    await getEngine().audit.log({
      action: 'update',
      entityType: 'production_batch',
      entityId: id,
      actor: ctx.actor,
      afterState: { status: 'completed', actualYield: c.actualYield, consumed, produced },
    });

    return successResponse({ batch: updated, inputsConsumed: consumed, outputsProduced: produced });
  } catch (error) {
    console.error('Error completing batch:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
