import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine, getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { KpiTile, PageHeader, EmptyState } from '@ridendine/ui';
import { FinanceActions } from './finance-actions';
import { PayoutActions } from './payout-actions';
import { FinanceSubnav } from './_components/FinanceSubnav';
import { FinanceAccessDenied } from './_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from './_lib/roles';

export const dynamic = 'force-dynamic';

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

type LedgerEntry = {
  id: string;
  createdAt: string;
  entryType: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  amountCents: number;
};

type LiabilityItem = {
  id: string;
  name: string;
  amount: number;
};

function LiabilityTable({
  rows,
  emptyTitle,
  emptyDescription,
}: {
  rows: LiabilityItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-wide text-textMuted">
          <th className="py-3 pr-4">Name</th>
          <th className="py-3 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-border">
            <td className="py-3 pr-4 font-medium text-white">{row.name}</td>
            <td className="py-3 text-right font-medium text-success">
              {formatCurrency(row.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LedgerTable({ rows }: { rows: LedgerEntry[] }) {
  if (rows.length === 0) {
    return <EmptyState title="No ledger entries" description="Ledger activity will appear here." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-textMuted">
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4">Type</th>
            <th className="py-3 pr-4">Entity</th>
            <th className="py-3 pr-4">Description</th>
            <th className="py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border">
              <td className="py-3 pr-4 whitespace-nowrap text-xs text-textMuted">
                {new Date(row.createdAt).toLocaleString()}
              </td>
              <td className="py-3 pr-4 text-textSubtle">{row.entryType}</td>
              <td className="py-3 pr-4 text-xs text-textMuted">
                {row.entityType ? `${row.entityType}:${row.entityId ?? 'n/a'}` : 'platform'}
              </td>
              <td className="py-3 pr-4 text-xs text-textSubtle">{row.description ?? 'No description'}</td>
              <td className="py-3 text-right font-medium text-success">
                {formatCurrency(row.amountCents / 100)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
          totalRevenue: 0, totalRefunds: 0, platformFees: 0,
          chefPayouts: 0, driverPayouts: 0, taxCollected: 0, orderCount: 0,
        },
        pendingRefundAmount: 0, pendingAdjustmentAmount: 0,
        refundAutoReviewThresholdCents: 2500,
        pendingRefunds: [], pendingAdjustments: [],
        recentLedger: [], chefLiabilities: [], driverLiabilities: [],
      },
    };
  }

  if (!result.success || !result.data) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl p-8 text-white">Finance data unavailable</div>
      </DashboardLayout>
    );
  }

  const data = result.data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />

        <PageHeader
          title="Finance Operations"
          subtitle="Review and action workflows for refunds, payout holds, liabilities, and ledger activity."
          actions={
            <div className="flex flex-wrap gap-2">
              <a href="/api/export?type=orders" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-textSubtle hover:border-border">Export Orders</a>
              <a href="/api/export?type=ledger" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-textSubtle hover:border-border">Export Ledger</a>
              <a href="/api/export?type=bank_payouts" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-textSubtle hover:border-border">Export Bank</a>
            </div>
          }
        />

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Captured Revenue (30d)"
            value={formatCurrency(data.summary.totalRevenue)}
            className="border-border bg-surface"
          />
          <KpiTile
            label="Pending Refund Review"
            value={formatCurrency(data.pendingRefundAmount)}
            className="border-border bg-surface"
          />
          <KpiTile
            label="Pending Payout Adjustments"
            value={formatCurrency(data.pendingAdjustmentAmount)}
            className="border-border bg-surface"
          />
          <KpiTile
            label="Tax Collected"
            value={formatCurrency(data.summary.taxCollected)}
            className="border-border bg-surface"
          />
        </div>

        {/* Payables grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Chef Payables</h2>
              <span className="rounded-full bg-surfaceMuted px-2 py-0.5 text-xs text-textSubtle">
                {data.chefLiabilities.length}
              </span>
            </div>
            <LiabilityTable
              rows={data.chefLiabilities}
              emptyTitle="No chef payables"
              emptyDescription="No outstanding chef liabilities."
            />
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Driver Payables</h2>
              <span className="rounded-full bg-surfaceMuted px-2 py-0.5 text-xs text-textSubtle">
                {data.driverLiabilities.length}
              </span>
            </div>
            <LiabilityTable
              rows={data.driverLiabilities}
              emptyTitle="No driver payables"
              emptyDescription="No outstanding driver liabilities."
            />
          </div>
        </div>

        {/* Review queues */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-1 text-sm font-semibold text-white">Review Queues</h2>
          <p className="mb-4 text-xs text-textMuted">
            Refunds and payout adjustments are actionable here and write audit logs through the engine.
          </p>
          <FinanceActions
            refunds={data.pendingRefunds}
            adjustments={data.pendingAdjustments}
          />
        </div>

        {/* Ledger */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Ledger Activity</h2>
            <span className="rounded-full bg-surfaceMuted px-2 py-0.5 text-xs text-textSubtle">
              {data.recentLedger.length}
            </span>
          </div>
          <LedgerTable rows={data.recentLedger as LedgerEntry[]} />
        </div>

        <PayoutActions />
      </div>
    </DashboardLayout>
  );
}
