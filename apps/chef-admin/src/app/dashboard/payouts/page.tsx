'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';

interface Payout {
  id: string;
  amount: number;
  status: 'scheduled' | 'approved' | 'exported' | 'bank_submitted' | 'paid' | 'failed' | 'reconciled';
  created_at: string;
  paid_at: string | null;
  period_start: string;
  period_end: string;
}

interface PayoutAccount {
  id: string;
  stripe_account_id: string;
  status: 'pending' | 'active' | 'restricted';
  created_at: string;
}

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const db = supabase;

    async function fetchPayoutData() {
      setLoading(true);

      const { data: { user } } = await db.auth.getUser();
      if (!user) return;

      // Get chef profile
      const { data: chefProfile } = await db
        .from('chef_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: { id: string } | null };

      if (!chefProfile) return;

      // Get payout account
      const { data: payoutAccount } = await db
        .from('chef_payout_accounts')
        .select('*')
        .eq('chef_id', chefProfile.id)
        .single() as { data: PayoutAccount | null };

      setAccount(payoutAccount);

      // Get payouts
      const { data: payoutsData } = await db
        .from('chef_payouts')
        .select('*')
        .eq('chef_id', chefProfile.id)
        .order('created_at', { ascending: false }) as { data: Payout[] | null };

      if (payoutsData) {
        setPayouts(payoutsData);
      }

      // Get storefront for balance calculation
      const { data: storefront } = await db
        .from('chef_storefronts')
        .select('id')
        .eq('chef_id', chefProfile.id)
        .single() as { data: { id: string } | null };

      if (storefront) {
        // Calculate pending and available balance from completed orders
        const { data: orders } = await db
          .from('orders')
          .select('total, status, created_at')
          .eq('storefront_id', storefront.id)
          .in('status', ['delivered', 'completed']);

        if (orders) {
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

          let pending = 0;
          let available = 0;

          // 15% platform fee → chef earns 85% of the order total.
          // This used to read an orders.chef_payout column that never existed
          // on the live schema; falling back to (total * 0.85) for every order.
          orders.forEach((order: { total: number | null; created_at: string }) => {
            const orderDate = new Date(order.created_at);
            const payout = Number(order.total ?? 0) * 0.85;

            if (orderDate > sevenDaysAgo) {
              pending += payout;
            } else {
              available += payout;
            }
          });

          // Subtract already paid out amounts
          payoutsData?.forEach((p: Payout) => {
            if (['scheduled', 'approved', 'exported', 'bank_submitted', 'paid', 'reconciled'].includes(p.status)) {
              available -= p.amount / 100;
            }
          });

          setPendingBalance(Math.max(0, pending));
          setAvailableBalance(Math.max(0, available));
        }
      }

      setLoading(false);
    }

    fetchPayoutData();
  }, [supabase]);

  const handleSetupAccount = async () => {
    try {
      const response = await fetch('/api/payouts/setup', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error setting up payout account:', error);
      alert('Failed to setup payout account. Please try again.');
    }
  };

  const handleRequestPayout = async () => {
    if (availableBalance < 10) {
      alert('Minimum payout amount is $10');
      return;
    }

    try {
      const response = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: availableBalance }),
      });

      if (response.ok) {
        const { payout } = await response.json();
        setPayouts((prev) => [payout, ...prev]);
        setAvailableBalance(0);
        alert('Payout requested! Funds will be transferred within 2-3 business days.');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to request payout');
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      alert('Failed to request payout. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text">Payouts</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 w-24 bg-surfaceMuted rounded" />
              <div className="mt-2 h-8 w-20 bg-surfaceMuted rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Payouts</h1>
        <p className="mt-1 text-textMuted">Manage your earnings and payouts</p>
      </div>

      {/* Account Setup Banner */}
      {!account && (
        <Card className="bg-primarySoft border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-primary">Setup Required</h3>
              <p className="text-sm text-primary">
                Connect your bank account to receive payouts
              </p>
            </div>
            <Button onClick={handleSetupAccount}>
              Setup Payout Account
            </Button>
          </div>
        </Card>
      )}

      {account && account.status === 'restricted' && (
        <Card className="bg-warningSoft border-warning/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-warning">Account Restricted</h3>
              <p className="text-sm text-warning">
                Additional verification required to continue receiving payouts
              </p>
            </div>
            <Button variant="outline" onClick={handleSetupAccount}>
              Complete Verification
            </Button>
          </div>
        </Card>
      )}

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-textMuted">Available Balance</p>
          <p className="mt-1 text-3xl font-bold text-success">
            ${availableBalance.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-textSubtle">Ready to withdraw</p>
        </Card>
        <Card>
          <p className="text-sm text-textMuted">Pending Balance</p>
          <p className="mt-1 text-3xl font-bold text-primary">
            ${pendingBalance.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-textSubtle">Available in 7 days</p>
        </Card>
        <Card>
          <p className="text-sm text-textMuted">Total Paid Out</p>
          <p className="mt-1 text-3xl font-bold text-text">
            ${payouts
              .filter((p) => ['paid', 'reconciled'].includes(p.status))
              .reduce((sum, p) => sum + p.amount / 100, 0)
              .toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-textSubtle">Lifetime earnings</p>
        </Card>
      </div>

      {/* Request Payout */}
      {account && account.status === 'active' && availableBalance >= 10 && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-text">Request Payout</h3>
              <p className="text-sm text-textMuted">
                Transfer ${availableBalance.toFixed(2)} to your bank account
              </p>
            </div>
            <Button onClick={handleRequestPayout}>
              Request Payout
            </Button>
          </div>
        </Card>
      )}

      {/* Payout History */}
      <Card>
        <h3 className="font-semibold text-text">Payout History</h3>
        {payouts.length === 0 ? (
          <p className="mt-4 text-sm text-textMuted">No payouts yet</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-textMuted">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Period</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b">
                    <td className="py-3 text-text">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-textMuted">
                      {new Date(payout.period_start).toLocaleDateString()} -{' '}
                      {new Date(payout.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-medium text-text">
                      ${(payout.amount / 100).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={
                          ['paid', 'reconciled'].includes(payout.status) ? 'success' :
                          ['exported', 'bank_submitted'].includes(payout.status) ? 'info' :
                          payout.status === 'failed' ? 'error' : 'warning'
                        }
                      >
                        {payout.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Fee Structure Info */}
      <Card className="bg-surfaceMuted">
        <h3 className="font-semibold text-text">Fee Structure</h3>
        <div className="mt-4 space-y-2 text-sm text-textMuted">
          <div className="flex justify-between">
            <span>Platform Fee</span>
            <span className="font-medium">15%</span>
          </div>
          <div className="flex justify-between">
            <span>Processing Fee (Stripe)</span>
            <span className="font-medium">2.9% + $0.30</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium text-text">Your Earnings</span>
            <span className="font-medium text-success">~82%</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-textMuted">
          Payouts are processed weekly on Mondays. Funds are held for 7 days before becoming available.
        </p>
      </Card>
    </div>
  );
}
