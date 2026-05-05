import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { FinanceSubnav } from '../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../_lib/roles';

export const dynamic = 'force-dynamic';

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
        <div>
          <h1 className="text-3xl font-bold text-white">Payout runs</h1>
          <p className="mt-1 text-gray-400">
            Chef runs (weekly cadence in ops) and driver runs (daily). Lines are ledger-debited and traceable.
          </p>
        </div>
        {error ? (
          <Card className="border-red-900/50 bg-opsPanel p-6 text-red-200">Failed to load payout runs.</Card>
        ) : (
          <Card className="border-gray-800 bg-opsPanel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent runs</h2>
              <Badge className="bg-gray-700 text-gray-200">{(runs ?? []).length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="py-2">Created</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Period</th>
                    <th className="py-2">Recipients OK / fail</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(runs ?? []).map((r: Record<string, unknown>) => (
                    <tr key={r.id as string} className="border-b border-gray-800 text-gray-200">
                      <td className="py-3 whitespace-nowrap">
                        {new Date(r.created_at as string).toLocaleString()}
                      </td>
                      <td className="py-3">{r.run_type as string}</td>
                      <td className="py-3">{r.status as string}</td>
                      <td className="py-3 text-xs text-gray-400">
                        {(r.period_start as string)?.slice(0, 10)} → {(r.period_end as string)?.slice(0, 10)}
                      </td>
                      <td className="py-3">
                        {r.successful_payouts as number} / {r.failed_payouts as number}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href={`/dashboard/finance/payouts/${r.id as string}`}
                          className="text-emerald-400 hover:underline"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
