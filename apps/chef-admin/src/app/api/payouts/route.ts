// ==========================================
// CHEF-ADMIN PAYOUTS API — balance, history and payout-account status.
// Server-resolved via getChefActorContext so kitchen staff resolve to their
// kitchen's chef (the old browser-side chef_profiles lookup returned nothing
// for staff and left the page loading forever).
// ==========================================

import {
  createAdminClient,
  getChefPayoutAccount,
  syncChefPayoutAccountFromStripe,
  type SupabaseClient,
} from '@ridendine/db';
import { getStripeClient } from '@ridendine/engine';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

/**
 * While a connected account is still onboarding, ask Stripe for its live state
 * so the chef sees "active" as soon as Stripe verifies them — even if the
 * account.updated webhook is not configured or was missed. Best-effort.
 */
async function refreshConnectAccount(admin: SupabaseClient, chefId: string): Promise<void> {
  try {
    const account = await getChefPayoutAccount(admin, chefId);
    if (!account?.stripe_account_id || account.payout_enabled === true) return;
    const live = await getStripeClient().accounts.retrieve(account.stripe_account_id);
    await syncChefPayoutAccountFromStripe(admin, live);
  } catch (err) {
    console.error('payouts: connect account refresh failed', err);
  }
}
import { loadPayoutData } from '@/lib/payout-data';
import { isKitchenOwner, OWNER_ONLY_MESSAGE } from '@/lib/chef-owner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }
    if (!(await isKitchenOwner(chefContext))) {
      return errorResponse('FORBIDDEN', OWNER_ONLY_MESSAGE, 403);
    }
    const adminClient = createAdminClient();
    await refreshConnectAccount(adminClient as unknown as SupabaseClient, chefContext.chefId);
    const data = await loadPayoutData(adminClient, chefContext.chefId, chefContext.storefrontId);
    return successResponse({
      summary: data.summary,
      payouts: data.payouts,
      account: data.account
        ? { connected: Boolean(data.account.stripe_account_id), payoutEnabled: data.account.payout_enabled === true }
        : null,
    });
  } catch (err) {
    console.error('payouts GET', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to load payouts', 500);
  }
}
