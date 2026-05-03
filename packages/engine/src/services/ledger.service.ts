// ==========================================
// LEDGER SERVICE — idempotent ledger_entries (Phase 5)
// All marketplace money movements MUST use this layer for payables / payouts.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { DRIVER_PAYOUT_PERCENT, PLATFORM_FEE_PERCENT } from '../constants';

export type LedgerInsertRow = {
  /** Null for aggregate payout debits (Phase 5 migration). */
  order_id: string | null;
  entry_type: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  stripe_id?: string | null;
  metadata?: Record<string, unknown> | null;
  idempotency_key: string;
};

/** `${entry_type}:${source_id}` — unique partial index on ledger_entries. */
export function makeLedgerIdempotencyKey(entryType: string, sourceId: string): string {
  return `${entryType}:${sourceId}`;
}

export class LedgerService {
  constructor(private readonly client: SupabaseClient) {}

  private async insertIdempotent(
    row: LedgerInsertRow
  ): Promise<{ id: string; inserted: boolean; error?: string }> {
    const { data: existing, error: selErr } = await this.client
      .from('ledger_entries')
      .select('id')
      .eq('idempotency_key', row.idempotency_key)
      .maybeSingle();

    if (selErr) {
      return { id: '', inserted: false, error: selErr.message };
    }
    if (existing?.id) {
      return { id: existing.id as string, inserted: false };
    }

    const { data, error } = await this.client
      .from('ledger_entries')
      .insert({
        order_id: row.order_id,
        entry_type: row.entry_type,
        amount_cents: row.amount_cents,
        currency: row.currency,
        description: row.description,
        entity_type: row.entity_type ?? null,
        entity_id: row.entity_id ?? null,
        stripe_id: row.stripe_id ?? null,
        metadata: (row.metadata ?? null) as never,
        idempotency_key: row.idempotency_key,
      } as never)
      .select('id')
      .single();

    if (error || !data) {
      return { id: '', inserted: false, error: error?.message ?? 'insert failed' };
    }
    return { id: data.id as string, inserted: true };
  }

  /**
   * Customer capture + tax (order completion). Separate from payables split.
   */
  async recordCustomerCapture(input: {
    orderId: string;
    orderNumber: string;
    totalCents: number;
    taxCents: number;
    currency: string;
    stripePaymentIntentId?: string | null;
  }): Promise<{ capture: { id: string; inserted: boolean }; tax: { id: string; inserted: boolean }; errors: string[] }> {
    const errors: string[] = [];
    const cap = await this.insertIdempotent({
      order_id: input.orderId,
      entry_type: 'customer_charge_capture',
      amount_cents: input.totalCents,
      currency: input.currency,
      description: `Payment captured for order ${input.orderNumber}`,
      stripe_id: input.stripePaymentIntentId ?? null,
      idempotency_key: makeLedgerIdempotencyKey('customer_charge_capture', input.orderId),
    });
    if (cap.error) errors.push(cap.error);

    const tax = await this.insertIdempotent({
      order_id: input.orderId,
      entry_type: 'tax_collected',
      amount_cents: input.taxCents,
      currency: input.currency,
      description: 'Tax collected',
      idempotency_key: makeLedgerIdempotencyKey('tax_collected', input.orderId),
    });
    if (tax.error) errors.push(tax.error);

    return { capture: { id: cap.id, inserted: cap.inserted }, tax: { id: tax.id, inserted: tax.inserted }, errors };
  }

  /**
   * Credits: chef_payable, driver_payable, platform_fee (maps to platform_revenue via DB trigger).
   */
  async recordOrderPayment(input: {
    orderId: string;
    storefrontId: string;
    driverId: string | null;
    subtotalCents: number;
    deliveryFeeCents: number;
    currency: string;
  }): Promise<{
    chef: { id: string; inserted: boolean };
    driver: { id: string; inserted: boolean };
    platform: { id: string; inserted: boolean };
    errors: string[];
  }> {
    const platformFeeCents = Math.round((input.subtotalCents * PLATFORM_FEE_PERCENT) / 100);
    const chefPayableCents = input.subtotalCents - platformFeeCents;
    const driverPayableCents = Math.round((input.deliveryFeeCents * DRIVER_PAYOUT_PERCENT) / 100);

    const errors: string[] = [];
    const chef = await this.insertIdempotent({
      order_id: input.orderId,
      entry_type: 'chef_payable',
      amount_cents: chefPayableCents,
      currency: input.currency,
      description: 'Chef earnings',
      entity_type: 'storefront',
      entity_id: input.storefrontId,
      idempotency_key: makeLedgerIdempotencyKey('chef_payable', input.orderId),
    });
    if (chef.error) errors.push(chef.error);

    const platform = await this.insertIdempotent({
      order_id: input.orderId,
      entry_type: 'platform_fee',
      amount_cents: platformFeeCents,
      currency: input.currency,
      description: 'Platform commission',
      idempotency_key: makeLedgerIdempotencyKey('platform_fee', input.orderId),
    });
    if (platform.error) errors.push(platform.error);

    const driverMeta = input.driverId ? { driver_id: input.driverId } : null;

    const driver = await this.insertIdempotent({
      order_id: input.orderId,
      entry_type: 'driver_payable',
      amount_cents: driverPayableCents,
      currency: input.currency,
      description: 'Driver delivery fee',
      entity_type: input.driverId ? 'driver' : null,
      entity_id: input.driverId,
      metadata: driverMeta,
      idempotency_key: makeLedgerIdempotencyKey('driver_payable', input.orderId),
    });
    if (driver.error) errors.push(driver.error);

    return {
      chef: { id: chef.id, inserted: chef.inserted },
      driver: { id: driver.id, inserted: driver.inserted },
      platform: { id: platform.id, inserted: platform.inserted },
      errors,
    };
  }

  async recordTipPayable(input: {
    orderId: string;
    driverId: string | null;
    tipCents: number;
    currency: string;
  }): Promise<{ id: string; inserted: boolean; error?: string }> {
    if (input.tipCents <= 0) return { id: '', inserted: false };
    return this.insertIdempotent({
      order_id: input.orderId,
      entry_type: 'tip_payable',
      amount_cents: input.tipCents,
      currency: input.currency,
      description: 'Driver tip',
      entity_type: input.driverId ? 'driver' : null,
      entity_id: input.driverId,
      metadata: input.driverId ? { driver_id: input.driverId } : null,
      idempotency_key: makeLedgerIdempotencyKey('tip_payable', input.orderId),
    });
  }

  /**
   * Reverses chef / driver / platform fee credits for a refund (negative mirror amounts).
   */
  async recordRefund(input: {
    orderId: string;
    storefrontId: string;
    driverId: string | null;
    subtotalCents: number;
    deliveryFeeCents: number;
    currency: string;
    /** Dedup key segment, e.g. refund case id or stripe refund id */
    refundSourceId: string;
  }): Promise<{ errors: string[] }> {
    const platformFeeCents = Math.round((input.subtotalCents * PLATFORM_FEE_PERCENT) / 100);
    const chefPayableCents = input.subtotalCents - platformFeeCents;
    const driverPayableCents = Math.round((input.deliveryFeeCents * DRIVER_PAYOUT_PERCENT) / 100);
    const errors: string[] = [];

    const base = `refund:${input.refundSourceId}`;
    for (const row of [
      {
        order_id: input.orderId,
        entry_type: 'chef_payable',
        amount_cents: -chefPayableCents,
        currency: input.currency,
        description: 'Refund reversal — chef payable',
        entity_type: 'storefront',
        entity_id: input.storefrontId,
        idempotency_key: `${base}:chef_payable:${input.orderId}`,
      },
      {
        order_id: input.orderId,
        entry_type: 'platform_fee',
        amount_cents: -platformFeeCents,
        currency: input.currency,
        description: 'Refund reversal — platform fee',
        idempotency_key: `${base}:platform_fee:${input.orderId}`,
      },
      {
        order_id: input.orderId,
        entry_type: 'driver_payable',
        amount_cents: -driverPayableCents,
        currency: input.currency,
        description: 'Refund reversal — driver delivery fee',
        entity_type: input.driverId ? 'driver' : null,
        entity_id: input.driverId,
        metadata: input.driverId ? { driver_id: input.driverId } : null,
        idempotency_key: `${base}:driver_payable:${input.orderId}`,
      },
    ] as LedgerInsertRow[]) {
      const r = await this.insertIdempotent(row);
      if (r.error) errors.push(r.error);
    }
    return { errors };
  }

  /**
   * Payout settlement: negative payables (chef storefront / driver) — traceable to run + payee.
   */
  async recordPayout(input: {
    orderId: string | null;
    payee: 'chef' | 'driver';
    payeeEntityId: string;
    amountCents: number;
    currency: string;
    payoutRunId: string;
    description: string;
    /** Stripe transfer / payout / PI id for reconciliation */
    stripeId?: string | null;
  }): Promise<{ id: string; inserted: boolean; error?: string }> {
    const entryType = input.payee === 'chef' ? 'chef_payable' : 'driver_payable';
    const idempotencyKey = makeLedgerIdempotencyKey(
      `${entryType}_payout_debit`,
      `${input.payoutRunId}:${input.payeeEntityId}`
    );
    const baseMeta =
      input.payee === 'driver'
        ? { driver_id: input.payeeEntityId, payout_run_id: input.payoutRunId }
        : { payout_run_id: input.payoutRunId };
    const meta =
      input.stripeId != null && input.stripeId !== ''
        ? { ...baseMeta, stripe_settlement_id: input.stripeId }
        : baseMeta;

    return this.insertIdempotent({
      order_id: input.orderId,
      entry_type: entryType,
      amount_cents: -Math.abs(input.amountCents),
      currency: input.currency,
      description: input.description,
      entity_type: input.payee === 'chef' ? 'storefront' : 'driver',
      entity_id: input.payeeEntityId,
      stripe_id: input.stripeId ?? null,
      metadata: meta,
      idempotency_key: idempotencyKey,
    });
  }

  /** Instant payout fee: negative driver_payable (uses existing trigger). */
  async recordInstantPayoutFee(input: {
    orderId: string | null;
    driverId: string;
    feeCents: number;
    currency: string;
    requestId: string;
  }): Promise<{ id: string; inserted: boolean; error?: string }> {
    return this.insertIdempotent({
      order_id: input.orderId,
      entry_type: 'driver_payable',
      amount_cents: -Math.abs(input.feeCents),
      currency: input.currency,
      description: 'Instant payout fee (1.5%)',
      entity_type: 'driver',
      entity_id: input.driverId,
      metadata: { driver_id: input.driverId, instant_payout_request_id: input.requestId },
      idempotency_key: makeLedgerIdempotencyKey('instant_payout_fee', input.requestId),
    });
  }

  async reverseInstantPayoutFee(input: {
    orderId: string | null;
    driverId: string;
    feeCents: number;
    currency: string;
    requestId: string;
  }): Promise<{ id: string; inserted: boolean; error?: string }> {
    return this.insertIdempotent({
      order_id: input.orderId,
      entry_type: 'driver_payable',
      amount_cents: Math.abs(input.feeCents),
      currency: input.currency,
      description: 'Instant payout fee reversal',
      entity_type: 'driver',
      entity_id: input.driverId,
      metadata: { driver_id: input.driverId, instant_payout_request_id: input.requestId },
      idempotency_key: makeLedgerIdempotencyKey('instant_payout_fee_reversal', input.requestId),
    });
  }
}

export function createLedgerService(client: SupabaseClient): LedgerService {
  return new LedgerService(client);
}
