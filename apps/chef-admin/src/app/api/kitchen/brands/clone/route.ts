// ==========================================
// CHEF-ADMIN KITCHEN API — clone-a-brand (Ghost-Kitchen Phase D.2)
//
// Spins up a new brand storefront under the SAME commissary kitchen, optionally
// copied from a template brand: menu categories + items, recipes + active
// versions + ingredients, and the active recipe links. Recipe ingredients keep
// their inventory_item_id, so the cloned brand draws from the SHARED kitchen
// pool — no inventory is duplicated. The new brand starts is_active = false so
// the operator reviews before going live. Packaging copy is a follow-up.
// ==========================================

import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@ridendine/db';
// Untyped client: this route copies arbitrary rows (spread + FK remap), so the
// dynamic insert shapes don't fit the generated table Insert types.
import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateRateLimit, RATE_LIMIT_POLICIES, rateLimitPolicyResponse } from '@ridendine/utils';
import { getEngine, getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Strip identity/timestamp columns before re-inserting a copied row.
function stripMeta<T extends Record<string, unknown>>(row: T): Omit<T, 'id' | 'created_at' | 'updated_at'> {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = row as Record<string, unknown>;
  return rest as Omit<T, 'id' | 'created_at' | 'updated_at'>;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-brand-clone',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/kitchen/brands/clone',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const body = await request.json().catch(() => null);
    const name: unknown = body?.name;
    const slug: unknown = body?.slug;
    const cuisineTypes: unknown = body?.cuisineTypes;
    const templateStorefrontId: string | null =
      body?.templateStorefrontId && body.templateStorefrontId !== 'blank' ? body.templateStorefrontId : null;

    if (typeof name !== 'string' || !name.trim()) return errorResponse('VALIDATION_ERROR', 'name is required', 400);
    if (typeof slug !== 'string' || !SLUG.test(slug)) return errorResponse('VALIDATION_ERROR', 'slug must be kebab-case', 400);

    const admin = createAdminClient() as unknown as SupabaseClient;

    // Template (if any) must belong to this kitchen.
    if (templateStorefrontId) {
      const { data: tpl } = await admin
        .from('chef_storefronts')
        .select('id')
        .eq('id', templateStorefrontId)
        .eq('kitchen_id', ctx.kitchenId)
        .maybeSingle();
      if (!tpl) return errorResponse('NOT_FOUND', 'Template brand not found in this kitchen', 404);
    }

    const newStorefrontId = randomUUID();
    const { error: sfErr } = await admin.from('chef_storefronts').insert({
      id: newStorefrontId,
      chef_id: ctx.actor.entityId,
      kitchen_id: ctx.kitchenId,
      slug,
      name: name.trim(),
      cuisine_types: Array.isArray(cuisineTypes) ? cuisineTypes : [],
      is_active: false,
    });
    if (sfErr) {
      console.error('Clone: storefront insert error', sfErr);
      return errorResponse('CONFLICT', 'Could not create brand (is the slug taken?)', 409);
    }

    let copied = { menuCategories: 0, menuItems: 0, recipes: 0, recipeVersions: 0, recipeIngredients: 0 };

    if (templateStorefrontId) {
      // 1) menu_categories
      const { data: cats } = await admin.from('menu_categories').select('*').eq('storefront_id', templateStorefrontId);
      const catMap = new Map<string, string>();
      const catRows = (cats ?? []).map((c) => {
        const newId = randomUUID();
        catMap.set(c.id, newId);
        return { ...stripMeta(c), id: newId, storefront_id: newStorefrontId };
      });
      if (catRows.length) await admin.from('menu_categories').insert(catRows);

      // 2) menu_items
      const { data: items } = await admin.from('menu_items').select('*').eq('storefront_id', templateStorefrontId);
      const itemMap = new Map<string, string>();
      const itemRows = (items ?? []).map((it) => {
        const newId = randomUUID();
        itemMap.set(it.id, newId);
        return {
          ...stripMeta(it),
          id: newId,
          storefront_id: newStorefrontId,
          category_id: catMap.get(it.category_id) ?? it.category_id,
          daily_sold: 0,
        };
      });
      if (itemRows.length) await admin.from('menu_items').insert(itemRows);

      // 3) recipes
      const { data: recipes } = await admin.from('recipes').select('*').eq('storefront_id', templateStorefrontId);
      const recipeMap = new Map<string, string>();
      const recipeRows = (recipes ?? []).map((r) => {
        const newId = randomUUID();
        recipeMap.set(r.id, newId);
        return {
          ...stripMeta(r),
          id: newId,
          storefront_id: newStorefrontId,
          menu_item_id: r.menu_item_id ? itemMap.get(r.menu_item_id) ?? null : null,
        };
      });
      if (recipeRows.length) await admin.from('recipes').insert(recipeRows);

      // 4) recipe_versions (for the copied recipes)
      const templateRecipeIds = (recipes ?? []).map((r) => r.id);
      const versionMap = new Map<string, string>();
      let versionRows: Record<string, unknown>[] = [];
      if (templateRecipeIds.length) {
        const { data: versions } = await admin.from('recipe_versions').select('*').in('recipe_id', templateRecipeIds);
        versionRows = (versions ?? []).map((v) => {
          const newId = randomUUID();
          versionMap.set(v.id, newId);
          return { ...stripMeta(v), id: newId, recipe_id: recipeMap.get(v.recipe_id) ?? v.recipe_id };
        });
        if (versionRows.length) await admin.from('recipe_versions').insert(versionRows);
      }

      // 5) recipe_ingredients — KEEP inventory_item_id (shared kitchen pool).
      const templateVersionIds = [...versionMap.keys()];
      let ingredientCount = 0;
      if (templateVersionIds.length) {
        const { data: ings } = await admin.from('recipe_ingredients').select('*').in('recipe_version_id', templateVersionIds);
        const ingRows = (ings ?? []).map((ing) => ({
          ...stripMeta(ing),
          id: randomUUID(),
          recipe_version_id: versionMap.get(ing.recipe_version_id) ?? ing.recipe_version_id,
        }));
        if (ingRows.length) await admin.from('recipe_ingredients').insert(ingRows);
        ingredientCount = ingRows.length;
      }

      // 6) active recipe links (menu_item -> recipe_version)
      const templateItemIds = [...itemMap.keys()];
      if (templateItemIds.length) {
        const { data: links } = await admin
          .from('menu_item_recipe_versions')
          .select('*')
          .in('menu_item_id', templateItemIds);
        const linkRows = (links ?? [])
          .filter((l) => itemMap.has(l.menu_item_id) && versionMap.has(l.recipe_version_id))
          .map((l) => ({
            ...stripMeta(l),
            id: randomUUID(),
            menu_item_id: itemMap.get(l.menu_item_id)!,
            recipe_version_id: versionMap.get(l.recipe_version_id)!,
          }));
        if (linkRows.length) await admin.from('menu_item_recipe_versions').insert(linkRows);
      }

      copied = {
        menuCategories: catRows.length,
        menuItems: itemRows.length,
        recipes: recipeRows.length,
        recipeVersions: versionRows.length,
        recipeIngredients: ingredientCount,
      };
    }

    await getEngine().audit.log({
      action: 'create',
      entityType: 'chef_storefront',
      entityId: newStorefrontId,
      actor: ctx.actor,
      afterState: { source: templateStorefrontId ? 'clone' : 'blank', templateStorefrontId, slug, copied },
    });

    return successResponse(
      {
        storefront: { id: newStorefrontId, slug, name: name.trim(), isActive: false },
        copied,
        note: 'New brand created inactive — review, then activate. Recipes draw from the shared kitchen inventory.',
      },
      201,
    );
  } catch (error) {
    console.error('Error cloning brand:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
