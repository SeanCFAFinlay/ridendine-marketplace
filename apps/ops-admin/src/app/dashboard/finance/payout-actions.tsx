'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@ridendine/ui';

interface PayableChef {
  chefId: string;
  storefrontId: string | null;
  name: string;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  stripeAccountId: string | null;
  payoutEnabled: boolean;
}

interface BankPayout {
  id: string;
  payeeType: 'chef' | 'driver';
  name: string;
  amountCents: number;
  status: string;
  bankBatchId: string | null;
  bankReference: string | null;
  reconciliationStatus: string;
}

export function PayoutActions() {
  const [chefs, setChefs] = useState<PayableChef[]>([]);
  const [bankPayouts, setBankPayouts] = useState<BankPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/engine/payouts')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setChefs(data.data.payableChefs ?? data.data);
          setBankPayouts(data.data.bankPayouts ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const executePayout = async (chef: PayableChef) => {
    if (!chef.storefrontId) {
      setError(`${chef.name} doesn't have a storefront payout account`);
      return;
    }
    if (!confirm(`Pay $${chef.balance.toFixed(2)} to ${chef.name}?`)) return;

    setPaying(chef.chefId);
    setError('');
    try {
      const res = await fetch('/api/engine/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chefId: chef.chefId,
          storefrontId: chef.storefrontId,
          amountCents: Math.round(chef.balance * 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const amountCents = Math.round(chef.balance * 100);
      setChefs(chefs.map(c =>
        c.chefId === chef.chefId
          ? { ...c, balance: 0, totalPaid: c.totalPaid + c.balance }
          : c
      ));
      setBankPayouts([
        {
          id: data.data?.payoutId || data.payout?.id,
          payeeType: 'chef',
          name: chef.name,
          amountCents,
          status: 'scheduled',
          bankBatchId: null,
          bankReference: null,
          reconciliationStatus: 'pending',
        },
        ...bankPayouts,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payout failed');
    } finally {
      setPaying(null);
    }
  };

  const runBankAction = async (payout: BankPayout, action: string) => {
    const bankReference =
      action === 'mark_bank_paid' || action === 'mark_bank_submitted' || action === 'reconcile_bank_payout'
        ? window.prompt('BANK reference', payout.bankReference || '')
        : undefined;
    if (bankReference === null) return;

    setPaying(`${action}:${payout.id}`);
    setError('');
    try {
      const res = await fetch('/api/engine/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          payeeType: payout.payeeType,
          payoutId: payout.id,
          payoutIds: [payout.id],
          bankReference,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const nextStatus: Record<string, string> = {
        approve_bank_payout: 'approved',
        export_bank_batch: 'exported',
        mark_bank_submitted: 'bank_submitted',
        mark_bank_paid: 'paid',
        reconcile_bank_payout: 'reconciled',
      };
      setBankPayouts(bankPayouts.map((p) =>
        p.id === payout.id
          ? {
              ...p,
              status: nextStatus[action] ?? p.status,
              bankReference: bankReference ?? p.bankReference,
              bankBatchId: data.data?.bankBatchId ?? p.bankBatchId,
              reconciliationStatus: action === 'reconcile_bank_payout' ? 'reconciled' : p.reconciliationStatus,
            }
          : p
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BANK action failed');
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-gray-800 bg-[#16213e] p-6">
        <div className="animate-pulse h-20 bg-gray-700/30 rounded" />
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-[#16213e] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Chef Payouts</h3>
        <span className="text-sm text-gray-400">{chefs.length} chefs with balance</span>
      </div>
      {error && (
        <div className="mb-3 rounded-lg bg-red-500/20 p-3 text-sm text-red-300">{error}</div>
      )}
      {chefs.length === 0 ? (
        <p className="text-sm text-gray-500">No outstanding chef payouts.</p>
      ) : (
        <div className="space-y-3">
          {chefs.map((chef) => (
            <div key={chef.chefId} className="flex items-center justify-between rounded-lg bg-[#1a1a2e] p-4">
              <div>
                <p className="font-medium text-white">{chef.name}</p>
                <p className="text-xs text-gray-500">
                  Earned: ${chef.totalEarned.toFixed(2)} | Paid: ${chef.totalPaid.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-emerald-400">${chef.balance.toFixed(2)}</span>
                <Button
                  size="sm"
                  onClick={() => executePayout(chef)}
                  disabled={paying === chef.chefId || chef.balance <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {paying === chef.chefId ? 'Recording...' : 'Record BANK'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {bankPayouts.length > 0 && (
        <div className="mt-6 border-t border-gray-700 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-semibold text-white">BANK Queue</h4>
            <span className="text-xs text-gray-400">{bankPayouts.length} active</span>
          </div>
          <div className="space-y-3">
            {bankPayouts.map((payout) => (
              <div key={payout.id} className="rounded-lg bg-[#1a1a2e] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{payout.name}</p>
                    <p className="text-xs text-gray-500">
                      ${(payout.amountCents / 100).toFixed(2)} | {payout.status}
                      {payout.bankBatchId ? ` | ${payout.bankBatchId}` : ''}
                      {payout.bankReference ? ` | ${payout.bankReference}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {payout.status === 'scheduled' && (
                      <Button size="sm" variant="outline" onClick={() => runBankAction(payout, 'approve_bank_payout')} disabled={Boolean(paying)}>
                        Approve
                      </Button>
                    )}
                    {['scheduled', 'approved'].includes(payout.status) && (
                      <Button size="sm" variant="outline" onClick={() => runBankAction(payout, 'export_bank_batch')} disabled={Boolean(paying)}>
                        Export
                      </Button>
                    )}
                    {payout.status === 'exported' && (
                      <Button size="sm" variant="outline" onClick={() => runBankAction(payout, 'mark_bank_submitted')} disabled={Boolean(paying)}>
                        Submitted
                      </Button>
                    )}
                    {['exported', 'bank_submitted'].includes(payout.status) && (
                      <Button size="sm" variant="outline" onClick={() => runBankAction(payout, 'mark_bank_paid')} disabled={Boolean(paying)}>
                        Paid
                      </Button>
                    )}
                    {payout.status === 'paid' && (
                      <Button size="sm" variant="outline" onClick={() => runBankAction(payout, 'reconcile_bank_payout')} disabled={Boolean(paying)}>
                        Reconcile
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
