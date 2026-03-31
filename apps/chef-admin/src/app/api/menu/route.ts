// ==========================================
// CHEF-ADMIN MENU API
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
 * GET /api/menu
 * Get all menu items for the chef's storefront
 */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();

    const { data: menuItems, error } = await adminClient
      .from('menu_items')
      .select(`
        *,
        category:menu_categories (id, name, sort_order)
      `)
      .eq('storefront_id', chefContext.storefrontId)
      .order('sort_order', { ascending: true });

    if (error) {
      return errorResponse('FETCH_ERROR', error.message);
    }

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

    const adminClient = createAdminClient();
    const engine = getEngine();

    // Verify category belongs to this storefront
    const { data: category } = await adminClient
      .from('menu_categories')
      .select('storefront_id')
      .eq('id', category_id)
      .single();

    if (!category || category.storefront_id !== chefContext.storefrontId) {
      return errorResponse('INVALID_CATEGORY', 'Category not found or does not belong to your storefront');
    }

    const { data: menuItem, error } = await adminClient
      .from('menu_items')
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      return errorResponse('CREATE_ERROR', error.message);
    }

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
