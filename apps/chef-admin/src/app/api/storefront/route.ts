// ==========================================
// CHEF-ADMIN STOREFRONT API
// Powered by Central Engine
// ==========================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getChefActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/storefront
 * Get current chef's storefront
 */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();

    // Get storefront with kitchen info
    const { data: storefront, error } = await adminClient
      .from('chef_storefronts')
      .select(`
        *,
        kitchen:chef_kitchens (
          id,
          address,
          lat,
          lng,
          is_verified
        )
      `)
      .eq('id', chefContext.storefrontId)
      .single();

    if (error || !storefront) {
      return errorResponse('NOT_FOUND', 'Storefront not found', 404);
    }

    return successResponse({
      storefront,
    });
  } catch (error) {
    console.error('Error fetching storefront:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * PATCH /api/storefront
 * Update storefront settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const {
      name,
      description,
      cuisine_types,
      min_order_amount,
      estimated_prep_time_min,
      estimated_prep_time_max,
      is_active,
      accepting_orders,
    } = body;

    const adminClient = createAdminClient();
    const engine = getEngine();

    // Build updates object
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (cuisine_types !== undefined) updates.cuisine_types = cuisine_types;
    if (min_order_amount !== undefined) updates.min_order_amount = min_order_amount;
    if (estimated_prep_time_min !== undefined) updates.estimated_prep_time_min = estimated_prep_time_min;
    if (estimated_prep_time_max !== undefined) updates.estimated_prep_time_max = estimated_prep_time_max;
    if (is_active !== undefined) updates.is_active = is_active;
    if (accepting_orders !== undefined) updates.accepting_orders = accepting_orders;

    if (Object.keys(updates).length === 0) {
      return errorResponse('NO_UPDATES', 'No fields to update');
    }

    updates.updated_at = new Date().toISOString();

    const { data: storefront, error } = await adminClient
      .from('chef_storefronts')
      .update(updates)
      .eq('id', chefContext.storefrontId)
      .select()
      .single();

    if (error) {
      return errorResponse('UPDATE_ERROR', error.message);
    }

    // Log the update via audit
    await engine.audit.log({
      action: 'update',
      entityType: 'storefront',
      entityId: chefContext.storefrontId,
      actor: chefContext.actor,
      afterState: updates,
    });

    return successResponse({ storefront });
  } catch (error) {
    console.error('Error updating storefront:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
