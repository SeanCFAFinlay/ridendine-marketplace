// ==========================================
// CHEF-ADMIN STOREFRONT API
// Powered by Central Engine
// ==========================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getChefActorContext,
  getChefBasicContext,
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
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * POST /api/storefront
 * Create a new storefront for the chef
 */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefBasicContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    // Check if chef already has a storefront
    if (chefContext.storefrontId) {
      return errorResponse('ALREADY_EXISTS', 'Storefront already exists', 400);
    }

    const body = await request.json();
    const {
      name,
      description,
      cuisine_types,
      min_order_amount,
      estimated_prep_time_min,
      estimated_prep_time_max,
    } = body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return errorResponse('VALIDATION_ERROR', 'Storefront name is required');
    }

    const adminClient = createAdminClient();
    const engine = getEngine();

    // Check if chef already has a kitchen, or create one
    let kitchenId: string;
    const { data: existingKitchen } = await adminClient
      .from('chef_kitchens')
      .select('id')
      .eq('chef_id', chefContext.chefId)
      .single();

    if (existingKitchen) {
      kitchenId = existingKitchen.id;
    } else {
      // Create a placeholder kitchen (chef will update address later)
      const { data: newKitchen, error: kitchenError } = await adminClient
        .from('chef_kitchens')
        .insert({
          chef_id: chefContext.chefId,
          name: name.trim(),
          street_address: 'To be updated',
          city: 'To be updated',
          state: 'BC',
          postal_code: 'V0V 0V0',
          is_verified: false,
        })
        .select()
        .single();

      if (kitchenError || !newKitchen) {
        console.error('Error creating kitchen:', kitchenError);
        return errorResponse('CREATE_ERROR', 'Failed to create kitchen');
      }
      kitchenId = newKitchen.id;
    }

    // Generate a unique slug
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let suffix = 1;

    // Check for slug uniqueness
    while (true) {
      const { data: existingStorefront } = await adminClient
        .from('chef_storefronts')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!existingStorefront) break;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // Create the storefront
    const { data: storefront, error } = await adminClient
      .from('chef_storefronts')
      .insert({
        chef_id: chefContext.chefId,
        kitchen_id: kitchenId,
        slug,
        name: name.trim(),
        description: description || null,
        cuisine_types: cuisine_types || [],
        min_order_amount: min_order_amount || 0,
        estimated_prep_time_min: estimated_prep_time_min || 15,
        estimated_prep_time_max: estimated_prep_time_max || 45,
        is_active: false, // Start inactive until fully set up
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating storefront:', error);
      return errorResponse('CREATE_ERROR', error.message);
    }

    // Log the creation via audit
    await engine.audit.log({
      action: 'create',
      entityType: 'storefront',
      entityId: storefront.id,
      actor: {
        userId: chefContext.userId,
        role: 'chef_user',
        entityId: chefContext.chefId,
      },
      afterState: storefront,
    });

    return successResponse({ storefront }, 201);
  } catch (error) {
    console.error('Error creating storefront:', error);
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
