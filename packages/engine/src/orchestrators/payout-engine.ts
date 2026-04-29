// ==========================================
// PAYOUT ENGINE
// Chef and driver payout lifecycle management
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActorContext, DomainEventType } from '@ridendine/types';
import type { AuditLogger } from '../core/audit-logger';
import type { DomainEventEmitter } from '../core/event-emitter';
import { PLATFORM_FEE_PERCENT, DRIVER_PAYOUT_PERCENT } from '../constants';

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
    const platformFee = Math.round(order.subtotal * PLATFORM_FEE_PERCENT / 100);
    return {
      subtotal: order.subtotal,
      platformFee,
      chefGross: order.subtotal - platformFee,
    };
  }

  // -------------------------------------------------------------------------
  // calculateDriverEarnings
  // -------------------------------------------------------------------------

  async calculateDriverEarnings(input: { orderId: string }): Promise<DriverEarningsBreakdown> {
    const order = await this.loadOrder(input.orderId);
    const driverPayout = Math.round(order.delivery_fee * DRIVER_PAYOUT_PERCENT / 100);
    return {
      deliveryFee: order.delivery_fee,
      driverPayout,
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

    // Insert ledger entry
    const entryType = payeeType === 'chef' ? 'chef_payable' : 'driver_payable';
    const { data: entry, error: insertError } = await this.client
      .from('ledger_entries')
      .insert({
        order_id: orderId,
        entry_type: entryType,
        currency: 'CAD',
        entity_type: payeeType,
        entity_id: payeeId,
        description: `${payeeType === 'chef' ? 'Chef' : 'Driver'} payout eligible`,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    const entryId = (entry as Record<string, unknown> | null)?.id as string ?? orderId;
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
    const { payoutId, actorId } = input;
    const actor = makeActor(actorId);

    await this.client
      .from('chef_payouts')
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
