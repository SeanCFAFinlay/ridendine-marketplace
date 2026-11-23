// ==========================================
// CHEF PAYOUT DATA LOADER — server-only. Shared by /api/analytics (Payout
// Summary card) and /api/payouts (Payouts page) so both show the same numbers.
// ==========================================

import type { createAdminClient } from '@ridendine/db';
import {
  getPlatformAccount,
  listChefPayoutAccountRefs,
  listChefPayoutsForChef,
  listFulfilledOrderMoneyForStorefront,
  listOrderIdsWithLedgerEntry,
  type ChefPayoutAccountRef,
  type ChefPayoutHistoryRow,
  type SupabaseClient,
} from '@ridendine/db';
import { buildPayoutSummary, payoutBreakdownSince, type PayoutSummary } from '@/lib/payout-summary';

export interface PayoutData {
  summary: PayoutSummary;
  payouts: ChefPayoutHistoryRow[];
  account: ChefPayoutAccountRef | null;
}

export async function loadPayoutData(
  adminClient: ReturnType<typeof createAdminClient>,
  chefId: string,
  storefrontId: string
): Promise<PayoutData> {
  const client = adminClient as unknown as SupabaseClient;
  const [payouts, ledgerAccount, accountRefs] = await Promise.all([
    listChefPayoutsForChef(client, chefId),
    getPlatformAccount(client, 'chef_payable', storefrontId),
    listChefPayoutAccountRefs(client, [chefId]),
  ]);
  const unpaidOrders = await listFulfilledOrderMoneyForStorefront(
    client,
    storefrontId,
    payoutBreakdownSince(payouts)
  );
  const ledgeredOrderIds = ledgerAccount
    ? new Set(await listOrderIdsWithLedgerEntry(client, unpaidOrders.map((o) => o.id), 'chef_payable'))
    : undefined;
  const account = accountRefs[0] ?? null;

  const summary = buildPayoutSummary({
    payouts,
    unpaidOrders,
    ledgeredOrderIds,
    ledgerBalanceCents: ledgerAccount ? Number(ledgerAccount.balance_cents ?? 0) : null,
    currency: (ledgerAccount?.currency as string | undefined) ?? null,
    payoutAccountReady: account?.payout_enabled === true,
  });

  return { summary, payouts, account };
}
