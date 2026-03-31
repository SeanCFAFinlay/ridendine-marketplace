// ==========================================
// CHEF-ADMIN MENU ITEM API
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Verify chef owns this menu item
 */
async function verifyMenuItemOwnership(
  storefrontId: string,
  menuItemId: string
): Promise<{ menuItem: Record<string, unknown> | null; owns: boolean }> {
  const adminClient = createAdminClient();
  const { data: menuItem } = await adminClient
    .from('menu_items')
    .select('*')
    .eq('id', menuItemId)
    .single();

  if (!menuItem) {
    return { menuItem: null, owns: false };
  }

  return {
    menuItem,
    owns: menuItem.storefront_id === storefrontId,
  };
}

/**
 * GET /api/menu/[id]
 * Get a specific menu item
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: menuItemId } = await params;

    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const { menuItem, owns } = await verifyMenuItemOwnership(
      chefContext.storefrontId,
      menuItemId
    );

    if (!menuItem) {
      return errorResponse('NOT_FOUND', 'Menu item not found', 404);
    }

    if (!owns) {
      return errorResponse('FORBIDDEN', 'This menu item does not belong to your storefront', 403);
    }

    return successResponse({ menuItem });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * PATCH /api/menu/[id]
 * Update a menu item
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: menuItemId } = await params;

    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const { menuItem: existingItem, owns } = await verifyMenuItemOwnership(
      chefContext.storefrontId,
      menuItemId
    );

    if (!existingItem) {
      return errorResponse('NOT_FOUND', 'Menu item not found', 404);
    }

    if (!owns) {
      return errorResponse('FORBIDDEN', 'This menu item does not belong to your storefront', 403);
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      category_id,
      is_available,
      is_featured,
      image_url,
      sort_order,
      dietary_tags,
      prep_time_minutes,
    } = body;

    const adminClient = createAdminClient();
    const engine = getEngine();

    // Build updates
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (category_id !== undefined) {
      // Verify new category belongs to this storefront
      const { data: category } = await adminClient
        .from('menu_categories')
        .select('storefront_id')
        .eq('id', category_id)
        .single();

      if (!category || category.storefront_id !== chefContext.storefrontId) {
        return errorResponse('INVALID_CATEGORY', 'Category not found or does not belong to your storefront');
      }
      updates.category_id = category_id;
    }
    if (is_available !== undefined) updates.is_available = is_available;
    if (is_featured !== undefined) updates.is_featured = is_featured;
    if (image_url !== undefined) updates.image_url = image_url;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (dietary_tags !== undefined) updates.dietary_tags = dietary_tags;
    if (prep_time_minutes !== undefined) updates.prep_time_minutes = prep_time_minutes;

    if (Object.keys(updates).length === 0) {
      return errorResponse('NO_UPDATES', 'No fields to update');
    }

    updates.updated_at = new Date().toISOString();

    const { data: menuItem, error } = await adminClient
      .from('menu_items')
      .update(updates)
      .eq('id', menuItemId)
      .select()
      .single();

    if (error) {
      return errorResponse('UPDATE_ERROR', error.message);
    }

    // Log the update via audit
    await engine.audit.log({
      action: 'update',
      entityType: 'menu_item',
      entityId: menuItemId,
      actor: chefContext.actor,
      afterState: updates,
    });

    return successResponse({ menuItem });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * DELETE /api/menu/[id]
 * Delete a menu item
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: menuItemId } = await params;

    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const { menuItem, owns } = await verifyMenuItemOwnership(
      chefContext.storefrontId,
      menuItemId
    );

    if (!menuItem) {
      return errorResponse('NOT_FOUND', 'Menu item not found', 404);
    }

    if (!owns) {
      return errorResponse('FORBIDDEN', 'This menu item does not belong to your storefront', 403);
    }

    const adminClient = createAdminClient();
    const engine = getEngine();

    // Soft delete by marking as unavailable and adding deleted flag
    const { error } = await adminClient
      .from('menu_items')
      .update({
        is_available: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', menuItemId);

    if (error) {
      return errorResponse('DELETE_ERROR', error.message);
    }

    // Log the deletion via audit
    await engine.audit.log({
      action: 'delete',
      entityType: 'menu_item',
      entityId: menuItemId,
      actor: chefContext.actor,
      beforeState: { name: menuItem.name },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
