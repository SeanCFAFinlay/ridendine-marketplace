'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';
import { PayoutSummaryCard } from '@/components/analytics/payout-summary-card';
import type { PayoutSummary } from '@/lib/payout-summary';

interface Payout {
  id: string;
  /** Integer cents. */
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  period_start: string;
  period_end: string;
}

interface PayoutsPayload {
  summary: PayoutSummary;
  payouts: Payout[];
  account: { connected: boolean; payoutEnabled: boolean } | null;
}

const MIN_PAYOUT_CENTS = 1000;

function money(cents: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(cents / 100);
}

function statusVariant(status: string): 'success' | 'info' | 'error' | 'warning' {
  if (['paid', 'reconciled', 'completed'].includes(status)) return 'success';
  if (['exported', 'bank_submitted', 'processing'].includes(status)) return 'info';
  if (status === 'failed') return 'error';
  return 'warning';
}

export default function PayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PayoutsPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payouts');
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? 'Could not load payouts');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load payouts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSetupAccount = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/payouts/setup', { method: 'POST' });
      const json = await res.json().catch(() => null);
      if (json?.url) {
        window.location.href = json.url;
        return;
      }
      throw new Error(json?.error ?? 'Could not start payout setup');
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Could not start payout setup' });
      setBusy(false);
    }
  };

  const handleRequestPayout = async (amountCents: number) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountCents / 100 }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? 'Failed to request payout');
      setNotice({ tone: 'success', text: 'Payout requested. Funds usually arrive within 2–3 business days.' });
      await load();
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof Error ? err.message : 'Failed to request payout' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text">Payouts</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 w-24 rounded bg-surfaceMuted" />
              <div className="mt-2 h-8 w-20 rounded bg-surfaceMuted" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text">Payouts</h1>
        <Card>
          <p className="py-6 text-center text-sm text-danger">{error ?? 'Could not load payouts'}</p>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={load}>
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { summary, payouts, account } = data;
  const currency = summary.currency;
  const canRequest =
    account?.payoutEnabled === true &&
    !summary.processing &&
    summary.expectedPayoutCents >= MIN_PAYOUT_CENTS;
  const totalPaidCents = payouts
    .filter((p) => ['paid', 'reconciled', 'completed'].includes(p.status))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Payouts</h1>
        <p className="mt-1 text-textMuted">Your earnings, payout schedule and bank connection</p>
      </div>

      {notice && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            notice.tone === 'success'
              ? 'border-success/30 bg-successSoft text-success'
              : 'border-danger/30 bg-dangerSoft text-danger'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Bank connection */}
      {!account?.connected ? (
        <Card className="border-primary/20 bg-primarySoft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-primary">Connect your bank account</h3>
              <p className="text-sm text-primary">You need a connected account to receive payouts.</p>
            </div>
            <Button onClick={handleSetupAccount} disabled={busy}>
              Set up payouts
            </Button>
          </div>
        </Card>
      ) : !account.payoutEnabled ? (
        <Card className="border-warning/30 bg-warningSoft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-warning">Verification in progress</h3>
              <p className="text-sm text-warning">
                Your account is linked with Stripe. Payouts start once Stripe finishes verifying it.
              </p>
            </div>
            <Button variant="outline" onClick={handleSetupAccount} disabled={busy}>
              Review Stripe details
            </Button>
          </div>
        </Card>
      ) : null}

      <PayoutSummaryCard summary={summary} onPayoutsPage />

      {/* Request payout early */}
      {canRequest && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-text">Want it sooner?</h3>
              <p className="text-sm text-textMuted">
                Request your {money(summary.expectedPayoutCents, currency)} balance now instead of waiting for Monday.
              </p>
            </div>
            <Button onClick={() => handleRequestPayout(summary.expectedPayoutCents)} disabled={busy}>
              {busy ? 'Requesting…' : 'Request payout'}
            </Button>
          </div>
        </Card>
      )}

      {/* Payout History */}
      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-text">Payout history</h3>
          <span className="text-sm text-textMuted">Total paid: {money(totalPaidCents, currency)}</span>
        </div>
        {payouts.length === 0 ? (
          <p className="mt-4 text-sm text-textMuted">No payouts yet</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px]">
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
                    <td className="py-3 text-text">{new Date(payout.paid_at ?? payout.created_at).toLocaleDateString()}</td>
                    <td className="py-3 text-textMuted">
                      {new Date(payout.period_start).toLocaleDateString()} – {new Date(payout.period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-medium text-text">{money(Number(payout.amount) || 0, currency)}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant(payout.status)}>{payout.status.replace(/_/g, ' ')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* How payouts work */}
      <Card className="bg-surfaceMuted">
        <h3 className="font-semibold text-text">How payouts work</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-textMuted">
          <li>
            You keep your food sales minus the Ridendine service fee ({summary.breakdown.platformFeePercent}%).
          </li>
          <li>Sales tax, delivery fees and customer service fees are collected separately and are not deducted from you.</li>
          <li>Tips go to the delivery driver.</li>
          <li>Payouts run weekly on Mondays. Minimum early-payout request is {money(MIN_PAYOUT_CENTS, currency)}.</li>
        </ul>
      </Card>
    </div>
  );
}
