// ==========================================
// CHEF-ADMIN PRODUCTION API — update batch
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { updateProductionBatchSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/production/batches/[id] — rename / start / cancel / edit plan. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-batch-update',
      userId: ctx.actor.userId,
      routeKey: 'PATCH:/api/production/batches/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = updateProductionBatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid update', 400);
    }
    const u = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: existing } = await admin
      .from('production_batches')
      .select('id, status')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!existing) return errorResponse('NOT_FOUND', 'Batch not found', 404);
    if (existing.status === 'completed') {
      return errorResponse('CONFLICT', 'A completed batch can no longer be edited', 409);
    }

    const patch: Record<string, unknown> = {};
    if (u.name !== undefined) patch.name = u.name;
    if (u.plannedYield !== undefined) patch.planned_yield = u.plannedYield;
    if (u.notes !== undefined) patch.notes = u.notes;
    if (u.status !== undefined) {
      patch.status = u.status;
      if (u.status === 'in_progress') patch.started_at = new Date().toISOString();
    }

    const { data: batch, error } = await admin
      .from('production_batches')
      .update(patch)
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (error || !batch) {
      console.error('Batch update error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update batch', 500);
    }
    return successResponse({ batch });
  } catch (error) {
    console.error('Error updating batch:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
