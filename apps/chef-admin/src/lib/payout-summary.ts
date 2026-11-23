// ==========================================
// CHEF PAYOUT SUMMARY — pure builder for the Analytics "Payout Summary" card.
//
// Sources, in order of authority:
//  1. Expected payout = the storefront's `chef_payable` platform account
//     balance. That ledger balance is exactly what PayoutService.previewChefRun
//     pays out in the next weekly run.
//  2. Breakdown = the fulfilled orders since the last payout period, split with
//     the engine's own order-split math (platform commission on the subtotal).
//     Any gap between (1) and the breakdown — refunds, adjustments, manual
//     corrections — is shown as its own "Adjustments" line rather than hidden.
// Orders that are fulfilled but have no chef_payable ledger line yet (e.g. still
// settling, or simulated/test orders that never went through payment) are NOT
// mixed into the breakdown — they are reported as "not yet recorded" so the
// breakdown always reconciles to the ledger balance.
// Tax, service fee, delivery fee and tip are collected from the customer but
// are not part of the chef's payable, so they are reported separately.
// ==========================================

import { PLATFORM_FEE_PERCENT, chefPayableCents, platformFeeCents, toCents } from '@ridendine/engine';
import type { ChefPayoutHistoryRow, OrderMoneyRow } from '@ridendine/db';

export const PAYOUT_IN_FLIGHT_STATUSES = ['scheduled', 'approved', 'processing', 'exported', 'bank_submitted'];
export const PAYOUT_PAID_STATUSES = ['paid', 'reconciled', 'completed'];

export type PayoutStatus = 'paid' | 'pending' | 'processing' | 'none';

export interface PayoutSummary {
  status: PayoutStatus;
  currency: string;
  /** What the next weekly run is expected to pay, in cents. */
  expectedPayoutCents: number;
  /** 'ledger' when read from the chef_payable account, else an order-based estimate. */
  expectedSource: 'ledger' | 'estimate';
  payoutAccountReady: boolean;
  processing: { amountCents: number; status: string; createdAt: string } | null;
  lastPaid: { amountCents: number; paidAt: string } | null;
  breakdown: {
    /** Orders created after this instant are counted (null = all time). */
    since: string | null;
    orderCount: number;
    foodSalesCents: number;
    platformFeePercent: number;
    platformFeeCents: number;
    chefEarningsCents: number;
    /** expectedPayoutCents − chefEarningsCents (refunds/adjustments). 0 for estimates. */
    adjustmentsCents: number;
    /** Fulfilled orders with no chef_payable ledger line yet (ledger mode only). */
    unrecorded: { orderCount: number; estimatedEarningsCents: number };
    collectedNotPaidOut: {
      taxCents: number;
      serviceFeeCents: number;
      deliveryFeeCents: number;
      tipCents: number;
    };
  };
}

/**
 * The cut-off for "unpaid" orders: the latest period_end of any payout that
 * has not failed. Orders after it have not yet been included in a payout.
 */
export function payoutBreakdownSince(payouts: ChefPayoutHistoryRow[]): string | null {
  let latest: string | null = null;
  for (const p of payouts) {
    if (p.status === 'failed') continue;
    if (!latest || new Date(p.period_end) > new Date(latest)) latest = p.period_end;
  }
  return latest;
}

export function buildPayoutSummary(input: {
  payouts: ChefPayoutHistoryRow[];
  unpaidOrders: OrderMoneyRow[];
  ledgerBalanceCents: number | null;
  /** Order ids that have a chef_payable ledger line. Ignored in estimate mode. */
  ledgeredOrderIds?: ReadonlySet<string>;
  currency?: string | null;
  payoutAccountReady: boolean;
}): PayoutSummary {
  const { payouts, ledgerBalanceCents, payoutAccountReady } = input;
  const hasLedger = ledgerBalanceCents !== null;

  // In ledger mode only ledger-recorded orders belong in the breakdown.
  const ledgered = input.ledgeredOrderIds ?? new Set<string>();
  const unpaidOrders = hasLedger ? input.unpaidOrders.filter((o) => ledgered.has(o.id)) : input.unpaidOrders;
  const unrecordedOrders = hasLedger ? input.unpaidOrders.filter((o) => !ledgered.has(o.id)) : [];

  let foodSalesCents = 0;
  let feeCents = 0;
  let earningsCents = 0;
  let taxCents = 0;
  let serviceFeeCents = 0;
  let deliveryFeeCents = 0;
  let tipCents = 0;

  for (const o of unpaidOrders) {
    const subtotal = toCents(o.subtotal);
    foodSalesCents += subtotal;
    feeCents += platformFeeCents(subtotal);
    earningsCents += chefPayableCents(subtotal);
    taxCents += toCents(o.tax);
    serviceFeeCents += toCents(o.service_fee);
    deliveryFeeCents += toCents(o.delivery_fee);
    tipCents += toCents(o.tip);
  }

  const expectedPayoutCents = Math.max(0, hasLedger ? ledgerBalanceCents : earningsCents);

  const inFlight = payouts.find((p) => PAYOUT_IN_FLIGHT_STATUSES.includes(p.status)) ?? null;
  const lastPaidRow = payouts.find((p) => PAYOUT_PAID_STATUSES.includes(p.status)) ?? null;

  let status: PayoutStatus;
  if (inFlight) status = 'processing';
  else if (expectedPayoutCents > 0) status = 'pending';
  else if (lastPaidRow) status = 'paid';
  else status = 'none';

  return {
    status,
    currency: (input.currency || 'CAD').toUpperCase(),
    expectedPayoutCents,
    expectedSource: hasLedger ? 'ledger' : 'estimate',
    payoutAccountReady,
    processing: inFlight
      ? { amountCents: Number(inFlight.amount) || 0, status: inFlight.status, createdAt: inFlight.created_at }
      : null,
    lastPaid: lastPaidRow
      ? {
          amountCents: Number(lastPaidRow.amount) || 0,
          paidAt: lastPaidRow.paid_at ?? lastPaidRow.created_at,
        }
      : null,
    breakdown: {
      since: payoutBreakdownSince(payouts),
      orderCount: unpaidOrders.length,
      foodSalesCents,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      platformFeeCents: feeCents,
      chefEarningsCents: earningsCents,
      adjustmentsCents: hasLedger ? expectedPayoutCents - earningsCents : 0,
      unrecorded: {
        orderCount: unrecordedOrders.length,
        estimatedEarningsCents: unrecordedOrders.reduce((sum, o) => sum + chefPayableCents(toCents(o.subtotal)), 0),
      },
      collectedNotPaidOut: { taxCents, serviceFeeCents, deliveryFeeCents, tipCents },
    },
  };
}
