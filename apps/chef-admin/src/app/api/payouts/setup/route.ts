import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@ridendine/db';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
  });
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get chef profile
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id, first_name, last_name')
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

    const stripe = getStripe();

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
          first_name: chefProfile.first_name,
          last_name: chefProfile.last_name,
          email: user.email,
        },
        business_profile: {
          mcc: '5812', // Restaurants
          name: `${chefProfile.first_name} ${chefProfile.last_name} - Chef`,
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

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payouts?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payouts?success=true`,
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
