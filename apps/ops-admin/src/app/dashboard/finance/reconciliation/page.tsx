import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { PageHeader, StatusBadge, EmptyState } from '@ridendine/ui';
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
  if (status === 'disputed') return 'warning';
  return 'idle';
}

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
          <div className="flex items-center justify-between rounded-lg border border-warning/40 bg-warningSoft px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-warning">
                Unmatched variance — {unmatched.length} rows
              </p>
              <p className="text-xs text-warning/70">
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
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Rows</h2>
              <span className="rounded-full bg-surfaceMuted px-2 py-0.5 text-xs text-textSubtle">
                {(rows ?? []).length}
              </span>
            </div>
            {(rows ?? []).length === 0 ? (
              <EmptyState title="No reconciliation rows" description="No data to display." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-textMuted">
                      <th className="py-3 pr-4">Created</th>
                      <th className="py-3 pr-4">Stripe Event</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Variance</th>
                      <th className="py-3 pr-4">Ledger IDs</th>
                      <th className="py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((rows ?? []) as ReconciliationRow[]).map((row) => (
                      <tr key={row.id} className="border-b border-border text-textSubtle">
                        <td className="py-3 pr-4 whitespace-nowrap text-xs">
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-textMuted">
                          {row.stripe_event_id?.slice(0, 24)}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={getReconciliationStatus(row.status)} label={row.status} />
                        </td>
                        <td className={`py-3 pr-4 font-mono ${row.variance_cents !== 0 ? 'text-danger' : 'text-textMuted'}`}>
                          {row.variance_cents}
                        </td>
                        <td className="py-3 pr-4 text-xs text-textMuted">
                          {Array.isArray(row.ledger_entry_ids) ? row.ledger_entry_ids.length : 0}
                        </td>
                        <td className="py-3 text-xs text-textMuted">{row.notes ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
