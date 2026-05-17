import Link from 'next/link';
import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { PageHeader, EmptyState, StatusBadge } from '@ridendine/ui';
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

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getPayoutStatus(status: string): 'success' | 'danger' | 'warning' | 'active' | 'idle' {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'processing') return 'active';
  if (status === 'pending') return 'warning';
  return 'idle';
}

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
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Runs</h2>
              <span className="rounded-full bg-surfaceMuted px-2 py-0.5 text-xs text-textSubtle">
                {(runs ?? []).length}
              </span>
            </div>
            {(runs ?? []).length === 0 ? (
                <EmptyState
                  title="No payout runs yet"
                  description="Payout runs will appear here once triggered."
                />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-textMuted">
                      <th className="py-3 pr-4">Created</th>
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Period</th>
                      <th className="py-3 pr-4">Amount</th>
                      <th className="py-3 pr-4">Success / Fail</th>
                      <th className="py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {((runs ?? []) as PayoutRun[]).map((run) => (
                      <tr key={run.id} className="border-b border-border text-textSubtle">
                        <td className="py-3 pr-4 whitespace-nowrap text-xs">
                          {new Date(run.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 font-medium text-textSubtle">{run.run_type}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={getPayoutStatus(run.status)} label={run.status} />
                        </td>
                        <td className="py-3 pr-4 text-xs text-textMuted">
                          {run.period_start?.slice(0, 10)} - {run.period_end?.slice(0, 10)}
                        </td>
                        <td className="py-3 pr-4 font-mono text-success">
                          {formatCents(Number(run.total_amount))}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-success">{run.successful_payouts}</span>
                          {' / '}
                          <span className={run.failed_payouts > 0 ? 'text-danger' : 'text-textMuted'}>
                            {run.failed_payouts}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/dashboard/finance/payouts/${run.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Detail
                          </Link>
                        </td>
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
