// ==========================================
// CHEF-ADMIN SUPPLIERS API — detail + update
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { updateSupplierSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/suppliers/[id] — supplier plus its catalogue items. */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const { id } = await params;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: supplier } = await admin
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!supplier) return errorResponse('NOT_FOUND', 'Supplier not found', 404);

    const { data: items } = await admin
      .from('supplier_items')
      .select('*')
      .eq('supplier_id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .order('name', { ascending: true });

    return successResponse({ supplier, items: items ?? [] });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** PATCH /api/suppliers/[id] — update supplier fields. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-supplier-update',
      userId: ctx.actor.userId,
      routeKey: 'PATCH:/api/suppliers/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const parsed = updateSupplierSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid update', 400);
    }
    const u = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: existing } = await admin
      .from('suppliers')
      .select('id')
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .maybeSingle();
    if (!existing) return errorResponse('NOT_FOUND', 'Supplier not found', 404);

    const patch: Record<string, unknown> = {};
    if (u.name !== undefined) patch.name = u.name;
    if (u.contactName !== undefined) patch.contact_name = u.contactName;
    if (u.email !== undefined) patch.email = u.email;
    if (u.phone !== undefined) patch.phone = u.phone;
    if (u.notes !== undefined) patch.notes = u.notes;
    if (u.isActive !== undefined) patch.is_active = u.isActive;

    const { data: supplier, error } = await admin
      .from('suppliers')
      .update(patch)
      .eq('id', id)
      .eq('kitchen_id', ctx.kitchenId)
      .select('*')
      .single();

    if (error || !supplier) {
      console.error('Supplier update error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update supplier', 500);
    }
    return successResponse({ supplier });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
