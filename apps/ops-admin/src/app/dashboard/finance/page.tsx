import { Badge, Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine, getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { FinanceActions } from './finance-actions';
import { PayoutActions } from './payout-actions';
import { FinanceSubnav } from './_components/FinanceSubnav';
import { FinanceAccessDenied } from './_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from './_lib/roles';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default async function FinancePage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  let result;
  try {
    result = await getEngine().ops.getFinanceOperations(actor, {
      start: start.toISOString(),
      end: end.toISOString(),
    });
  } catch (error) {
    console.error('[ridendine][ops-admin][finance-page-load-failed]', error);
    result = {
      success: true,
      data: {
        summary: {
          totalRevenue: 0,
          totalRefunds: 0,
          platformFees: 0,
          chefPayouts: 0,
          driverPayouts: 0,
          taxCollected: 0,
          orderCount: 0,
        },
        pendingRefundAmount: 0,
        pendingAdjustmentAmount: 0,
        refundAutoReviewThresholdCents: 2500,
        pendingRefunds: [],
        pendingAdjustments: [],
        recentLedger: [],
        chefLiabilities: [],
        driverLiabilities: [],
      },
    };
  }

  if (!result.success || !result.data) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl">
          <Card className="border-gray-800 bg-[#16213e] p-8">
            <h1 className="text-2xl font-bold text-white">Finance data unavailable</h1>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const data = result.data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Finance Operations</h1>
            <p className="mt-1 text-gray-400">
              Review and action workflows for refunds, payout holds, liabilities, and ledger activity.
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/api/export?type=orders" className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">Export Orders CSV</a>
            <a href="/api/export?type=ledger" className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">Export Ledger CSV</a>
            <a href="/api/export?type=stripe_events" className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">Export Stripe Webhook CSV</a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Captured Revenue</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">{formatCurrency(data.summary.totalRevenue)}</p>
          </Card>
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Pending Refund Review</p>
            <p className="mt-2 text-3xl font-bold text-red-200">{formatCurrency(data.pendingRefundAmount)}</p>
            <p className="mt-1 text-xs text-gray-500">
              Above ${(data.refundAutoReviewThresholdCents / 100).toFixed(2)} requires manual review
            </p>
          </Card>
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Pending Payout Adjustments</p>
            <p className="mt-2 text-3xl font-bold text-yellow-200">{formatCurrency(data.pendingAdjustmentAmount)}</p>
          </Card>
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Tax Collected</p>
            <p className="mt-2 text-3xl font-bold text-cyan-300">{formatCurrency(data.summary.taxCollected)}</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Chef Payables</h2>
              <Badge className="bg-purple-500/20 text-purple-200">{data.chefLiabilities.length}</Badge>
            </div>
            <div className="space-y-3">
              {data.chefLiabilities.map((chef) => (
                <div key={chef.id} className="flex items-center justify-between rounded-lg bg-[#1a1a2e] p-4">
                  <span className="text-white">{chef.name}</span>
                  <span className="text-emerald-300">{formatCurrency(chef.amount)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Driver Payables</h2>
              <Badge className="bg-blue-500/20 text-blue-200">{data.driverLiabilities.length}</Badge>
            </div>
            <div className="space-y-3">
              {data.driverLiabilities.map((driver) => (
                <div key={driver.id} className="flex items-center justify-between rounded-lg bg-[#1a1a2e] p-4">
                  <span className="text-white">{driver.name}</span>
                  <span className="text-emerald-300">{formatCurrency(driver.amount)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white">Review Queues</h2>
          <p className="mt-1 text-sm text-gray-400">
            Refunds and payout adjustments below are actionable from ops-admin and write audit logs through the engine.
          </p>
          <div className="mt-6">
            <FinanceActions
              refunds={data.pendingRefunds}
              adjustments={data.pendingAdjustments}
            />
          </div>
        </Card>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Ledger Activity</h2>
            <Badge className="bg-gray-700 text-gray-200">{data.recentLedger.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                  <th className="py-3 font-medium">Date</th>
                  <th className="py-3 font-medium">Type</th>
                  <th className="py-3 font-medium">Entity</th>
                  <th className="py-3 font-medium">Description</th>
                  <th className="py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLedger.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-800 text-sm">
                    <td className="py-3 text-gray-300">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="py-3 text-gray-300">{entry.entryType}</td>
                    <td className="py-3 text-gray-300">
                      {entry.entityType ? `${entry.entityType}:${entry.entityId ?? 'n/a'}` : 'platform'}
                    </td>
                    <td className="py-3 text-gray-300">{entry.description ?? 'No description'}</td>
                    <td className="py-3 text-emerald-300">{formatCurrency(entry.amountCents / 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <PayoutActions />
      </div>
    </DashboardLayout>
  );
}
