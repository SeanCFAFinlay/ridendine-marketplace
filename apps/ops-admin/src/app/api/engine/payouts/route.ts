import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { finalizeOpsActor, getEngine, getOpsActorContext, guardPlatformApi } from '@/lib/engine';
import { bankPayoutCommandSchema, type OpsCommandInput } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';

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
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

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
    .in('status', ['scheduled', 'approved', 'exported', 'bank_submitted', 'paid', 'reconciled']);

  const paidTotals = buildPaidTotals(paidPayouts || []);

  const chefIds = [...chefTotals.keys()];
  const { data: chefs } = chefIds.length > 0
    ? await client.from('chef_profiles').select('id, display_name, user_id').in('id', chefIds)
    : { data: [] };
  const { data: storefronts } = chefIds.length > 0
    ? await client.from('chef_storefronts').select('id, chef_id').in('chef_id', chefIds)
    : { data: [] };

  const { data: payoutAccounts } = chefIds.length > 0
    ? await client.from('chef_payout_accounts').select('chef_id, stripe_account_id, payout_enabled').in('chef_id', chefIds)
    : { data: [] };

  const accountMap = new Map<string, { stripe_account_id?: string; payout_enabled?: boolean }>(
    (payoutAccounts || []).map((a: any) => [a.chef_id, a])
  );
  const storefrontMap = new Map<string, string>(
    (storefronts || []).map((s: any) => [s.chef_id, s.id])
  );

  const payableChefs = (chefs || [])
    .map((chef: any) => {
      const totalEarned = (chefTotals.get(chef.id) || 0) / 100;
      const totalPaid = (paidTotals.get(chef.id) || 0) / 100;
      const balance = totalEarned - totalPaid;
      const account = accountMap.get(chef.id);
      return {
        chefId: chef.id,
        storefrontId: storefrontMap.get(chef.id) || null,
        name: chef.display_name,
        totalEarned,
        totalPaid,
        balance,
        stripeAccountId: account?.stripe_account_id || null,
        payoutEnabled: account?.payout_enabled || false,
      };
    })
    .filter((c: any) => c.balance > 0);

  const { data: bankPayoutsRaw } = await client
    .from('chef_payouts')
    .select('id, chef_id, amount, status, payment_rail, bank_batch_id, bank_reference, reconciliation_status, created_at')
    .eq('payment_rail', 'bank')
    .in('status', ['scheduled', 'approved', 'exported', 'bank_submitted', 'paid']);

  const bankPayouts = (bankPayoutsRaw || []).map((p: any) => {
    const chef = (chefs || []).find((c: any) => c.id === p.chef_id);
    return {
      id: p.id,
      payeeType: 'chef',
      payeeId: p.chef_id,
      name: chef?.display_name || p.chef_id,
      amountCents: p.amount,
      status: p.status,
      bankBatchId: p.bank_batch_id,
      bankReference: p.bank_reference,
      reconciliationStatus: p.reconciliation_status,
      createdAt: p.created_at,
    };
  });

  return NextResponse.json({ success: true, data: { payableChefs, bankPayouts } });
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

  const actionInput = await parseJsonBody(request, bankPayoutCommandSchema);
  if (actionInput instanceof Response) return actionInput;

  const result = await getEngine().operations.execute(actionInput as OpsCommandInput, opsActor);
  return operationResultResponse(result);
}
