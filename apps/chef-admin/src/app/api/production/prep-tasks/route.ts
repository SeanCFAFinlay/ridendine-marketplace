// ==========================================
// CHEF-ADMIN PRODUCTION API — create prep task
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createPrepTaskSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** POST /api/production/prep-tasks — add a persistent prep task. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-prep-task-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/production/prep-tasks',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createPrepTaskSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid prep task', 400);
    }
    const t = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: task, error } = await admin
      .from('prep_tasks')
      .insert({
        kitchen_id: ctx.kitchenId,
        title: t.title,
        menu_item_id: t.menuItemId ?? null,
        station_id: t.stationId ?? null,
        target_quantity: t.targetQuantity ?? null,
        plan_date: t.planDate,
        notes: t.notes ?? null,
        created_by: ctx.actor.userId,
      })
      .select('*')
      .single();

    if (error || !task) {
      console.error('Prep task create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create prep task', 500);
    }
    return successResponse({ task }, 201);
  } catch (error) {
    console.error('Error creating prep task:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
