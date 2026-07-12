// ==========================================
// CHEF-ADMIN SUPPLIERS API — list + create
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createSupplierSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  getEngine,
  getOperatorKitchenContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/** GET /api/suppliers — the storefront's suppliers. */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await admin
      .from('suppliers')
      .select('*')
      .eq('kitchen_id', ctx.kitchenId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Suppliers list error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load suppliers', 500);
    }
    return successResponse({ suppliers: data ?? [] });
  } catch (error) {
    console.error('Error listing suppliers:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/** POST /api/suppliers — create a supplier. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-supplier-create',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/suppliers',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = createSupplierSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid supplier', 400);
    }
    const s = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: supplier, error } = await admin
      .from('suppliers')
      .insert({
        kitchen_id: ctx.kitchenId,
        name: s.name,
        contact_name: s.contactName ?? null,
        email: s.email ?? null,
        phone: s.phone ?? null,
        notes: s.notes ?? null,
      })
      .select('*')
      .single();

    if (error || !supplier) {
      console.error('Supplier create error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create supplier', 500);
    }

    await getEngine().audit.log({
      action: 'create',
      entityType: 'supplier',
      entityId: supplier.id,
      actor: ctx.actor,
      afterState: { name: supplier.name },
    });

    return successResponse({ supplier }, 201);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
