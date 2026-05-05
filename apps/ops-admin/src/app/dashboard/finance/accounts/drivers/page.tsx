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

export default async function FinanceDriverAccountsPage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from('platform_accounts')
    .select('owner_id, balance_cents, pending_payout_cents, currency, updated_at')
    .eq('account_type', 'driver_payable')
    .order('balance_cents', { ascending: false });

  const driverIds = (rows ?? []).map((r: { owner_id: string }) => r.owner_id);
  const { data: drivers } =
    driverIds.length > 0
      ? await admin.from('drivers').select('id, first_name, last_name').in('id', driverIds)
      : { data: [] as { id: string; first_name: string; last_name: string }[] };

  const nameById = new Map(
    (drivers ?? []).map((d: { id: string; first_name: string; last_name: string }) => [
      d.id,
      `${d.first_name ?? ''} ${d.last_name ?? ''}`.trim() || d.id,
    ])
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />
        <div>
          <h1 className="text-3xl font-bold text-white">Driver payable accounts</h1>
          <p className="mt-1 text-gray-400">Balances derived from ledger_entries (driver_payable).</p>
        </div>
        {error ? (
          <Card className="border-red-900/50 bg-opsPanel p-6 text-red-200">Failed to load accounts.</Card>
        ) : (
          <Card className="border-gray-800 bg-opsPanel p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Drivers</h2>
              <Badge className="bg-blue-500/20 text-blue-200">{(rows ?? []).length}</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="py-2">Name</th>
                    <th className="py-2">Balance</th>
                    <th className="py-2">Pending payout</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((r: { owner_id: string; balance_cents: number; pending_payout_cents?: number }) => {
                    const id = r.owner_id;
                    return (
                      <tr key={id} className="border-b border-gray-800 text-gray-200">
                        <td className="py-3">{String(nameById.get(id) ?? id)}</td>
                        <td className="py-3 text-emerald-300">{fmtCents(r.balance_cents as number)}</td>
                        <td className="py-3">{fmtCents((r.pending_payout_cents as number) ?? 0)}</td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/dashboard/finance/accounts/drivers/${id}`}
                            className="text-emerald-400 hover:underline"
                          >
                            Ledger
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
