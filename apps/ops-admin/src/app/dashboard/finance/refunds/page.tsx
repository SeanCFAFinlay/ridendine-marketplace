import { Badge, Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine, getOpsActorContext, hasRequiredRole } from '@/lib/engine';
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
        <div>
          <h1 className="text-3xl font-bold text-white">Refund queue</h1>
          <p className="mt-1 text-gray-400">Pending refund cases requiring ops / finance review.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-gray-800 bg-opsPanel p-6">
            <p className="text-sm text-gray-400">Pending refund exposure</p>
            <p className="mt-2 text-3xl font-bold text-red-200">{formatCurrency(pendingAmount)}</p>
          </Card>
          <Card className="border-gray-800 bg-opsPanel p-6">
            <p className="text-sm text-gray-400">Auto-review threshold</p>
            <p className="mt-2 text-3xl font-bold text-gray-100">
              {formatCurrency(threshold / 100)}
            </p>
          </Card>
        </div>

        <Card className="border-gray-800 bg-opsPanel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Cases</h2>
            <Badge className="bg-red-500/20 text-red-100">{pendingRefunds.length}</Badge>
          </div>
          <FinanceActions refunds={pendingRefunds} adjustments={[]} />
        </Card>
      </div>
    </DashboardLayout>
  );
}
