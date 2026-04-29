'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';

interface PayableChef {
  chefId: string;
  name: string;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  stripeAccountId: string | null;
  payoutEnabled: boolean;
}

export function PayoutActions() {
  const [chefs, setChefs] = useState<PayableChef[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/engine/payouts')
      .then(r => r.json())
      .then(data => { if (data.success) setChefs(data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const executePayout = async (chef: PayableChef) => {
    if (!chef.stripeAccountId || !chef.payoutEnabled) {
      setError(`${chef.name} doesn't have a connected Stripe account`);
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
          amountCents: Math.round(chef.balance * 100),
          stripeAccountId: chef.stripeAccountId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChefs(chefs.map(c =>
        c.chefId === chef.chefId
          ? { ...c, balance: 0, totalPaid: c.totalPaid + c.balance }
          : c
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payout failed');
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
                {chef.stripeAccountId && chef.payoutEnabled ? (
                  <Button
                    size="sm"
                    onClick={() => executePayout(chef)}
                    disabled={paying === chef.chefId || chef.balance <= 0}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {paying === chef.chefId ? 'Paying...' : 'Pay Now'}
                  </Button>
                ) : (
                  <Badge className="bg-gray-700 text-gray-400">No Stripe</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
