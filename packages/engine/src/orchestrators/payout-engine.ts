// ==========================================
// PAYOUT ENGINE
// Chef and driver payout lifecycle management
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, DomainEventType } from '@ridendine/types';
import type { AuditLogger } from '../core/audit-logger';
import type { DomainEventEmitter } from '../core/event-emitter';
import { toCents, platformFeeCents, driverPayoutCents } from '../services/order-split';
import { LedgerService } from '../services/ledger.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChefPayoutBreakdown {
  subtotal: number;
  platformFee: number;
  chefGross: number;
}

interface DriverEarningsBreakdown {
  deliveryFee: number;
  driverPayout: number;
  tip: number;
}

interface MarkEligibleInput {
  orderId: string;
  payeeType: 'chef' | 'driver';
  payeeId: string;
  actorId: string;
}

interface MarkProcessingInput {
  payoutId: string;
  payeeType: 'chef' | 'driver';
  actorId: string;
}

interface MarkPaidInput {
  payoutId: string;
  payeeType: 'chef' | 'driver';
  stripeTransferId: string;
  actorId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface OrderRow {
  id: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  tip: number;
  total: number;
  engine_status: string;
  payment_status: string;
}

function makeActor(actorId: string): ActorContext {
  return { userId: actorId, role: 'system' };
}

function payoutTable(payeeType: 'chef' | 'driver'): string {
  return payeeType === 'chef' ? 'chef_payouts' : 'driver_payouts';
}

// Split arithmetic lives in ../services/order-split so payout-engine and
// commerce.engine cannot drift apart. See that file for why.

// ---------------------------------------------------------------------------
// PayoutEngine class
// ---------------------------------------------------------------------------

export class PayoutEngine {
  constructor(
    private client: SupabaseClient,
    private audit: AuditLogger,
    private events: DomainEventEmitter
  ) {}

  // -------------------------------------------------------------------------
  // calculateChefPayout
  // -------------------------------------------------------------------------

  async calculateChefPayout(input: { orderId: string }): Promise<ChefPayoutBreakdown> {
    const order = await this.loadOrder(input.orderId);
    // Percentage math in integer cents (orders store dollar floats); results
    // are returned in dollars with cent precision — NOT rounded to whole dollars.
    const subtotalCents = toCents(order.subtotal);
    const feeCents = platformFeeCents(subtotalCents);
    return {
      subtotal: order.subtotal,
      platformFee: feeCents / 100,
      chefGross: (subtotalCents - feeCents) / 100,
    };
  }

  // -------------------------------------------------------------------------
  // calculateDriverEarnings
  // -------------------------------------------------------------------------

  async calculateDriverEarnings(input: { orderId: string }): Promise<DriverEarningsBreakdown> {
    const order = await this.loadOrder(input.orderId);
    return {
      deliveryFee: order.delivery_fee,
      driverPayout: driverPayoutCents(toCents(order.delivery_fee)) / 100,
      tip: order.tip ?? 0,
    };
  }

  // -------------------------------------------------------------------------
  // markPayoutEligible
  // -------------------------------------------------------------------------

  async markPayoutEligible(input: MarkEligibleInput): Promise<{ success: boolean; error?: string }> {
    const { orderId, payeeType, payeeId, actorId } = input;

    // Load and validate order
    const order = await this.loadOrder(orderId);

    if (order.engine_status !== 'completed') {
      return { success: false, error: 'Order is not completed' };
    }

    if (order.payment_status !== 'completed') {
      return { success: false, error: 'Payment not completed for this order' };
    }

    // Check for open exceptions
    const { data: exceptions } = await this.client
      .from('order_exceptions')
      .select('id')
      .eq('order_id', orderId)
      .in('status', ['open', 'acknowledged', 'in_progress', 'escalated']);

    if (exceptions && exceptions.length > 0) {
      return { success: false, error: 'Order has open exceptions blocking payout' };
    }

    // Insert ledger entry — amount in cents (ledger convention; orders store dollars)
    const entryType = payeeType === 'chef' ? 'chef_payable' : 'driver_payable';
    const amountCents =
      payeeType === 'chef'
        ? toCents(order.subtotal) - platformFeeCents(toCents(order.subtotal))
        : driverPayoutCents(toCents(order.delivery_fee));

    const ledger = await new LedgerService(this.client).recordPayoutEligible({
      orderId,
      payeeType,
      payeeId,
      amountCents,
      currency: 'CAD',
    });

    if (ledger.error) {
      return { success: false, error: ledger.error };
    }

    const entryId = ledger.id || orderId;
    const actor = makeActor(actorId);

    // Audit
    await this.audit.log({
      action: 'payout',
      entityType: 'ledger_entry',
      entityId: entryId,
      actor,
      afterState: { orderId, payeeType, payeeId, entryType },
    });

    // Emit event
    this.events.emit(
      'payout.scheduled' as DomainEventType,
      'ledger_entry',
      entryId,
      { orderId, payeeType, payeeId, entryType },
      actor
    );

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // markPayoutProcessing
  // -------------------------------------------------------------------------

  async markPayoutProcessing(input: MarkProcessingInput): Promise<{ success: boolean }> {
    const { payoutId, payeeType, actorId } = input;
    const actor = makeActor(actorId);

    await this.client
      .from(payoutTable(payeeType))
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', payoutId);

    await this.audit.log({
      action: 'status_change',
      entityType: 'payout',
      entityId: payoutId,
      actor,
      afterState: { status: 'processing' },
    });

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // markPayoutPaid
  // -------------------------------------------------------------------------

  async markPayoutPaid(input: MarkPaidInput): Promise<{ success: boolean }> {
    const { payoutId, payeeType, stripeTransferId, actorId } = input;
    const actor = makeActor(actorId);
    const table = payoutTable(payeeType);
    const now = new Date().toISOString();

    await this.client
      .from(table)
      .update({ status: 'completed', stripe_transfer_id: stripeTransferId, paid_at: now, updated_at: now })
      .eq('id', payoutId);

    await this.audit.log({
      action: 'payout',
      entityType: table,
      entityId: payoutId,
      actor,
      afterState: { status: 'completed', stripeTransferId },
    });

    this.events.emit(
      'payout.processed' as DomainEventType,
      table,
      payoutId,
      { payeeType, stripeTransferId },
      actor
    );

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async loadOrder(orderId: string): Promise<OrderRow> {
    const { data, error } = await this.client
      .from('orders')
      .select('id, subtotal, delivery_fee, service_fee, tax, tip, total, engine_status, payment_status')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      throw new Error('Order not found');
    }

    return data as OrderRow;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPayoutEngine(
  client: SupabaseClient,
  audit: AuditLogger,
  events: DomainEventEmitter
): PayoutEngine {
  return new PayoutEngine(client, audit, events);
}
