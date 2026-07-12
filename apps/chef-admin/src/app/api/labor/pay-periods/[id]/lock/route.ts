// ==========================================
// CHEF-ADMIN LABOUR API — lock a pay period (Phase D.1)
//
// Locking freezes the period's time_entries (enforced by the DB trigger
// trg_block_locked_time_entries) so hours can't drift before/after export.
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { evaluateRateLimit, RATE_LIMIT_POLICIES, rateLimitPolicyResponse } from '@ridendine/utils';
import { getEngine, getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-pay-period-lock',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/labor/pay-periods/[id]/lock',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: period } = await admin
      .from('pay_periods')
      .select('id, status')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!period) return errorResponse('NOT_FOUND', 'Pay period not found', 404);
    if (period.status !== 'open') {
      return errorResponse('CONFLICT', `Pay period is already ${period.status}`, 409);
    }

    const { data: updated, error } = await admin
      .from('pay_periods')
      .update({ status: 'locked', locked_at: new Date().toISOString(), locked_by: ctx.actor.userId })
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();
    if (error || !updated) {
      console.error('Pay period lock error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to lock pay period', 500);
    }

    await getEngine().audit.log({
      action: 'update',
      entityType: 'pay_period',
      entityId: id,
      actor: ctx.actor,
      afterState: { status: 'locked' },
    });

    return successResponse({ payPeriod: updated });
  } catch (error) {
    console.error('Error locking pay period:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
