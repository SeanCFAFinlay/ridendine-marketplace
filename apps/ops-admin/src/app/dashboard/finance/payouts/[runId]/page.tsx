import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { FinanceSubnav } from '../../_components/FinanceSubnav';
import { FinanceAccessDenied } from '../../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../../_lib/roles';

export const dynamic = 'force-dynamic';

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

type PageProps = { params: Promise<{ runId: string }> };

export default async function FinancePayoutRunDetailPage({ params }: PageProps) {
  const { runId } = await params;
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }

  const admin = createAdminClient();
  const { data: run, error } = await admin.from('payout_runs').select('*').eq('id', runId).maybeSingle();

  const { data: ledgerLines } = await admin
    .from('ledger_entries')
    .select('id, created_at, entry_type, amount_cents, description, entity_id, metadata')
    .contains('metadata', { payout_run_id: runId })
    .order('created_at', { ascending: false })
    .limit(200);

  const { data: driverLines } =
    (run?.run_type as string) === 'driver'
      ? await admin.from('driver_payouts').select('*').eq('payout_run_id', runId)
      : { data: [] };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />
        <Link href="/dashboard/finance/payouts" className="text-sm text-emerald-400 hover:underline">
          ← All payout runs
        </Link>
        {error || !run ? (
          <Card className="border-gray-800 bg-[#16213e] p-6 text-gray-300">Run not found.</Card>
        ) : (
          <>
            <div>
              <h1 className="text-3xl font-bold text-white">Payout run</h1>
              <p className="mt-1 font-mono text-sm text-gray-400">{runId}</p>
              <p className="mt-2 text-gray-300">
                Type <span className="text-white">{run.run_type as string}</span> · status{' '}
                <span className="text-white">{run.status as string}</span>
              </p>
            </div>
            <Card className="border-gray-800 bg-[#16213e] p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <p className="text-gray-400">Period</p>
                  <p className="mt-1 text-white">
                    {(run.period_start as string)?.slice(0, 10)} → {(run.period_end as string)?.slice(0, 10)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Total amount (run)</p>
                  <p className="mt-1 text-white">{run.total_amount as number}</p>
                </div>
                <div>
                  <p className="text-gray-400">Successful</p>
                  <p className="mt-1 text-emerald-300">{run.successful_payouts as number}</p>
                </div>
                <div>
                  <p className="text-gray-400">Failed</p>
                  <p className="mt-1 text-red-300">{run.failed_payouts as number}</p>
                </div>
              </div>
            </Card>

            <Card className="border-gray-800 bg-[#16213e] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Ledger (payout_run_id)</h2>
                <Badge className="bg-gray-700 text-gray-200">{(ledgerLines ?? []).length}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400">
                      <th className="py-2">When</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Payee</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledgerLines ?? []).map((e: Record<string, unknown>) => (
                      <tr key={e.id as string} className="border-b border-gray-800 text-gray-200">
                        <td className="py-2 whitespace-nowrap">
                          {new Date(e.created_at as string).toLocaleString()}
                        </td>
                        <td className="py-2">{e.entry_type as string}</td>
                        <td className="py-2 font-mono text-xs">{(e.entity_id as string)?.slice(0, 8)}…</td>
                        <td className="py-2 font-mono text-emerald-200">
                          {fmtCents(e.amount_cents as number)}
                        </td>
                        <td className="py-2 text-gray-400">{(e.description as string) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {(run.run_type as string) === 'driver' && (driverLines?.length ?? 0) > 0 ? (
              <Card className="border-gray-800 bg-[#16213e] p-6">
                <h2 className="text-lg font-semibold text-white">driver_payouts rows</h2>
                <ul className="mt-4 space-y-2 text-sm text-gray-300">
                  {(driverLines ?? []).map((d: Record<string, unknown>) => (
                    <li key={d.id as string} className="flex justify-between border-b border-gray-800 py-2">
                      <span className="font-mono text-xs">{(d.driver_id as string)?.slice(0, 8)}…</span>
                      <span>{d.amount as number}</span>
                      <span>{d.status as string}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
