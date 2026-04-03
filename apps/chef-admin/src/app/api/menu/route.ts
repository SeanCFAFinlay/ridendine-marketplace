// ==========================================
// CHEF-ADMIN MENU API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  createMenuItem,
  getMenuCategoriesByStorefront,
  getMenuItemsByStorefront,
  type SupabaseClient,
} from '@ridendine/db';
import {
  getEngine,
  getChefActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/menu
 * Get all menu items for the chef's storefront
 */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const menuItems = await getMenuItemsByStorefront(adminClient, chefContext.storefrontId, {
      includeUnavailable: true,
    });

    return successResponse({ menuItems: menuItems || [] });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * POST /api/menu
 * Create a new menu item
 */
export async function POST(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      category_id,
      image_url,
      is_available,
      is_featured,
      sort_order,
      dietary_tags,
      prep_time_minutes,
    } = body;

    if (!name || price === undefined || !category_id) {
      return errorResponse('MISSING_FIELDS', 'Required fields: name, price, category_id');
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const engine = getEngine();

    // Verify category belongs to this storefront
    const categories = await getMenuCategoriesByStorefront(adminClient, chefContext.storefrontId);
    const category = categories.find((entry) => entry.id === category_id);

    if (!category) {
      return errorResponse('INVALID_CATEGORY', 'Category not found or does not belong to your storefront');
    }

    const menuItem = await createMenuItem(adminClient, {
        storefront_id: chefContext.storefrontId,
        name,
        description: description || null,
        price,
        category_id,
        image_url: image_url || null,
        is_available: is_available !== undefined ? is_available : true,
        is_featured: is_featured !== undefined ? is_featured : false,
        sort_order: sort_order !== undefined ? sort_order : 0,
        dietary_tags: dietary_tags || [],
        prep_time_minutes: prep_time_minutes || null,
      });

    // Log the creation via audit
    await engine.audit.log({
      action: 'create',
      entityType: 'menu_item',
      entityId: menuItem.id,
      actor: chefContext.actor,
      afterState: { name, price, category_id },
    });

    return successResponse({ menuItem }, 201);
  } catch (error) {
    console.error('Error creating menu item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
