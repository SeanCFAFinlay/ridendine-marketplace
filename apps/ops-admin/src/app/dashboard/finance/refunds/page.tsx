import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine, getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { KpiTile, PageHeader, EmptyState } from '@ridendine/ui';
import { FinanceSubnav } from '../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../_components/FinanceAccessDenied';
import { FinanceActions } from '../finance-actions';
import { FINANCE_PAGE_ROLES } from '../_lib/roles';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export default async function FinanceRefundsPage() {
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
  } catch {
    result = { success: false as const };
  }

  const pendingRefunds =
    result.success && result.data ? result.data.pendingRefunds : [];
  const pendingAmount =
    result.success && result.data ? result.data.pendingRefundAmount : 0;
  const threshold =
    result.success && result.data ? result.data.refundAutoReviewThresholdCents : 2500;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />

        <PageHeader
          title="Refund Queue"
          subtitle="Pending refund cases requiring ops / finance review."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <KpiTile
            label="Pending Refund Exposure"
            value={formatCurrency(pendingAmount)}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Auto-Review Threshold"
            value={formatCurrency(threshold / 100)}
            className="border-gray-800 bg-opsPanel"
          />
        </div>

        <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Cases</h2>
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-300">
              {pendingRefunds.length}
            </span>
          </div>
          {pendingRefunds.length === 0 ? (
            <EmptyState
              title="No pending refunds"
              description="All refund cases have been reviewed."
            />
          ) : (
            <FinanceActions refunds={pendingRefunds} adjustments={[]} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
