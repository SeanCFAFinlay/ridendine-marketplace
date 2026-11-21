// ==========================================
// CHEF-ADMIN PAYOUTS API — balance, history and payout-account status.
// Server-resolved via getChefActorContext so kitchen staff resolve to their
// kitchen's chef (the old browser-side chef_profiles lookup returned nothing
// for staff and left the page loading forever).
// ==========================================

import { createAdminClient } from '@ridendine/db';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import { loadPayoutData } from '@/lib/payout-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }
    const data = await loadPayoutData(createAdminClient(), chefContext.chefId, chefContext.storefrontId);
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
