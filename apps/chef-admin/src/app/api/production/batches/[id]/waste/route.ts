// ==========================================
// CHEF-ADMIN PRODUCTION API — record batch waste (overproduction)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { batchWasteSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/** POST /api/production/batches/[id]/waste — add wasted (overproduced) yield to the batch. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-batch-waste',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/production/batches/[id]/waste',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = batchWasteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid waste entry', 400);
    }
    const { quantity, reason } = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: batch } = await admin
      .from('production_batches')
      .select('id, waste_quantity, notes')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!batch) return errorResponse('NOT_FOUND', 'Batch not found', 404);

    const newWaste = Number(batch.waste_quantity ?? 0) + quantity;
    const noteAppend = reason ? `${batch.notes ? `${batch.notes}\n` : ''}Waste: ${quantity} (${reason})` : batch.notes;

    const { data: updated, error } = await admin
      .from('production_batches')
      .update({ waste_quantity: newWaste, notes: noteAppend ?? null })
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (error || !updated) {
      console.error('Batch waste error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to record batch waste', 500);
    }
    return successResponse({ batch: updated });
  } catch (error) {
    console.error('Error recording batch waste:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
