// ==========================================
// CHEF-ADMIN LABOUR API — clock out
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { clockOutSchema } from '@ridendine/validation';
import { timeEntryCost } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** POST /api/labor/clock-out — close the open time entry (by id or staff). */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-clock-out',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/labor/clock-out',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = clockOutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid clock-out', 400);
    }
    const { timeEntryId, staffId } = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;

    // Find the open entry, scoped to this kitchen.
    let query = admin
      .from('time_entries')
      .select('*')
      .eq('kitchen_id', ctx.kitchenId)
      .is('clock_out', null);
    query = timeEntryId ? query.eq('id', timeEntryId) : query.eq('staff_id', staffId as string);
    const { data: entry } = await query.order('clock_in', { ascending: false }).limit(1).maybeSingle();

    if (!entry) return errorResponse('NOT_FOUND', 'No open time entry found', 404);

    const clockOut = new Date().toISOString();
    const { data: updated, error } = await admin
      .from('time_entries')
      .update({ clock_out: clockOut })
      .eq('id', entry.id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (error || !updated) {
      console.error('Clock-out error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to clock out', 500);
    }

    const cost = timeEntryCost(
      { clock_in: updated.clock_in, clock_out: updated.clock_out, hourly_rate: Number(updated.hourly_rate ?? 0) },
      new Date()
    );

    return successResponse({ timeEntry: updated, cost: Math.round(cost * 100) / 100 });
  } catch (error) {
    console.error('Error clocking out:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
