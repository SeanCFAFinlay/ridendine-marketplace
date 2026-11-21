// ==========================================
// CHEF STRIPE CONNECT ONBOARDING (direct deposit)
//
// Creates (once) the chef's Stripe Express account and returns a Stripe-hosted
// onboarding link where the chef enters identity + bank details. Ridendine
// never sees or stores bank numbers — Stripe holds them.
//
// The account row is written with the service-role client after the chef
// guard: chef_payout_accounts has no RLS INSERT policy, so the previous
// user-client insert failed silently and a NEW Stripe account was created on
// every click.
// ==========================================

import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createChefPayoutAccount,
  getChefById,
  getChefPayoutAccount,
  syncChefPayoutAccountFromStripe,
  type SupabaseClient,
} from '@ridendine/db';
import { getStripeClient } from '@ridendine/engine';
import { getChefActorContext } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const ctx = await getChefActorContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const chefPublicBase =
      process.env.NEXT_PUBLIC_CHEF_ADMIN_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
    if (!chefPublicBase) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: set NEXT_PUBLIC_CHEF_ADMIN_URL (recommended) or NEXT_PUBLIC_APP_URL for Stripe Connect redirects',
        },
        { status: 500 }
      );
    }

    const admin = createAdminClient() as unknown as SupabaseClient;
    const stripe = getStripeClient();
    const existing = await getChefPayoutAccount(admin, ctx.chefId);

    let accountId: string;
    if (existing?.stripe_account_id) {
      accountId = existing.stripe_account_id;
      // Refresh our copy while we're here (covers a missed account.updated webhook).
      const account = await stripe.accounts.retrieve(accountId);
      await syncChefPayoutAccountFromStripe(admin, account);
    } else {
      const chef = await getChefById(admin, ctx.chefId);
      const displayName = (chef?.display_name as string | null | undefined) ?? 'Chef';

      const account = await stripe.accounts.create(
        {
          type: 'express',
          country: 'CA',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            mcc: '5812', // Eating places & restaurants
            name: `${displayName} - RideNDine`,
          },
          metadata: { chef_id: ctx.chefId, storefront_id: ctx.storefrontId },
        },
        // A double-click must not create two Stripe accounts.
        { idempotencyKey: `chef-connect-account:${ctx.chefId}` }
      );
      accountId = account.id;
      await createChefPayoutAccount(admin, ctx.chefId, accountId);
    }

    // Onboarding link must land back on the chef-admin origin, not the customer web.
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${chefPublicBase}/dashboard/payouts?refresh=true`,
      return_url: `${chefPublicBase}/dashboard/payouts?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error setting up payout account:', error);
    return NextResponse.json({ error: 'Failed to setup payout account' }, { status: 500 });
  }
}
