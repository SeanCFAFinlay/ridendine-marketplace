import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { PageHeader, StatusBadge, DataTable, EmptyState } from '@ridendine/ui';
import type { ColumnDef } from '@ridendine/ui';
import { FinanceSubnav } from '../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../_lib/roles';

export const dynamic = 'force-dynamic';

type ReconciliationRow = {
  id: string;
  created_at: string;
  stripe_event_id: string;
  status: string;
  variance_cents: number;
  ledger_entry_ids: string[];
  notes: string | null;
};

function getReconciliationStatus(status: string): 'success' | 'danger' | 'warning' | 'idle' {
  if (status === 'matched') return 'success';
  if (status === 'unmatched') return 'danger';
  if (status === 'partial') return 'warning';
  return 'idle';
}

const columns: ColumnDef<ReconciliationRow>[] = [
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
    key: 'stripe_event_id',
    header: 'Stripe Event',
    cell: (row) => (
      <span className="font-mono text-xs text-gray-400">
        {row.stripe_event_id?.slice(0, 24)}…
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    cell: (row) => (
      <StatusBadge status={getReconciliationStatus(row.status)} label={row.status} />
    ),
  },
  {
    key: 'variance_cents',
    header: 'Variance (¢)',
    sortable: true,
    cell: (row) => (
      <span className={`font-mono text-sm ${row.variance_cents !== 0 ? 'text-red-400' : 'text-gray-400'}`}>
        {row.variance_cents}
      </span>
    ),
  },
  {
    key: 'ledger_entry_ids',
    header: 'Ledger IDs',
    cell: (row) => (
      <span className="text-xs text-gray-500">
        {Array.isArray(row.ledger_entry_ids) ? row.ledger_entry_ids.length : 0}
      </span>
    ),
  },
  {
    key: 'notes',
    header: 'Notes',
    cell: (row) => (
      <span className="max-w-xs truncate text-xs text-gray-400">{row.notes ?? '—'}</span>
    ),
  },
];

export default async function FinanceReconciliationPage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('stripe_reconciliation')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const unmatched = (rows ?? []).filter((r: Record<string, unknown>) => r.status === 'unmatched');

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />

        <PageHeader
          title="Stripe Reconciliation"
          subtitle="Daily job matches stripe_events_processed to ledger. Unmatched rows require review."
        />

        {unmatched.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-amber-100">
                Unmatched variance — {unmatched.length} rows
              </p>
              <p className="text-xs text-amber-200/70">
                Resolve in DB or POST <code>/api/engine/reconciliation</code> with{' '}
                <code>resolve_manual</code>
              </p>
            </div>
            <StatusBadge status="danger" label={String(unmatched.length)} />
          </div>
        )}

        {error ? (
          <EmptyState
            title="Failed to load reconciliation"
            description="Unable to fetch reconciliation data. Check your database connection."
          />
        ) : (
          <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Rows</h2>
              <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                {(rows ?? []).length}
              </span>
            </div>
            <DataTable
              columns={columns}
              data={(rows ?? []) as ReconciliationRow[]}
              keyExtractor={(r) => r.id}
              emptyState={<EmptyState title="No reconciliation rows" description="No data to display." />}
              className="border-gray-800 bg-transparent"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
