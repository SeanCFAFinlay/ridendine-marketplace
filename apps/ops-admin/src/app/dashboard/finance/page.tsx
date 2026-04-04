import { Card, Badge } from '@ridendine/ui';
import {
  createAdminClient,
  getChefLiabilitySummaries,
  getDriverLiabilitySummaries,
  type LedgerEntrySummary,
  type LiabilitySummary,
  type PendingPayoutAdjustmentSummary,
  type PendingRefundSummary,
  getPendingPayoutAdjustmentSummaries,
  getPendingRefundSummaries,
  getRecentLedgerEntries,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine, getOpsActorContext, hasRequiredRole } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type FinanceDashboardData = {
  summary: {
    totalRevenue: number;
    totalRefunds: number;
    platformFees: number;
    chefPayouts: number;
    driverPayouts: number;
    taxCollected: number;
    orderCount: number;
  };
  pendingRefunds: PendingRefundSummary[];
  pendingAdjustments: PendingPayoutAdjustmentSummary[];
  recentLedger: LedgerEntrySummary[];
  chefLiabilities: LiabilitySummary[];
  driverLiabilities: LiabilitySummary[];
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

async function getFinanceData(): Promise<FinanceDashboardData> {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, ['ops_manager', 'finance_admin', 'super_admin'])) {
    return {
      summary: {
        totalRevenue: 0,
        totalRefunds: 0,
        platformFees: 0,
        chefPayouts: 0,
        driverPayouts: 0,
        taxCollected: 0,
        orderCount: 0,
      },
      pendingRefunds: [],
      pendingAdjustments: [],
      recentLedger: [],
      chefLiabilities: [],
      driverLiabilities: [],
    };
  }

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const engine = getEngine();

  const [summary, pendingRefunds, chefLiabilities, driverLiabilities, pendingAdjustments, recentLedger] =
    await Promise.all([
      engine.commerce.getFinancialSummary({
        start: start.toISOString(),
        end: end.toISOString(),
      }),
      getPendingRefundSummaries(adminClient, 25),
      getChefLiabilitySummaries(adminClient, 10),
      getDriverLiabilitySummaries(adminClient, 10),
      getPendingPayoutAdjustmentSummaries(adminClient, 25),
      getRecentLedgerEntries(adminClient, 25),
    ]);

  return {
    summary,
    pendingRefunds,
    pendingAdjustments,
    recentLedger,
    chefLiabilities,
    driverLiabilities,
  };
}

export default async function FinancePage() {
  const actor = await getOpsActorContext();

  if (!actor || !hasRequiredRole(actor, ['ops_manager', 'finance_admin', 'super_admin'])) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl">
          <Card className="border-gray-800 bg-[#16213e] p-8">
            <h1 className="text-2xl font-bold text-white">Finance Access Required</h1>
            <p className="mt-2 text-gray-400">
              Finance data is only available to ops managers, finance admins, and super admins.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const data = await getFinanceData();
  const pendingRefundAmount = data.pendingRefunds.reduce(
    (sum, refund) => sum + refund.amount_cents / 100,
    0
  );
  const pendingAdjustmentAmount = data.pendingAdjustments.reduce(
    (sum, adjustment) => sum + adjustment.amount_cents / 100,
    0
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Finance Dashboard</h1>
          <p className="mt-1 text-gray-400">
            Real platform finance state from ledger, refund, payout-adjustment, chef, and driver records.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Captured Revenue</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {formatCurrency(data.summary.totalRevenue)}
            </p>
            <p className="mt-1 text-sm text-gray-500">{data.summary.orderCount} captured orders in the last 30 days</p>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Platform Fees</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              {formatCurrency(data.summary.platformFees)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Shared commerce ledger source of truth</p>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Refunded Amount</p>
            <p className="mt-2 text-3xl font-bold text-red-300">
              {formatCurrency(data.summary.totalRefunds)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Resolved through the refund engine and ledger</p>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Tax Collected</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">
              {formatCurrency(data.summary.taxCollected)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Current tax visibility from captured orders</p>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Chef Payables</p>
            <p className="mt-2 text-3xl font-bold text-purple-400">
              {formatCurrency(data.summary.chefPayouts)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Ledger entries owed to chefs</p>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Driver Wages + Tips</p>
            <p className="mt-2 text-3xl font-bold text-orange-400">
              {formatCurrency(data.summary.driverPayouts)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Driver payables from deliveries and tips</p>
          </Card>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Finance Operating Status</h2>
              <p className="mt-1 text-sm text-gray-400">
                Ops-admin is the visibility and review hub for liabilities, refunds, and payout exceptions. Automated payout execution is not implemented in the current codebase.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Pending Refund Review</p>
                <p className="mt-2 text-xl font-semibold text-red-300">{formatCurrency(pendingRefundAmount)}</p>
                <p className="text-xs text-gray-500">{data.pendingRefunds.length} open cases</p>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Pending Payout Adjustments</p>
                <p className="mt-2 text-xl font-semibold text-yellow-300">{formatCurrency(pendingAdjustmentAmount)}</p>
                <p className="text-xs text-gray-500">{data.pendingAdjustments.length} pending reviews</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Chef Liability Snapshot</h2>
              <Badge className="bg-purple-500/20 text-purple-300">
                {data.chefLiabilities.length} chefs
              </Badge>
            </div>
            {data.chefLiabilities.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No chef payable ledger entries recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.chefLiabilities.map((chef) => (
                  <div key={chef.id} className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4">
                    <div>
                      <p className="font-medium text-white">{chef.name}</p>
                      <p className="text-xs text-gray-500">Chef payable ledger total</p>
                    </div>
                    <span className="text-lg font-semibold text-emerald-400">
                      {formatCurrency(chef.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Driver Wage Snapshot</h2>
              <Badge className="bg-blue-500/20 text-blue-300">
                {data.driverLiabilities.length} drivers
              </Badge>
            </div>
            {data.driverLiabilities.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No driver payable ledger entries recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.driverLiabilities.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4">
                    <div>
                      <p className="font-medium text-white">{driver.name}</p>
                      <p className="text-xs text-gray-500">Driver payable + tip ledger total</p>
                    </div>
                    <span className="text-lg font-semibold text-emerald-400">
                      {formatCurrency(driver.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pending Refund Review</h2>
              <Badge className="bg-red-500/20 text-red-300">{data.pendingRefunds.length} open</Badge>
            </div>
            {data.pendingRefunds.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No refund cases awaiting ops review.</p>
            ) : (
              <div className="space-y-3">
                {data.pendingRefunds.map((refund) => (
                  <div key={refund.id} className="rounded-lg bg-gray-800/50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">Order {refund.order_number}</p>
                        <p className="text-sm text-gray-400">{refund.customer_name}</p>
                      </div>
                      <span className="text-lg font-semibold text-red-300">
                        {formatCurrency(refund.amount_cents / 100)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">{refund.reason || 'No refund reason provided.'}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pending Payout Adjustments</h2>
              <Badge className="bg-yellow-500/20 text-yellow-300">{data.pendingAdjustments.length} pending</Badge>
            </div>
            {data.pendingAdjustments.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No payout holds or clawbacks pending.</p>
            ) : (
              <div className="space-y-3">
                {data.pendingAdjustments.map((adjustment) => (
                  <div key={adjustment.id} className="rounded-lg bg-gray-800/50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">
                          {adjustment.payee_type.toUpperCase()} {adjustment.adjustment_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-400">Order {adjustment.order_number}</p>
                      </div>
                      <span className="text-lg font-semibold text-yellow-300">
                        {formatCurrency(adjustment.amount_cents / 100)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Ledger Activity</h2>
            <Badge className="bg-gray-700 text-gray-200">{data.recentLedger.length} entries</Badge>
          </div>

          {data.recentLedger.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No ledger entries recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="py-3 text-left text-sm font-medium text-gray-400">Date</th>
                    <th className="py-3 text-left text-sm font-medium text-gray-400">Type</th>
                    <th className="py-3 text-left text-sm font-medium text-gray-400">Entity</th>
                    <th className="py-3 text-left text-sm font-medium text-gray-400">Description</th>
                    <th className="py-3 text-left text-sm font-medium text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLedger.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-800">
                      <td className="py-4 text-sm text-gray-300">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 text-sm text-gray-300">{entry.entry_type}</td>
                      <td className="py-4 text-sm text-gray-300">
                        {entry.entity_type ? `${entry.entity_type}:${entry.entity_id ?? 'n/a'}` : 'platform'}
                      </td>
                      <td className="py-4 text-sm text-gray-300">{entry.description || 'No description'}</td>
                      <td className="py-4 text-sm font-medium text-emerald-400">
                        {formatCurrency(entry.amount_cents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
