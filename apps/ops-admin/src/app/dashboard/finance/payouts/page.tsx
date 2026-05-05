import Link from 'next/link';
import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { PageHeader, DataTable, EmptyState, StatusBadge } from '@ridendine/ui';
import type { ColumnDef } from '@ridendine/ui';
import { FinanceSubnav } from '../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../_lib/roles';

export const dynamic = 'force-dynamic';

type PayoutRun = {
  id: string;
  run_type: string;
  status: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  successful_payouts: number;
  failed_payouts: number;
  created_at: string;
};

function getPayoutStatus(status: string): 'success' | 'danger' | 'warning' | 'active' | 'idle' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'partial') return 'warning';
  if (status === 'running') return 'active';
  return 'idle';
}

const columns: ColumnDef<PayoutRun>[] = [
  {
    key: 'created_at',
    header: 'Created',
    sortable: true,
    cell: (row) => (
      <span className="whitespace-nowrap text-xs text-gray-300">
        {new Date(row.created_at).toLocaleString()}
      </span>
    ),
  },
  {
    key: 'run_type',
    header: 'Type',
    sortable: true,
    cell: (row) => <span className="font-medium text-gray-200">{row.run_type}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    cell: (row) => (
      <StatusBadge status={getPayoutStatus(row.status)} label={row.status} />
    ),
  },
  {
    key: 'period_start',
    header: 'Period',
    cell: (row) => (
      <span className="text-xs text-gray-400">
        {row.period_start?.slice(0, 10)} → {row.period_end?.slice(0, 10)}
      </span>
    ),
  },
  {
    key: 'successful_payouts',
    header: 'Success / Fail',
    sortable: true,
    cell: (row) => (
      <span className="text-sm text-gray-300">
        <span className="text-emerald-400">{row.successful_payouts}</span>
        {' / '}
        <span className={row.failed_payouts > 0 ? 'text-red-400' : 'text-gray-500'}>
          {row.failed_payouts}
        </span>
      </span>
    ),
  },
  {
    key: 'id',
    header: '',
    cell: (row) => (
      <Link
        href={`/dashboard/finance/payouts/${row.id}`}
        className="text-xs text-[#E85D26] hover:underline"
      >
        Detail
      </Link>
    ),
  },
];

export default async function FinancePayoutRunsPage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }

  const admin = createAdminClient();
  const { data: runs, error } = await admin
    .from('payout_runs')
    .select('id, run_type, status, period_start, period_end, total_amount, successful_payouts, failed_payouts, created_at')
    .order('created_at', { ascending: false })
    .limit(80);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />

        <PageHeader
          title="Payout Runs"
          subtitle="Chef runs (weekly) and driver runs (daily). All lines are ledger-debited and traceable."
        />

        {error ? (
          <EmptyState
            title="Failed to load payout runs"
            description="Unable to fetch payout run data. Check your database connection."
          />
        ) : (
          <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Runs</h2>
              <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                {(runs ?? []).length}
              </span>
            </div>
            <DataTable
              columns={columns}
              data={(runs ?? []) as PayoutRun[]}
              keyExtractor={(r) => r.id}
              emptyState={
                <EmptyState
                  title="No payout runs yet"
                  description="Payout runs will appear here once triggered."
                />
              }
              className="border-gray-800 bg-transparent"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
