// ==========================================
// CHEF-ADMIN LABOUR API — staff list + create
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createStaffSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** GET /api/labor/staff — kitchen staff for this storefront. */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('kitchen_staff')
      .select('*')
      .eq('kitchen_id', ctx.kitchenId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Staff list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load staff', 500);
    }
    return successResponse({ staff: data ?? [] });
  } catch (error) {
    console.error('Error listing staff:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/labor/staff — add a staff member. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-staff-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/labor/staff',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createStaffSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid staff', 400);
    }
    const s = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: staff, error } = await admin
      .from('kitchen_staff')
      .insert({
        kitchen_id: ctx.kitchenId,
        name: s.name,
        role: s.role ?? null,
        station_id: s.stationId ?? null,
        hourly_rate: s.hourlyRate,
        user_id: s.userId ?? null,
      })
      .select('*')
      .single();

    if (error || !staff) {
      console.error('Staff create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create staff', 500);
    }
    return successResponse({ staff }, 201);
  } catch (error) {
    console.error('Error creating staff:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
