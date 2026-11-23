'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { formatTimeRemaining, nextPayoutDate } from '@/lib/payout-schedule';
import type { PayoutStatus, PayoutSummary } from '@/lib/payout-summary';

const STATUS_BADGE: Record<
  PayoutStatus,
  { label: string; variant: 'success' | 'warning' | 'info' | 'default' }
> = {
  paid: { label: 'Paid', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  processing: { label: 'Processing', variant: 'info' },
  none: { label: 'No earnings yet', variant: 'default' },
};

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(cents / 100);
}

function Row({
  label,
  cents,
  currency,
  tone = 'text-text',
  bold = false,
  hint,
}: {
  label: string;
  cents: number;
  currency: string;
  tone?: string;
  bold?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1.5 text-sm ${bold ? 'font-semibold' : ''}`}
    >
      <span className="text-textMuted">
        {label}
        {hint && <span className="block text-xs text-textSubtle">{hint}</span>}
      </span>
      <span className={`tabular-nums ${tone}`}>{money(cents, currency)}</span>
    </div>
  );
}

export function PayoutSummaryCard({
  summary,
  onPayoutsPage = false,
}: {
  summary: PayoutSummary | null | undefined;
  /** Hide the bank warning and "go to Payouts" link when already on that page. */
  onPayoutsPage?: boolean;
}) {
  // Re-render every minute so the countdown stays live.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!summary) {
    return (
      <Card>
        <h3 className="font-semibold text-text">Payout Summary</h3>
        <p className="mt-2 text-sm text-textMuted">
          Payout details are unavailable right now. See{' '}
          <Link href="/dashboard/payouts" className="font-medium text-primary hover:underline">
            Payouts
          </Link>{' '}
          for your history.
        </p>
      </Card>
    );
  }

  const { currency, breakdown: b } = summary;
  const next = nextPayoutDate(now);
  const badge = STATUS_BADGE[summary.status];
  const collected = b.collectedNotPaidOut;
  const collectedTotal =
    collected.taxCents +
    collected.serviceFeeCents +
    collected.deliveryFeeCents +
    collected.tipCents;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-text">Payout Summary</h3>
          <p className="text-sm text-textMuted">
            What you&apos;ll be paid next, and how it adds up
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {!summary.payoutAccountReady && !onPayoutsPage && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warningSoft px-3 py-2 text-sm text-warning">
          Connect your bank account to receive payouts.{' '}
          <Link href="/dashboard/payouts" className="font-semibold underline">
            Set up payouts
          </Link>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-surfaceMuted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-textMuted">
            Expected payout
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-success">
            {money(summary.expectedPayoutCents, currency)}
          </p>
          <p className="mt-1 text-xs text-textSubtle">
            {summary.expectedSource === 'ledger'
              ? 'Your current payable balance'
              : 'Estimated from fulfilled orders'}
          </p>
        </div>
        <div className="rounded-lg bg-surfaceMuted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-textMuted">Next payout</p>
          <p className="mt-1 text-lg font-semibold text-text">
            {next.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            <span className="ml-1 text-sm font-normal text-textMuted">
              {next.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
          </p>
          <p className="mt-1 text-xs text-textSubtle">
            in {formatTimeRemaining(next, now)} · weekly on Mondays
          </p>
        </div>
        <div className="rounded-lg bg-surfaceMuted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-textMuted">
            {summary.processing ? 'Being processed' : 'Last payout'}
          </p>
          {summary.processing ? (
            <>
              <p className="mt-1 text-lg font-semibold tabular-nums text-text">
                {money(summary.processing.amountCents, currency)}
              </p>
              <p className="mt-1 text-xs text-textSubtle">
                Requested {new Date(summary.processing.createdAt).toLocaleDateString()} ·{' '}
                {summary.processing.status.replace(/_/g, ' ')}
              </p>
            </>
          ) : summary.lastPaid ? (
            <>
              <p className="mt-1 text-lg font-semibold tabular-nums text-text">
                {money(summary.lastPaid.amountCents, currency)}
              </p>
              <p className="mt-1 text-xs text-textSubtle">
                Paid {new Date(summary.lastPaid.paidAt).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-textMuted">No payouts yet</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-text">
            Breakdown
            <span className="ml-2 font-normal text-textMuted">
              {b.orderCount} order{b.orderCount === 1 ? '' : 's'}
              {b.since ? ` since ${new Date(b.since).toLocaleDateString()}` : ''}
            </span>
          </p>
          <div className="mt-2 divide-y divide-divider">
            <Row label="Food sales" cents={b.foodSalesCents} currency={currency} />
            <Row
              label={`Ridendine service fee (${b.platformFeePercent}%)`}
              cents={-b.platformFeeCents}
              currency={currency}
              tone="text-danger"
            />
            {b.adjustmentsCents !== 0 && (
              <Row
                label="Refunds & adjustments"
                cents={b.adjustmentsCents}
                currency={currency}
                tone={b.adjustmentsCents < 0 ? 'text-danger' : 'text-success'}
              />
            )}
            <Row
              label="Your payout"
              cents={summary.expectedPayoutCents}
              currency={currency}
              tone="text-success"
              bold
            />
          </div>
          {b.unrecorded.orderCount > 0 && (
            <p className="mt-2 rounded-md bg-surfaceMuted px-3 py-2 text-xs text-textMuted">
              {b.unrecorded.orderCount} fulfilled order
              {b.unrecorded.orderCount === 1 ? ' is' : 's are'} not yet recorded for payout (about{' '}
              {money(b.unrecorded.estimatedEarningsCents, currency)}). Orders are added once payment
              settles; test or simulated orders are never paid out.
            </p>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-text">Collected from customers</p>
          <p className="text-xs text-textSubtle">
            Charged on the same orders but not part of your payout
          </p>
          <div className="mt-2 divide-y divide-divider">
            <Row label="Sales tax" cents={collected.taxCents} currency={currency} />
            <Row
              label="Customer service fee"
              cents={collected.serviceFeeCents}
              currency={currency}
            />
            <Row label="Delivery fee" cents={collected.deliveryFeeCents} currency={currency} />
            <Row
              label="Tips"
              cents={collected.tipCents}
              currency={currency}
              hint="Go to the delivery driver"
            />
            <Row label="Total collected" cents={collectedTotal} currency={currency} bold />
          </div>
        </div>
      </div>

      {!onPayoutsPage && (
        <p className="mt-4 text-xs text-textSubtle">
          Full history and bank details are on the{' '}
          <Link href="/dashboard/payouts" className="font-medium text-primary hover:underline">
            Payouts
          </Link>{' '}
          page.
        </p>
      )}
    </Card>
  );
}
