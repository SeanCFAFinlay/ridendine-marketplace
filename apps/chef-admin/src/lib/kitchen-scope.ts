// ==========================================
// SERVER: ghost-kitchen scope loader for the dashboard shell
//
// Resolves the operator's commissary kitchen, its brand storefronts, and the
// active brand (from the validated x-brand-id inside getOperatorKitchenContext)
// into the shape the KitchenScopeProvider needs. Returns null for a
// non-operator so the shell renders unchanged for independent/onboarding chefs.
// ==========================================

import { createAdminClient } from '@ridendine/db';
import { getOperatorKitchenContext } from '@ridendine/engine/server';
import type { KitchenScope } from '@/components/layout/kitchen-scope-provider';

export async function getKitchenScopeData(): Promise<KitchenScope | null> {
  const ctx = await getOperatorKitchenContext();
  if (!ctx) return null;

  const admin = createAdminClient();
  const [{ data: kitchen }, { data: storefronts }] = await Promise.all([
    admin.from('chef_kitchens').select('name').eq('id', ctx.kitchenId).maybeSingle(),
    admin
      .from('chef_storefronts')
      .select('id, name, slug, is_active')
      .eq('kitchen_id', ctx.kitchenId)
      .order('name', { ascending: true }),
  ]);

  return {
    kitchenId: ctx.kitchenId,
    kitchenName: kitchen?.name ?? 'Kitchen',
    activeBrandId: ctx.storefrontId,
    brands: (storefronts ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      isActive: s.is_active,
    })),
  };
}
