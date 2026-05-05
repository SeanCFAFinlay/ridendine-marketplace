import { Badge, Card } from '@ridendine/ui';
import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { FinanceSubnav } from '../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../_lib/roles';

export const dynamic = 'force-dynamic';

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
        <div>
          <h1 className="text-3xl font-bold text-white">Stripe reconciliation</h1>
          <p className="mt-1 text-gray-400">
            Daily job matches stripe_events_processed to ledger. Unmatched rows are never silent — review notes
            below.
          </p>
        </div>

        <Card className="border-amber-900/40 bg-opsPanel p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-amber-100">Unmatched variance</h2>
            <Badge className="bg-amber-600/30 text-amber-50">{unmatched.length}</Badge>
          </div>
          <p className="mt-2 text-sm text-amber-100/90">
            Resolve in DB or POST <span className="font-mono">/api/engine/reconciliation</span> with{' '}
            <span className="font-mono">resolve_manual</span> (finance_engine capability).
          </p>
        </Card>

        {error ? (
          <Card className="border-red-900/50 bg-opsPanel p-6 text-red-200">Failed to load reconciliation.</Card>
        ) : (
          <Card className="border-gray-800 bg-opsPanel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Rows</h2>
              <Badge className="bg-gray-700 text-gray-200">{(rows ?? []).length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="py-2">Created</th>
                    <th className="py-2">Stripe event</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Variance (¢)</th>
                    <th className="py-2">Ledger IDs</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((r: Record<string, unknown>) => (
                    <tr
                      key={r.id as string}
                      className={`border-b border-gray-800 ${
                        r.status === 'unmatched' ? 'bg-red-950/20' : ''
                      }`}
                    >
                      <td className="py-3 whitespace-nowrap text-gray-200">
                        {new Date(r.created_at as string).toLocaleString()}
                      </td>
                      <td className="py-3 font-mono text-xs text-gray-300">
                        {(r.stripe_event_id as string)?.slice(0, 24)}…
                      </td>
                      <td className="py-3 text-gray-200">{r.status as string}</td>
                      <td className="py-3 font-mono text-gray-200">{String(r.variance_cents)}</td>
                      <td className="py-3 text-xs text-gray-400">
                        {Array.isArray(r.ledger_entry_ids) ? (r.ledger_entry_ids as string[]).length : 0}
                      </td>
                      <td className="py-3 text-xs text-gray-400 max-w-md">{(r.notes as string) ?? '—'}</td>
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
