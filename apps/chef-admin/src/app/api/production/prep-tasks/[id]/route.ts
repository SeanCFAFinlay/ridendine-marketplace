// ==========================================
// CHEF-ADMIN PRODUCTION API — update prep task (progress persists)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { updatePrepTaskSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/production/prep-tasks/[id] — persist prep progress / status. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-prep-task-update',
      userId: ctx.actor.userId,
      routeKey: 'PATCH:/api/production/prep-tasks/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = updatePrepTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid update', 400);
    }
    const u = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: existing } = await admin
      .from('prep_tasks')
      .select('id, status')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!existing) return errorResponse('NOT_FOUND', 'Prep task not found', 404);

    const patch: Record<string, unknown> = {};
    if (u.title !== undefined) patch.title = u.title;
    if (u.status !== undefined) patch.status = u.status;
    if (u.completedQuantity !== undefined) patch.completed_quantity = u.completedQuantity;
    if (u.targetQuantity !== undefined) patch.target_quantity = u.targetQuantity;
    if (u.stationId !== undefined) patch.station_id = u.stationId;
    if (u.notes !== undefined) patch.notes = u.notes;

    const { data: task, error } = await admin
      .from('prep_tasks')
      .update(patch)
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (error || !task) {
      console.error('Prep task update error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update prep task', 500);
    }

    // Audit status transitions on the task's own event trail.
    if (u.status !== undefined && u.status !== existing.status) {
      await admin.from('prep_task_events').insert({
        prep_task_id: id,
        kitchen_id: ctx.kitchenId,
        event_type: 'status_changed',
        from_status: existing.status,
        to_status: u.status,
        actor_user_id: ctx.actor.userId,
      });
    }

    return successResponse({ task });
  } catch (error) {
    console.error('Error updating prep task:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
