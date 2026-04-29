import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' as any });
}

function buildChefTotals(chefPayables: any[]) {
  const totals = new Map<string, number>();
  for (const entry of chefPayables) {
    if (!entry.entity_id) continue;
    totals.set(entry.entity_id, (totals.get(entry.entity_id) || 0) + entry.amount_cents);
  }
  return totals;
}

function buildPaidTotals(paidPayouts: any[]) {
  const totals = new Map<string, number>();
  for (const p of paidPayouts) {
    totals.set(p.chef_id, (totals.get(p.chef_id) || 0) + (p.amount || 0));
  }
  return totals;
}

export async function GET() {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, ['ops_manager', 'finance_admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const client = createAdminClient() as any;

  const { data: chefPayables } = await client
    .from('ledger_entries')
    .select('entity_id, amount_cents')
    .eq('entry_type', 'chef_payable')
    .eq('entity_type', 'chef');

  const chefTotals = buildChefTotals(chefPayables || []);

  const { data: paidPayouts } = await client
    .from('chef_payouts')
    .select('chef_id, amount')
    .eq('status', 'completed');

  const paidTotals = buildPaidTotals(paidPayouts || []);

  const chefIds = [...chefTotals.keys()];
  const { data: chefs } = chefIds.length > 0
    ? await client.from('chef_profiles').select('id, display_name, user_id').in('id', chefIds)
    : { data: [] };

  const { data: payoutAccounts } = chefIds.length > 0
    ? await client.from('chef_payout_accounts').select('chef_id, stripe_account_id, payout_enabled').in('chef_id', chefIds)
    : { data: [] };

  const accountMap = new Map<string, { stripe_account_id?: string; payout_enabled?: boolean }>(
    (payoutAccounts || []).map((a: any) => [a.chef_id, a])
  );

  const payableChefs = (chefs || [])
    .map((chef: any) => {
      const totalEarned = (chefTotals.get(chef.id) || 0) / 100;
      const totalPaid = paidTotals.get(chef.id) || 0;
      const balance = totalEarned - totalPaid;
      const account = accountMap.get(chef.id);
      return {
        chefId: chef.id,
        name: chef.display_name,
        totalEarned,
        totalPaid,
        balance,
        stripeAccountId: account?.stripe_account_id || null,
        payoutEnabled: account?.payout_enabled || false,
      };
    })
    .filter((c: any) => c.balance > 0);

  return NextResponse.json({ success: true, data: payableChefs });
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, ['ops_manager', 'finance_admin', 'super_admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { chefId, amountCents, stripeAccountId } = await request.json();

  if (!chefId || !amountCents || !stripeAccountId) {
    return NextResponse.json({ error: 'chefId, amountCents, and stripeAccountId required' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'cad',
      destination: stripeAccountId,
      metadata: { chef_id: chefId, initiated_by: actor.userId },
    });

    const client = createAdminClient() as any;
    const now = new Date();
    await client.from('chef_payouts').insert({
      chef_id: chefId,
      stripe_transfer_id: transfer.id,
      amount: amountCents,
      status: 'completed',
      period_start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      period_end: now.toISOString(),
      paid_at: now.toISOString(),
    });

    return NextResponse.json({ success: true, data: { transferId: transfer.id } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Payout failed',
    }, { status: 500 });
  }
}
