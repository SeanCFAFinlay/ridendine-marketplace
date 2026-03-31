// ==========================================
// COMMERCE LEDGER ENGINE
// Merchant-of-record financial logic
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActorContext,
  OperationResult,
  LedgerEntry,
  LedgerEntryType,
  RefundReason,
  DomainEventType,
} from '@ridendine/types';
import { DomainEventEmitter } from '../core/event-emitter';
import { AuditLogger } from '../core/audit-logger';
import {
  PLATFORM_FEE_PERCENT,
  SERVICE_FEE_PERCENT,
  DRIVER_PAYOUT_PERCENT,
  HST_RATE,
} from '../constants';

interface RefundCase {
  id: string;
  order_id: string;
  exception_id?: string;
  requested_by: string;
  requested_amount_cents: number;
  approved_amount_cents?: number;
  refund_reason: RefundReason;
  refund_notes?: string;
  status: 'pending' | 'approved' | 'denied' | 'processing' | 'completed' | 'failed';
  reviewed_by?: string;
  reviewed_at?: string;
  stripe_refund_id?: string;
  processed_at?: string;
  created_at: string;
}

interface PayoutAdjustment {
  id: string;
  payee_type: 'chef' | 'driver';
  payee_id: string;
  order_id?: string;
  refund_case_id?: string;
  adjustment_type: string;
  amount_cents: number;
  reason: string;
  status: 'pending' | 'applied' | 'reversed';
}

interface OrderFinancials {
  orderId: string;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  total: number;
  platformFee: number;
  chefPayable: number;
  driverPayable: number;
  tipPayable: number;
  ledgerEntries: LedgerEntry[];
}

export class CommerceLedgerEngine {
  private client: SupabaseClient;
  private eventEmitter: DomainEventEmitter;
  private auditLogger: AuditLogger;

  constructor(
    client: SupabaseClient,
    eventEmitter: DomainEventEmitter,
    auditLogger: AuditLogger
  ) {
    this.client = client;
    this.eventEmitter = eventEmitter;
    this.auditLogger = auditLogger;
  }

  /**
   * Record payment authorization
   */
  async recordPaymentAuth(
    orderId: string,
    amountCents: number,
    stripePaymentIntentId: string,
    actor: ActorContext
  ): Promise<OperationResult<LedgerEntry>> {
    const entry: Partial<LedgerEntry> = {
      orderId,
      type: 'customer_charge_auth' as LedgerEntryType,
      amountCents,
      currency: 'CAD',
      description: 'Payment authorization',
      stripeId: stripePaymentIntentId,
    };

    const { data, error } = await this.client
      .from('ledger_entries')
      .insert({
        order_id: entry.orderId,
        entry_type: entry.type,
        amount_cents: entry.amountCents,
        currency: entry.currency,
        description: entry.description,
        stripe_id: entry.stripeId,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message },
      };
    }

    return { success: true, data: this.mapLedgerEntry(data) };
  }

  /**
   * Record payment capture (after delivery)
   */
  async recordPaymentCapture(
    orderId: string,
    stripePaymentIntentId: string,
    actor: ActorContext
  ): Promise<OperationResult<LedgerEntry[]>> {
    // Get order details
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select('*, storefront:chef_storefronts(id, chef_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      };
    }

    // Get delivery for driver
    const { data: delivery } = await this.client
      .from('deliveries')
      .select('id, driver_id')
      .eq('order_id', orderId)
      .single();

    const entries: Partial<LedgerEntry>[] = [];

    // Customer charge capture
    entries.push({
      orderId,
      type: 'customer_charge_capture' as LedgerEntryType,
      amountCents: Math.round(order.total * 100),
      currency: 'CAD',
      description: 'Payment captured',
      stripeId: stripePaymentIntentId,
    });

    // Platform fee
    const platformFeeCents = Math.round(order.subtotal * (PLATFORM_FEE_PERCENT / 100) * 100);
    entries.push({
      orderId,
      type: 'platform_fee' as LedgerEntryType,
      amountCents: platformFeeCents,
      currency: 'CAD',
      description: `Platform commission (${PLATFORM_FEE_PERCENT}%)`,
    });

    // Service fee
    const serviceFeeCents = Math.round(order.service_fee * 100);
    entries.push({
      orderId,
      type: 'service_fee' as LedgerEntryType,
      amountCents: serviceFeeCents,
      currency: 'CAD',
      description: `Service fee (${SERVICE_FEE_PERCENT}%)`,
    });

    // Delivery fee
    const deliveryFeeCents = Math.round(order.delivery_fee * 100);
    entries.push({
      orderId,
      type: 'delivery_fee' as LedgerEntryType,
      amountCents: deliveryFeeCents,
      currency: 'CAD',
      description: 'Delivery fee',
    });

    // Chef payable
    const chefPayableCents = Math.round(order.subtotal * 100) - platformFeeCents;
    entries.push({
      orderId,
      type: 'chef_payable' as LedgerEntryType,
      amountCents: chefPayableCents,
      currency: 'CAD',
      description: 'Chef earnings',
      entityType: 'chef',
      entityId: order.storefront?.chef_id,
    });

    // Driver payable
    const driverPayableCents = Math.round(deliveryFeeCents * (DRIVER_PAYOUT_PERCENT / 100));
    if (delivery?.driver_id) {
      entries.push({
        orderId,
        type: 'driver_payable' as LedgerEntryType,
        amountCents: driverPayableCents,
        currency: 'CAD',
        description: 'Driver delivery fee',
        entityType: 'driver',
        entityId: delivery.driver_id,
      });
    }

    // Tip payable
    if (order.tip > 0) {
      const tipCents = Math.round(order.tip * 100);
      entries.push({
        orderId,
        type: 'tip_payable' as LedgerEntryType,
        amountCents: tipCents,
        currency: 'CAD',
        description: 'Driver tip',
        entityType: 'driver',
        entityId: delivery?.driver_id,
      });
    }

    // Tax collected
    const taxCents = Math.round(order.tax * 100);
    entries.push({
      orderId,
      type: 'tax_collected' as LedgerEntryType,
      amountCents: taxCents,
      currency: 'CAD',
      description: `HST collected (${HST_RATE}%)`,
    });

    // Insert all entries
    const { data: insertedEntries, error } = await this.client
      .from('ledger_entries')
      .insert(entries.map((e) => ({
        order_id: e.orderId,
        entry_type: e.type,
        amount_cents: e.amountCents,
        currency: e.currency,
        description: e.description,
        entity_type: e.entityType,
        entity_id: e.entityId,
        stripe_id: e.stripeId,
      })))
      .select();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message },
      };
    }

    return {
      success: true,
      data: insertedEntries.map(this.mapLedgerEntry),
    };
  }

  /**
   * Request a refund
   */
  async requestRefund(
    orderId: string,
    amountCents: number,
    reason: RefundReason,
    notes: string | undefined,
    actor: ActorContext
  ): Promise<OperationResult<RefundCase>> {
    // Get order
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      };
    }

    // Validate amount
    const maxRefundCents = Math.round(order.total * 100);
    if (amountCents > maxRefundCents) {
      return {
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Refund amount exceeds order total' },
      };
    }

    // Check for existing pending refunds
    const { data: existingRefunds } = await this.client
      .from('refund_cases')
      .select('approved_amount_cents')
      .eq('order_id', orderId)
      .in('status', ['pending', 'approved', 'processing', 'completed']);

    const totalRefunded = existingRefunds?.reduce(
      (sum, r) => sum + (r.approved_amount_cents || 0),
      0
    ) || 0;

    if (totalRefunded + amountCents > maxRefundCents) {
      return {
        success: false,
        error: {
          code: 'EXCEEDS_REMAINING',
          message: `Maximum remaining refundable amount is ${(maxRefundCents - totalRefunded) / 100}`,
        },
      };
    }

    // Create refund case
    const { data: refundCase, error } = await this.client
      .from('refund_cases')
      .insert({
        order_id: orderId,
        requested_by: actor.userId,
        requested_amount_cents: amountCents,
        refund_reason: reason,
        refund_notes: notes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message },
      };
    }

    // Update order
    await this.client
      .from('orders')
      .update({
        engine_status: 'refund_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Emit event
    this.eventEmitter.emit(
      'refund.requested' as DomainEventType,
      'refund_case',
      refundCase.id,
      { orderId, amountCents, reason },
      actor
    );

    await this.auditLogger.log({
      action: 'create',
      entityType: 'refund_case',
      entityId: refundCase.id,
      actor,
      afterState: { orderId, amountCents, reason, status: 'pending' },
    });

    await this.eventEmitter.flush();

    return { success: true, data: refundCase as RefundCase };
  }

  /**
   * Approve refund
   */
  async approveRefund(
    refundCaseId: string,
    approvedAmountCents: number,
    actor: ActorContext
  ): Promise<OperationResult<RefundCase>> {
    // Only ops/finance can approve
    if (!['ops_agent', 'ops_manager', 'finance_admin', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to approve refunds' },
      };
    }

    const now = new Date().toISOString();

    const { data: refundCase, error } = await this.client
      .from('refund_cases')
      .update({
        approved_amount_cents: approvedAmountCents,
        status: 'approved',
        reviewed_by: actor.userId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', refundCaseId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !refundCase) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to approve refund or already processed' },
      };
    }

    this.eventEmitter.emit(
      'refund.approved' as DomainEventType,
      'refund_case',
      refundCaseId,
      { orderId: refundCase.order_id, approvedAmountCents },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'refund_case',
      entityId: refundCaseId,
      actor,
      previousStatus: 'pending',
      newStatus: 'approved',
      metadata: { approvedAmountCents },
    });

    await this.eventEmitter.flush();

    return { success: true, data: refundCase as RefundCase };
  }

  /**
   * Process approved refund (execute Stripe refund)
   */
  async processRefund(
    refundCaseId: string,
    stripeRefundId: string,
    actor: ActorContext
  ): Promise<OperationResult<RefundCase>> {
    if (!['ops_manager', 'finance_admin', 'super_admin', 'system'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to process refunds' },
      };
    }

    // Get refund case
    const { data: refundCase, error: caseError } = await this.client
      .from('refund_cases')
      .select('*, orders(*)')
      .eq('id', refundCaseId)
      .single();

    if (caseError || !refundCase) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Refund case not found' },
      };
    }

    if (refundCase.status !== 'approved') {
      return {
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Refund must be approved before processing' },
      };
    }

    const now = new Date().toISOString();

    // Update refund case
    const { data: updated, error } = await this.client
      .from('refund_cases')
      .update({
        status: 'completed',
        stripe_refund_id: stripeRefundId,
        processed_at: now,
        updated_at: now,
      })
      .eq('id', refundCaseId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    // Create ledger entry
    const isFullRefund = refundCase.approved_amount_cents >= Math.round(refundCase.orders.total * 100);

    await this.client.from('ledger_entries').insert({
      order_id: refundCase.order_id,
      entry_type: isFullRefund ? 'customer_refund' : 'customer_partial_refund',
      amount_cents: -refundCase.approved_amount_cents, // Negative for refund
      currency: 'CAD',
      description: `Refund: ${refundCase.refund_reason}`,
      stripe_id: stripeRefundId,
    });

    // Update order payment status
    await this.client
      .from('orders')
      .update({
        payment_status: isFullRefund ? 'refunded' : 'completed',
        engine_status: isFullRefund ? 'refunded' : 'partially_refunded',
        updated_at: now,
      })
      .eq('id', refundCase.order_id);

    // Create payout adjustments for chef and driver
    await this.createRefundAdjustments(refundCase, actor);

    // Emit event
    this.eventEmitter.emit(
      'refund.processed' as DomainEventType,
      'refund_case',
      refundCaseId,
      { orderId: refundCase.order_id, amountCents: refundCase.approved_amount_cents, stripeRefundId },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'refund_case',
      entityId: refundCaseId,
      actor,
      previousStatus: 'approved',
      newStatus: 'completed',
      metadata: { stripeRefundId },
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as RefundCase };
  }

  /**
   * Deny refund
   */
  async denyRefund(
    refundCaseId: string,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult<RefundCase>> {
    if (!['ops_agent', 'ops_manager', 'finance_admin', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to deny refunds' },
      };
    }

    const now = new Date().toISOString();

    const { data: refundCase, error } = await this.client
      .from('refund_cases')
      .update({
        status: 'denied',
        refund_notes: reason,
        reviewed_by: actor.userId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', refundCaseId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !refundCase) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to deny refund' },
      };
    }

    // Restore order status
    await this.client
      .from('orders')
      .update({
        engine_status: 'completed',
        updated_at: now,
      })
      .eq('id', refundCase.order_id);

    await this.auditLogger.logStatusChange({
      entityType: 'refund_case',
      entityId: refundCaseId,
      actor,
      previousStatus: 'pending',
      newStatus: 'denied',
      reason,
    });

    return { success: true, data: refundCase as RefundCase };
  }

  /**
   * Create payout hold
   */
  async createPayoutHold(
    payeeType: 'chef' | 'driver',
    payeeId: string,
    orderId: string,
    amountCents: number,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult<PayoutAdjustment>> {
    if (!['ops_manager', 'finance_admin', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to create payout holds' },
      };
    }

    const { data: adjustment, error } = await this.client
      .from('payout_adjustments')
      .insert({
        payee_type: payeeType,
        payee_id: payeeId,
        order_id: orderId,
        adjustment_type: 'hold',
        amount_cents: amountCents,
        reason,
        status: 'pending',
        created_by: actor.userId,
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message },
      };
    }

    // Create ledger entry
    await this.client.from('ledger_entries').insert({
      order_id: orderId,
      entry_type: 'payout_hold',
      amount_cents: amountCents,
      currency: 'CAD',
      description: `Payout hold for ${payeeType}: ${reason}`,
      entity_type: payeeType,
      entity_id: payeeId,
    });

    this.eventEmitter.emit(
      'payout.held' as DomainEventType,
      'payout_adjustment',
      adjustment.id,
      { payeeType, payeeId, amountCents, reason },
      actor
    );

    await this.auditLogger.log({
      action: 'create',
      entityType: 'payout_adjustment',
      entityId: adjustment.id,
      actor,
      afterState: { type: 'hold', payeeType, payeeId, amountCents, reason },
    });

    await this.eventEmitter.flush();

    return { success: true, data: adjustment as PayoutAdjustment };
  }

  /**
   * Release payout hold
   */
  async releasePayoutHold(
    adjustmentId: string,
    actor: ActorContext
  ): Promise<OperationResult<PayoutAdjustment>> {
    if (!['ops_manager', 'finance_admin', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to release holds' },
      };
    }

    const { data: adjustment, error } = await this.client
      .from('payout_adjustments')
      .update({
        status: 'reversed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', adjustmentId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error || !adjustment) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to release hold' },
      };
    }

    // Create ledger entry for release
    await this.client.from('ledger_entries').insert({
      order_id: adjustment.order_id,
      entry_type: 'payout_release',
      amount_cents: -adjustment.amount_cents, // Negative to reverse hold
      currency: 'CAD',
      description: `Payout hold released for ${adjustment.payee_type}`,
      entity_type: adjustment.payee_type,
      entity_id: adjustment.payee_id,
    });

    await this.auditLogger.logStatusChange({
      entityType: 'payout_adjustment',
      entityId: adjustmentId,
      actor,
      previousStatus: 'pending',
      newStatus: 'reversed',
    });

    return { success: true, data: adjustment as PayoutAdjustment };
  }

  /**
   * Get order financials summary
   */
  async getOrderFinancials(orderId: string): Promise<OperationResult<OrderFinancials>> {
    const { data: order, error: orderError } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      };
    }

    const { data: ledgerEntries } = await this.client
      .from('ledger_entries')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    const platformFee = ledgerEntries?.find((e) => e.entry_type === 'platform_fee')?.amount_cents || 0;
    const chefPayable = ledgerEntries?.find((e) => e.entry_type === 'chef_payable')?.amount_cents || 0;
    const driverPayable = ledgerEntries?.find((e) => e.entry_type === 'driver_payable')?.amount_cents || 0;
    const tipPayable = ledgerEntries?.find((e) => e.entry_type === 'tip_payable')?.amount_cents || 0;

    return {
      success: true,
      data: {
        orderId,
        subtotal: order.subtotal,
        deliveryFee: order.delivery_fee,
        serviceFee: order.service_fee,
        tax: order.tax,
        tip: order.tip,
        total: order.total,
        platformFee: platformFee / 100,
        chefPayable: chefPayable / 100,
        driverPayable: driverPayable / 100,
        tipPayable: tipPayable / 100,
        ledgerEntries: (ledgerEntries || []).map(this.mapLedgerEntry),
      },
    };
  }

  /**
   * Get pending refunds for review
   */
  async getPendingRefunds(): Promise<RefundCase[]> {
    const { data, error } = await this.client
      .from('refund_cases')
      .select(`
        *,
        orders (order_number, total, customer:customers(first_name, last_name))
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as RefundCase[];
  }

  /**
   * Get financial summary for dashboard
   */
  async getFinancialSummary(dateRange: { start: string; end: string }): Promise<{
    totalRevenue: number;
    totalRefunds: number;
    platformFees: number;
    chefPayouts: number;
    driverPayouts: number;
    taxCollected: number;
    orderCount: number;
  }> {
    const { data: entries } = await this.client
      .from('ledger_entries')
      .select('entry_type, amount_cents')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (!entries) {
      return {
        totalRevenue: 0,
        totalRefunds: 0,
        platformFees: 0,
        chefPayouts: 0,
        driverPayouts: 0,
        taxCollected: 0,
        orderCount: 0,
      };
    }

    const sumByType = (type: string) =>
      entries
        .filter((e) => e.entry_type === type)
        .reduce((sum, e) => sum + e.amount_cents, 0) / 100;

    const captures = entries.filter((e) => e.entry_type === 'customer_charge_capture');

    return {
      totalRevenue: sumByType('customer_charge_capture'),
      totalRefunds: Math.abs(sumByType('customer_refund') + sumByType('customer_partial_refund')),
      platformFees: sumByType('platform_fee'),
      chefPayouts: sumByType('chef_payable'),
      driverPayouts: sumByType('driver_payable') + sumByType('tip_payable'),
      taxCollected: sumByType('tax_collected'),
      orderCount: captures.length,
    };
  }

  /**
   * Create payout adjustments when refund is processed
   */
  private async createRefundAdjustments(
    refundCase: RefundCase & { orders: Record<string, unknown> },
    actor: ActorContext
  ): Promise<void> {
    const approvedAmount = refundCase.approved_amount_cents || 0;
    const refundPercent = approvedAmount / Math.round((refundCase.orders.total as number) * 100);

    // Get original payables
    const { data: ledgerEntries } = await this.client
      .from('ledger_entries')
      .select('*')
      .eq('order_id', refundCase.order_id)
      .in('entry_type', ['chef_payable', 'driver_payable']);

    for (const entry of ledgerEntries || []) {
      const adjustmentAmount = Math.round(entry.amount_cents * refundPercent);

      if (adjustmentAmount > 0) {
        await this.client.from('payout_adjustments').insert({
          payee_type: entry.entry_type === 'chef_payable' ? 'chef' : 'driver',
          payee_id: entry.entity_id,
          order_id: refundCase.order_id,
          refund_case_id: refundCase.id,
          adjustment_type: 'refund_clawback',
          amount_cents: -adjustmentAmount, // Negative = deduction
          reason: `Refund adjustment: ${refundCase.refund_reason}`,
          status: 'pending',
          created_by: actor.userId,
        });

        await this.client.from('ledger_entries').insert({
          order_id: refundCase.order_id,
          entry_type: 'payout_adjustment',
          amount_cents: -adjustmentAmount,
          currency: 'CAD',
          description: `Refund adjustment for ${entry.entry_type === 'chef_payable' ? 'chef' : 'driver'}`,
          entity_type: entry.entity_type,
          entity_id: entry.entity_id,
        });
      }
    }
  }

  private mapLedgerEntry(row: Record<string, unknown>): LedgerEntry {
    return {
      id: row.id as string,
      orderId: row.order_id as string,
      type: row.entry_type as LedgerEntryType,
      amountCents: row.amount_cents as number,
      currency: row.currency as string,
      description: row.description as string,
      entityType: row.entity_type as string | undefined,
      entityId: row.entity_id as string | undefined,
      stripeId: row.stripe_id as string | undefined,
      metadata: row.metadata as Record<string, unknown> | undefined,
      createdAt: row.created_at as string,
    };
  }
}

/**
 * Create commerce ledger engine instance
 */
export function createCommerceLedgerEngine(
  client: SupabaseClient,
  eventEmitter: DomainEventEmitter,
  auditLogger: AuditLogger
): CommerceLedgerEngine {
  return new CommerceLedgerEngine(client, eventEmitter, auditLogger);
}
