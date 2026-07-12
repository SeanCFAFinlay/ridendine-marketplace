// ==========================================
// CHEF-ADMIN LABOUR API — pay periods list + create (Phase D.1)
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { evaluateRateLimit, RATE_LIMIT_POLICIES, rateLimitPolicyResponse } from '@ridendine/utils';
import { getEngine, getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** GET /api/labor/pay-periods — the kitchen's pay periods, newest first. */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('pay_periods')
      .select('*')
      .eq('kitchen_id', ctx.kitchenId)
      .order('starts_on', { ascending: false });
    if (error) {
      console.error('Pay periods list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load pay periods', 500);
    }
    return successResponse({ payPeriods: data ?? [] });
  } catch (error) {
    console.error('Error listing pay periods:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/labor/pay-periods — open a new pay period. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-pay-period-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/labor/pay-periods',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const body = await request.json().catch(() => null);
    const startsOn = body?.startsOn;
    const endsOn = body?.endsOn;
    if (typeof startsOn !== 'string' || typeof endsOn !== 'string' || !DATE.test(startsOn) || !DATE.test(endsOn) || endsOn < startsOn) {
      return errorResponse('VALIDATION_ERROR', 'startsOn/endsOn must be YYYY-MM-DD with endsOn >= startsOn', 400);
    }

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('pay_periods')
      .insert({ kitchen_id: ctx.kitchenId, starts_on: startsOn, ends_on: endsOn, status: 'open' })
      .select('*')
      .single();
    if (error || !data) {
      console.error('Pay period create error:', error);
      return errorResponse('CONFLICT', 'Could not create pay period (does it overlap an existing one?)', 409);
    }

    await getEngine().audit.log({
      action: 'create',
      entityType: 'pay_period',
      entityId: data.id,
      actor: ctx.actor,
      afterState: { starts_on: startsOn, ends_on: endsOn },
    });

    return successResponse({ payPeriod: data }, 201);
  } catch (error) {
    console.error('Error creating pay period:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
