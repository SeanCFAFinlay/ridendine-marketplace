// ==========================================
// KITCHEN OWNER CHECK
//
// Kitchen staff (kitchen_staff rows) share the owner's chef context so they can
// run orders, but money — payout status, bank setup, payout requests — belongs
// to the owner alone. A staff member must never be able to attach their own
// bank account to the owner's Stripe Connect account.
//
// Owner = the signed-in user is the chef_profiles.user_id of the chef whose
// storefront the context resolved to. Fails closed: any lookup error = not owner.
// ==========================================

import { createAdminClient, getChefById, type SupabaseClient } from '@ridendine/db';
import { getChefActorContext } from '@/lib/engine';

export type ChefActorContext = NonNullable<Awaited<ReturnType<typeof getChefActorContext>>>;

export const OWNER_ONLY_MESSAGE = 'Only the kitchen owner can view or manage payouts.';

export async function isKitchenOwner(ctx: ChefActorContext): Promise<boolean> {
  try {
    const chef = await getChefById(createAdminClient() as unknown as SupabaseClient, ctx.chefId);
    return !!chef && !!chef.user_id && chef.user_id === ctx.actor.userId;
  } catch (err) {
    console.error('[isKitchenOwner] lookup failed:', err);
    return false;
  }
}

/** Resolves the chef context plus whether the caller is the kitchen owner. */
export async function getChefOwnerContext(): Promise<{ ctx: ChefActorContext | null; isOwner: boolean }> {
  const ctx = await getChefActorContext();
  if (!ctx) return { ctx: null, isOwner: false };
  return { ctx, isOwner: await isKitchenOwner(ctx) };
}
