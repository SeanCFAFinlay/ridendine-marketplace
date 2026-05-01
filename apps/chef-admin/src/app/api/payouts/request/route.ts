import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@ridendine/db';
import { getStripeClient } from '@ridendine/engine';
import { getEngine } from '@/lib/engine';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount < 10) {
      return NextResponse.json(
        { error: 'Minimum payout amount is $10' },
        { status: 400 }
      );
    }

    // Get chef profile
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    // Get payout account
    const { data: payoutAccount } = await supabase
      .from('chef_payout_accounts')
      .select('stripe_account_id, status')
      .eq('chef_id', chefProfile.id)
      .single();

    if (!payoutAccount || payoutAccount.status !== 'active') {
      return NextResponse.json(
        { error: 'Payout account not active' },
        { status: 400 }
      );
    }

    // Create payout record with 'processing' status
    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: payout, error: payoutError } = await supabase
      .from('chef_payouts')
      .insert({
        chef_id: chefProfile.id,
        amount,
        status: 'processing',
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
      })
      .select()
      .single();

    if (payoutError) throw payoutError;

    // Audit the payout creation through engine
    const engine = getEngine();
    await engine.audit.log({
      action: 'create' as any,
      entityType: 'chef_payout',
      entityId: payout.id,
      actor: { userId: user.id, role: 'chef_user' as any },
      beforeState: {},
      afterState: { status: 'processing', amount },
      reason: 'Chef requested payout',
    });

    // Create Stripe transfer
    try {
      const stripe = getStripeClient();
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'cad',
        destination: payoutAccount.stripe_account_id,
        metadata: {
          payout_id: payout.id,
          chef_id: chefProfile.id,
        },
      });

      // Update payout with stripe transfer id
      await supabase
        .from('chef_payouts')
        .update({
          stripe_transfer_id: transfer.id,
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      // Audit the successful payout
      await engine.audit.log({
        action: 'status_change' as any,
        entityType: 'chef_payout',
        entityId: payout.id,
        actor: { userId: 'system', role: 'system' as any },
        beforeState: { status: 'processing' },
        afterState: { status: 'completed', stripe_transfer_id: transfer.id },
        reason: 'Stripe transfer successful',
      });

      payout.status = 'completed';
      payout.paid_at = new Date().toISOString();
    } catch (stripeError) {
      console.error('Stripe transfer failed:', stripeError);

      // Update payout as failed
      await supabase
        .from('chef_payouts')
        .update({ status: 'failed' })
        .eq('id', payout.id);

      // Audit the failed payout
      await engine.audit.log({
        action: 'status_change' as any,
        entityType: 'chef_payout',
        entityId: payout.id,
        actor: { userId: 'system', role: 'system' as any },
        beforeState: { status: 'processing' },
        afterState: { status: 'failed' },
        reason: stripeError instanceof Error ? stripeError.message : 'Stripe transfer failed',
      });

      payout.status = 'failed';
    }

    return NextResponse.json({ payout });
  } catch (error) {
    console.error('Error requesting payout:', error);
    return NextResponse.json(
      { error: 'Failed to request payout' },
      { status: 500 }
    );
  }
}
