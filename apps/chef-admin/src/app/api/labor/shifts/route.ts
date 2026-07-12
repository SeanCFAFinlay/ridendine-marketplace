// ==========================================
// CHEF-ADMIN LABOUR API — shifts list + create
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createShiftSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** GET /api/labor/shifts — upcoming/recent shifts. */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('kitchen_shifts')
      .select('*')
      .eq('kitchen_id', ctx.kitchenId)
      .order('scheduled_start', { ascending: true });

    if (error) {
      console.error('Shifts list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load shifts', 500);
    }
    return successResponse({ shifts: data ?? [] });
  } catch (error) {
    console.error('Error listing shifts:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/labor/shifts — schedule a shift. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-shift-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/labor/shifts',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createShiftSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid shift', 400);
    }
    const sh = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    // Staff must belong to this kitchen.
    const { data: staff } = await admin
      .from('kitchen_staff')
      .select('id')
      .eq('id', sh.staffId)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!staff) return errorResponse('VALIDATION_ERROR', 'Staff not found for your kitchen', 400);

    const { data: shift, error } = await admin
      .from('kitchen_shifts')
      .insert({
        kitchen_id: ctx.kitchenId,
        staff_id: sh.staffId,
        scheduled_start: sh.scheduledStart,
        scheduled_end: sh.scheduledEnd,
        role: sh.role ?? null,
        station_id: sh.stationId ?? null,
        notes: sh.notes ?? null,
      })
      .select('*')
      .single();

    if (error || !shift) {
      console.error('Shift create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create shift', 500);
    }
    return successResponse({ shift }, 201);
  } catch (error) {
    console.error('Error creating shift:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
