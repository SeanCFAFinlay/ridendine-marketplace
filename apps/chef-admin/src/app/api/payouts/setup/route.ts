import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@ridendine/db';
import { getStripeClient } from '@ridendine/engine';
import { getChefActorContext } from '@/lib/engine';

export async function POST() {
  try {
    const ctx = await getChefActorContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get chef profile
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id, display_name')
      .eq('user_id', user.id)
      .single();

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    // Check for existing payout account
    const { data: existingAccount } = await supabase
      .from('chef_payout_accounts')
      .select('stripe_account_id')
      .eq('chef_id', chefProfile.id)
      .single();

    let accountId: string;

    const stripe = getStripeClient();

    if (existingAccount?.stripe_account_id) {
      accountId = existingAccount.stripe_account_id;
    } else {
      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        individual: {
          first_name: chefProfile.display_name?.split(' ')[0] || 'Chef',
          last_name: chefProfile.display_name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
        },
        business_profile: {
          mcc: '5812', // Restaurants
          name: `${chefProfile.display_name || 'Chef'} - RideNDine`,
        },
      });

      accountId = account.id;

      // Save to database
      await supabase
        .from('chef_payout_accounts')
        .insert({
          chef_id: chefProfile.id,
          stripe_account_id: accountId,
          status: 'pending',
        });
    }

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

    // Create account link for onboarding (must land on chef-admin origin, not customer web)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${chefPublicBase}/dashboard/payouts?refresh=true`,
      return_url: `${chefPublicBase}/dashboard/payouts?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Error setting up payout account:', error);
    return NextResponse.json(
      { error: 'Failed to setup payout account' },
      { status: 500 }
    );
  }
}
