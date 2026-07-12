// ==========================================
// CHEF-ADMIN PRODUCTION API — create batch
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createProductionBatchSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** POST /api/production/batches — plan a production batch with its inputs. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-batch-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/production/batches',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createProductionBatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid batch', 400);
    }
    const b = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: batch, error } = await admin
      .from('production_batches')
      .insert({
        kitchen_id: ctx.kitchenId,
        recipe_version_id: b.recipeVersionId ?? null,
        menu_item_id: b.menuItemId ?? null,
        name: b.name,
        planned_yield: b.plannedYield ?? null,
        plan_date: b.planDate ?? null,
        notes: b.notes ?? null,
        created_by: ctx.actor.userId,
      })
      .select('*')
      .single();

    if (error || !batch) {
      console.error('Batch create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create batch', 500);
    }

    if (b.inputs.length > 0) {
      const inputRows = b.inputs.map((i) => ({
        batch_id: batch.id,
        inventory_item_id: i.inventoryItemId ?? null,
        quantity: i.quantity,
        unit: i.unit ?? null,
      }));
      const { error: inputsErr } = await admin.from('production_batch_inputs').insert(inputRows);
      if (inputsErr) {
        console.error('Batch inputs error:', inputsErr);
        return errorResponse('INTERNAL_ERROR', 'Batch created but inputs failed', 500);
      }
    }

    return successResponse({ batch, inputCount: b.inputs.length }, 201);
  } catch (error) {
    console.error('Error creating batch:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
