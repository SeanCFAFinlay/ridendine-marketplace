import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine, getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { KpiTile, PageHeader, DataTable, EmptyState } from '@ridendine/ui';
import type { ColumnDef } from '@ridendine/ui';
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

const ledgerColumns: ColumnDef<LedgerEntry>[] = [
  {
    key: 'createdAt',
    header: 'Date',
    sortable: true,
    cell: (row) => (
      <span className="text-xs text-gray-400">
        {new Date(row.createdAt).toLocaleString()}
      </span>
    ),
  },
  {
    key: 'entryType',
    header: 'Type',
    cell: (row) => <span className="text-gray-300">{row.entryType}</span>,
  },
  {
    key: 'entityType',
    header: 'Entity',
    cell: (row) => (
      <span className="text-gray-400 text-xs">
        {row.entityType ? `${row.entityType}:${row.entityId ?? 'n/a'}` : 'platform'}
      </span>
    ),
  },
  {
    key: 'description',
    header: 'Description',
    cell: (row) => (
      <span className="text-gray-300 text-xs">{row.description ?? 'No description'}</span>
    ),
  },
  {
    key: 'amountCents',
    header: 'Amount',
    sortable: true,
    cell: (row) => (
      <span className="font-medium text-emerald-400">{formatCurrency(row.amountCents / 100)}</span>
    ),
  },
];

const liabilityColumns: ColumnDef<LiabilityItem>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (row) => <span className="font-medium text-white">{row.name}</span>,
  },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    cell: (row) => <span className="text-emerald-400 font-medium">{formatCurrency(row.amount)}</span>,
  },
];

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
              <a href="/api/export?type=orders" className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500">Export Orders</a>
              <a href="/api/export?type=ledger" className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500">Export Ledger</a>
              <a href="/api/export?type=bank_payouts" className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500">Export Bank</a>
            </div>
          }
        />

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Captured Revenue (30d)"
            value={formatCurrency(data.summary.totalRevenue)}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Pending Refund Review"
            value={formatCurrency(data.pendingRefundAmount)}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Pending Payout Adjustments"
            value={formatCurrency(data.pendingAdjustmentAmount)}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Tax Collected"
            value={formatCurrency(data.summary.taxCollected)}
            className="border-gray-800 bg-opsPanel"
          />
        </div>

        {/* Payables grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Chef Payables</h2>
              <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                {data.chefLiabilities.length}
              </span>
            </div>
            <DataTable
              columns={liabilityColumns}
              data={data.chefLiabilities}
              keyExtractor={(r) => r.id}
              emptyState={<EmptyState title="No chef payables" description="No outstanding chef liabilities." />}
              className="border-gray-800 bg-transparent"
            />
          </div>

          <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Driver Payables</h2>
              <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                {data.driverLiabilities.length}
              </span>
            </div>
            <DataTable
              columns={liabilityColumns}
              data={data.driverLiabilities}
              keyExtractor={(r) => r.id}
              emptyState={<EmptyState title="No driver payables" description="No outstanding driver liabilities." />}
              className="border-gray-800 bg-transparent"
            />
          </div>
        </div>

        {/* Review queues */}
        <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
          <h2 className="mb-1 text-sm font-semibold text-white">Review Queues</h2>
          <p className="mb-4 text-xs text-gray-500">
            Refunds and payout adjustments are actionable here and write audit logs through the engine.
          </p>
          <FinanceActions
            refunds={data.pendingRefunds}
            adjustments={data.pendingAdjustments}
          />
        </div>

        {/* Ledger */}
        <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Ledger Activity</h2>
            <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
              {data.recentLedger.length}
            </span>
          </div>
          <DataTable
            columns={ledgerColumns}
            data={data.recentLedger as LedgerEntry[]}
            keyExtractor={(r) => r.id}
            emptyState={<EmptyState title="No ledger entries" description="Ledger activity will appear here." />}
            className="border-gray-800 bg-transparent"
          />
        </div>

        <PayoutActions />
      </div>
    </DashboardLayout>
  );
}
