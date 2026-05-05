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
  const [pendingChef, setPendingChef] = useState<PayableChef | null>(null);
  const [pendingBankAction, setPendingBankAction] = useState<{
    payout: BankPayout;
    action: string;
  } | null>(null);
  const [bankReference, setBankReference] = useState('');

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

    setPaying(chef.chefId);
    setError('');
    try {
      const res = await fetch('/api/engine/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule_chef_payout',
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
      setPendingChef(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payout failed');
    } finally {
      setPaying(null);
    }
  };

  const runBankAction = async (payout: BankPayout, action: string, reference: string) => {
    const needsReference = action === 'mark_bank_paid' || action === 'reconcile_bank_payout';
    if (needsReference && reference.trim().length < 3) {
      setError('BANK reference is required for paid and reconciled payouts');
      return;
    }

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
          bankReference: reference.trim() || undefined,
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
              bankReference: reference.trim() || p.bankReference,
              bankBatchId: data.data?.bankBatchId ?? p.bankBatchId,
              reconciliationStatus: action === 'reconcile_bank_payout' ? 'reconciled' : p.reconciliationStatus,
            }
          : p
      ));
      setPendingBankAction(null);
      setBankReference('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'BANK action failed');
    } finally {
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-gray-800 bg-opsPanel p-6">
        <div className="animate-pulse h-20 bg-gray-700/30 rounded" />
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-opsPanel p-6">
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
            <div key={chef.chefId} className="rounded-lg bg-opsPanel p-4">
              <div className="flex items-center justify-between">
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
                    onClick={() => setPendingChef(chef)}
                    disabled={paying === chef.chefId || chef.balance <= 0}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {paying === chef.chefId ? 'Recording...' : 'Record BANK'}
                  </Button>
                </div>
              </div>
              {pendingChef?.chefId === chef.chefId && (
                <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-sm text-emerald-100">
                    Schedule BANK payout for ${chef.balance.toFixed(2)} to {chef.name}.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => executePayout(chef)}
                      disabled={Boolean(paying)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Confirm Schedule
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPendingChef(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
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
              <div key={payout.id} className="rounded-lg bg-opsPanel p-4">
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
                      <Button size="sm" variant="outline" onClick={() => setPendingBankAction({ payout, action: 'approve_bank_payout' })} disabled={Boolean(paying)}>
                        Approve
                      </Button>
                    )}
                    {['scheduled', 'approved'].includes(payout.status) && (
                      <Button size="sm" variant="outline" onClick={() => setPendingBankAction({ payout, action: 'export_bank_batch' })} disabled={Boolean(paying)}>
                        Export
                      </Button>
                    )}
                    {payout.status === 'exported' && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setBankReference(payout.bankReference || '');
                        setPendingBankAction({ payout, action: 'mark_bank_submitted' });
                      }} disabled={Boolean(paying)}>
                        Submitted
                      </Button>
                    )}
                    {['exported', 'bank_submitted'].includes(payout.status) && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setBankReference(payout.bankReference || '');
                        setPendingBankAction({ payout, action: 'mark_bank_paid' });
                      }} disabled={Boolean(paying)}>
                        Paid
                      </Button>
                    )}
                    {payout.status === 'paid' && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setBankReference(payout.bankReference || '');
                        setPendingBankAction({ payout, action: 'reconcile_bank_payout' });
                      }} disabled={Boolean(paying)}>
                        Reconcile
                      </Button>
                    )}
                  </div>
                </div>
                {pendingBankAction?.payout.id === payout.id && (
                  <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                    <p className="text-sm text-blue-100">
                      Confirm {pendingBankAction.action.replace(/_/g, ' ')} for {payout.name}.
                    </p>
                    {['mark_bank_submitted', 'mark_bank_paid', 'reconcile_bank_payout'].includes(pendingBankAction.action) && (
                      <input
                        value={bankReference}
                        onChange={(event) => setBankReference(event.target.value)}
                        placeholder="BANK reference"
                        className="mt-3 w-full rounded-lg border border-gray-600 bg-[#101827] px-3 py-2 text-sm text-white"
                      />
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => runBankAction(payout, pendingBankAction.action, bankReference)}
                        disabled={Boolean(paying)}
                      >
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPendingBankAction(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
