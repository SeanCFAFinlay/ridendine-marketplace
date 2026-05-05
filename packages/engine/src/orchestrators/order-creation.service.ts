// ==========================================
// ORDER CREATION SERVICE
// Handles draft order creation, payment auth, and kitchen submission.
// State transitions are delegated to MasterOrderEngine.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EtaService } from '@ridendine/routing';
import type {
  ActorContext,
  OperationResult,
  EngineOrderStatus,
  DomainEventType,
  SLAType,
} from '@ridendine/types';
import { isValidTransition } from '@ridendine/types';
import type { DomainEventEmitter } from '../core/event-emitter';
import type { AuditLogger } from '../core/audit-logger';
import type { SLAManager } from '../core/sla-manager';
import type { MasterOrderEngine } from './master-order-engine';
import {
  SERVICE_FEE_PERCENT,
  HST_RATE,
  BASE_DELIVERY_FEE,
} from '../constants';

// ==========================================
// TYPES
// ==========================================

interface OrderData {
  id: string;
  order_number: string;
  customer_id: string;
  storefront_id: string;
  status: string;
  engine_status: EngineOrderStatus;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  tip: number;
  total: number;
  payment_status: string;
  payment_intent_id?: string;
  estimated_prep_minutes?: number;
  actual_prep_minutes?: number;
  prep_started_at?: string;
  ready_at?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  customerId: string;
  storefrontId: string;
  deliveryAddressId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
    modifiers?: Array<{
      optionId: string;
      valueId: string;
      priceAdjustment: number;
    }>;
  }>;
  tip?: number;
  promoCode?: string;
  specialInstructions?: string;
}

// ==========================================
// ORDER CREATION SERVICE
// ==========================================

export class OrderCreationService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly events: DomainEventEmitter,
    private readonly audit: AuditLogger,
    private readonly sla: SLAManager,
    private readonly masterOrder: MasterOrderEngine,
    private readonly eta?: EtaService,
  ) {}

  /** Best-effort ETA refresh; never throws to callers. */
  private async runEtaBestEffort(fn: (eta: EtaService) => Promise<void>): Promise<void> {
    if (!this.eta) return;
    try {
      await fn(this.eta);
    } catch {
      /* routing / OSRM optional */
    }
  }

  /**
   * Create a new order (draft state)
   */
  async createOrder(
    input: CreateOrderInput,
    actor: ActorContext,
  ): Promise<OperationResult<OrderData>> {
    if (actor.role !== 'customer' && actor.role !== 'system') {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only customers can create orders' },
      };
    }

    const { data: menuItems, error: menuError } = await this.client
      .from('menu_items')
      .select('id, name, price, is_available, is_sold_out, storefront_id')
      .in('id', input.items.map((i) => i.menuItemId));

    if (menuError || !menuItems) {
      return {
        success: false,
        error: { code: 'INVALID_ITEMS', message: 'Failed to fetch menu items' },
      };
    }

    for (const item of menuItems) {
      if (item.storefront_id !== input.storefrontId) {
        return {
          success: false,
          error: { code: 'INVALID_STOREFRONT', message: `Item ${item.name} does not belong to this storefront` },
        };
      }
      if (!item.is_available || item.is_sold_out) {
        return {
          success: false,
          error: { code: 'ITEM_UNAVAILABLE', message: `Item ${item.name} is not available` },
        };
      }
    }

    let subtotal = 0;
    const orderItems: Array<{
      menu_item_id: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      special_instructions?: string;
    }> = [];

    for (const inputItem of input.items) {
      const menuItem = menuItems.find((m) => m.id === inputItem.menuItemId);
      if (!menuItem) continue;

      const unitPrice = menuItem.price;
      const modifierTotal = inputItem.modifiers?.reduce((sum, m) => sum + m.priceAdjustment, 0) || 0;
      const totalPrice = (unitPrice + modifierTotal) * inputItem.quantity;
      subtotal += totalPrice;

      orderItems.push({
        menu_item_id: inputItem.menuItemId,
        quantity: inputItem.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        special_instructions: inputItem.specialInstructions,
      });
    }

    const deliveryFee = BASE_DELIVERY_FEE / 100;
    const serviceFee = Math.round(subtotal * (SERVICE_FEE_PERCENT / 100) * 100) / 100;
    const taxableAmount = subtotal + serviceFee + deliveryFee;
    const tax = Math.round(taxableAmount * (HST_RATE / 100) * 100) / 100;
    const tip = input.tip || 0;
    const total = subtotal + deliveryFee + serviceFee + tax + tip;

    const orderNumber = `RD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: order, error: orderError } = await this.client
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: input.customerId,
        storefront_id: input.storefrontId,
        delivery_address_id: input.deliveryAddressId,
        status: 'pending',
        engine_status: 'draft',
        subtotal,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        tax,
        tip,
        total,
        payment_status: 'pending',
        special_instructions: input.specialInstructions,
        estimated_prep_minutes: 20,
      })
      .select()
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: orderError?.message || 'Failed to create order' },
      };
    }

    const { error: itemsError } = await this.client
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

    if (itemsError) {
      await this.client.from('orders').delete().eq('id', order.id);
      return {
        success: false,
        error: { code: 'ITEMS_FAILED', message: 'Failed to create order items' },
      };
    }

    this.events.emit(
      'order.created' as DomainEventType,
      'order',
      order.id,
      { orderNumber, customerId: input.customerId, storefrontId: input.storefrontId, total },
      actor,
    );

    await this.audit.log({
      action: 'create',
      entityType: 'order',
      entityId: order.id,
      actor,
      afterState: { status: 'draft', total, itemCount: orderItems.length },
    });

    await this.events.flush();

    return { success: true, data: order as OrderData };
  }

  /**
   * Authorize payment for order — moves draft → payment_authorized, records ledger entry
   */
  async authorizePayment(
    orderId: string,
    paymentIntentId: string,
    actor: ActorContext,
  ): Promise<OperationResult<OrderData>> {
    const order = await this.getOrder(orderId);
    if (!order) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      };
    }

    const validation = isValidTransition(
      order.engine_status as EngineOrderStatus,
      'payment_authorized',
      'authorize_payment',
      actor.role,
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        engine_status: 'payment_authorized',
        payment_status: 'processing',
        payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    await this.client.from('ledger_entries').insert({
      order_id: orderId,
      entry_type: 'customer_charge_auth',
      amount_cents: Math.round(order.total * 100),
      currency: 'CAD',
      description: `Payment authorization for order ${order.order_number}`,
      stripe_id: paymentIntentId,
    });

    this.events.emit(
      'order.payment_authorized' as DomainEventType,
      'order',
      orderId,
      { paymentIntentId, amount: order.total },
      actor,
    );

    await this.audit.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus: order.engine_status,
      newStatus: 'payment_authorized',
    });

    await this.events.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Submit order to kitchen — moves to pending, starts chef_response SLA, inserts chef notification
   * FND-018: guards against null chef user_id
   */
  async submitToKitchen(
    orderId: string,
    actor: ActorContext,
  ): Promise<OperationResult<OrderData>> {
    const order = await this.getOrder(orderId);
    if (!order) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      };
    }

    const validation = isValidTransition(
      order.engine_status as EngineOrderStatus,
      'pending',
      'submit_order',
      actor.role,
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const previousStatus = order.engine_status;

    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        status: 'pending',
        engine_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error.message },
      };
    }

    await this.sla.startTimer({
      type: 'chef_response' as SLAType,
      entityType: 'order',
      entityId: orderId,
      metadata: { storefrontId: order.storefront_id },
    });

    // Create notification for chef — look up chef's user_id via storefront → chef_profile
    // FND-018 fix: guard against null user_id (notifications.user_id is NOT NULL)
    let chefUserId: string | null = null;
    try {
      const { data: storefront } = await this.client
        .from('chef_storefronts')
        .select('chef_id')
        .eq('id', order.storefront_id)
        .single();
      if (storefront?.chef_id) {
        const { data: chefProfile } = await this.client
          .from('chef_profiles')
          .select('user_id')
          .eq('id', storefront.chef_id)
          .single();
        chefUserId = chefProfile?.user_id ?? null;
      }
    } catch {
      // Non-fatal: notification is best-effort
    }

    if (chefUserId) {
      await this.client.from('notifications').insert({
        user_id: chefUserId,
        type: 'order_placed',
        title: 'New Order Received',
        body: `Order ${order.order_number} has been placed`,
        message: `Order ${order.order_number} has been placed`,
        data: { orderId, orderNumber: order.order_number },
      });
    } else {
      // Chef user lookup failed — log for ops visibility and create exception
      await this.audit.log({
        action: 'override',
        entityType: 'order',
        entityId: orderId,
        actor,
        metadata: {
          warning: 'chef_notification_skipped',
          reason: 'Could not resolve chef user_id for storefront',
          storefrontId: order.storefront_id,
        },
      });

      await this.client.from('order_exceptions').insert({
        exception_type: 'chef_notification_failed',
        severity: 'low',
        status: 'open',
        order_id: orderId,
        title: 'Chef Notification Not Sent',
        description: `Could not send order notification for ${order.order_number} — chef user_id could not be resolved for storefront ${order.storefront_id}.`,
        recommended_actions: ['Check storefront-chef linkage', 'Manually notify chef'],
      });
    }

    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: 'pending',
      changed_by: actor.userId,
      notes: 'Order submitted to kitchen',
    });

    this.events.emit(
      'order.submitted' as DomainEventType,
      'order',
      orderId,
      { storefrontId: order.storefront_id },
      actor,
    );

    await this.audit.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'pending',
    });

    await this.events.flush();

    await this.runEtaBestEffort((eta) => eta.computeInitial(orderId));

    return { success: true, data: updated as OrderData };
  }

  private async getOrder(orderId: string): Promise<OrderData | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) return null;
    return data as OrderData;
  }
}

export function createOrderCreationService(
  client: SupabaseClient,
  events: DomainEventEmitter,
  audit: AuditLogger,
  sla: SLAManager,
  masterOrder: MasterOrderEngine,
  eta?: EtaService,
): OrderCreationService {
  return new OrderCreationService(client, events, audit, sla, masterOrder, eta);
}
