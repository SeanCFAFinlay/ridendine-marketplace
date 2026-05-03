import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { createAdminClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { FinanceSubnav } from '../_components/FinanceSubnav';

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export type AccountDetailType = 'chefs' | 'drivers';

export async function FinanceAccountDetailContent({ type, id }: { type: AccountDetailType; id: string }) {
  const accountType = type === 'chefs' ? 'chef_payable' : 'driver_payable';
  const admin = createAdminClient();

  const { data: account, error: acctErr } = await admin
    .from('platform_accounts')
    .select('*')
    .eq('account_type', accountType)
    .eq('owner_id', id)
    .maybeSingle();

  let title = id;
  if (type === 'chefs') {
    const { data: sf } = await admin.from('chef_storefronts').select('name').eq('id', id).maybeSingle();
    title = (sf?.name as string) ?? id;
  } else {
    const { data: d } = await admin.from('drivers').select('first_name, last_name').eq('id', id).maybeSingle();
    title =
      `${(d?.first_name as string) ?? ''} ${(d?.last_name as string) ?? ''}`.trim() || id;
  }

  const { data: entries, error: ledErr } = await admin
    .from('ledger_entries')
    .select('id, created_at, entry_type, amount_cents, description, order_id, metadata')
    .eq('entity_type', type === 'chefs' ? 'storefront' : 'driver')
    .eq('entity_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  const listHref = type === 'chefs' ? '/dashboard/finance/accounts/chefs' : '/dashboard/finance/accounts/drivers';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <FinanceSubnav />
        <div className="flex flex-wrap items-center gap-3">
          <Link href={listHref} className="text-sm text-emerald-400 hover:underline">
            ← Back to {type === 'chefs' ? 'chef' : 'driver'} accounts
          </Link>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-gray-400">
            {accountType} · owner <span className="font-mono text-gray-300">{id}</span>
          </p>
        </div>

        {acctErr || !account ? (
          <Card className="border-gray-800 bg-[#16213e] p-6 text-gray-300">
            No platform_accounts row yet (balance may be zero until ledger activity).
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-gray-800 bg-[#16213e] p-4">
              <p className="text-sm text-gray-400">Balance</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {fmtCents(account.balance_cents as number)}
              </p>
            </Card>
            <Card className="border-gray-800 bg-[#16213e] p-4">
              <p className="text-sm text-gray-400">Pending payout</p>
              <p className="mt-1 text-2xl font-bold text-yellow-200">
                {fmtCents((account.pending_payout_cents as number) ?? 0)}
              </p>
            </Card>
            <Card className="border-gray-800 bg-[#16213e] p-4">
              <p className="text-sm text-gray-400">Currency</p>
              <p className="mt-1 text-2xl font-bold text-white">{(account.currency as string) ?? 'CAD'}</p>
            </Card>
          </div>
        )}

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Ledger lines (entity scoped)</h2>
            <Badge className="bg-gray-700 text-gray-200">{(entries ?? []).length}</Badge>
          </div>
          {ledErr ? (
            <p className="text-red-300">Could not load ledger.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="py-2">When</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Order</th>
                    <th className="py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {(entries ?? []).map((e: Record<string, unknown>) => (
                    <tr key={e.id as string} className="border-b border-gray-800 text-gray-200">
                      <td className="py-2 whitespace-nowrap">
                        {new Date(e.created_at as string).toLocaleString()}
                      </td>
                      <td className="py-2">{e.entry_type as string}</td>
                      <td className="py-2 font-mono text-emerald-200">{fmtCents(e.amount_cents as number)}</td>
                      <td className="py-2 font-mono text-xs text-gray-400">
                        {(e.order_id as string | null)?.slice(0, 8) ?? '—'}
                      </td>
                      <td className="py-2 text-gray-400">{(e.description as string) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
