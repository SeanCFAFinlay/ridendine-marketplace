import { Badge, Card } from '@ridendine/ui';
import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { FinanceSubnav } from '../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../_lib/roles';

export const dynamic = 'force-dynamic';

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function FinanceInstantPayoutsPage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('instant_payout_requests')
    .select('id, driver_id, amount_cents, fee_cents, status, requested_at, executed_at, failure_reason')
    .order('requested_at', { ascending: false })
    .limit(100);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />
        <div>
          <h1 className="text-3xl font-bold text-white">Instant payout queue</h1>
          <p className="mt-1 text-gray-400">
            Driver-requested payouts (1.5% fee posted to ledger). Execute / cancel via API or future actions.
          </p>
        </div>
        {error ? (
          <Card className="border-red-900/50 bg-[#16213e] p-6 text-red-200">Failed to load queue.</Card>
        ) : (
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Requests</h2>
              <Badge className="bg-amber-500/20 text-amber-100">{(rows ?? []).length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="py-2">Requested</th>
                    <th className="py-2">Driver</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Fee (1.5%)</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((r: Record<string, unknown>) => (
                    <tr key={r.id as string} className="border-b border-gray-800 text-gray-200">
                      <td className="py-3 whitespace-nowrap">
                        {new Date(r.requested_at as string).toLocaleString()}
                      </td>
                      <td className="py-3 font-mono text-xs">{(r.driver_id as string)?.slice(0, 8)}…</td>
                      <td className="py-3 text-emerald-200">{fmtCents(r.amount_cents as number)}</td>
                      <td className="py-3">{fmtCents(r.fee_cents as number)}</td>
                      <td className="py-3">{r.status as string}</td>
                      <td className="py-3 text-xs text-red-300">{(r.failure_reason as string) ?? '—'}</td>
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
