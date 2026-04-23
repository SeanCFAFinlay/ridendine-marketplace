// ==========================================
// ORDER ORCHESTRATOR
// Central coordinator for all order operations
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActorContext,
  OperationResult,
  EngineOrderStatus,
  OrderRejectReason,
  OrderCancelReason,
  DomainEventType,
  SLAType,
} from '@ridendine/types';
import { isValidTransition, getAllowedActions } from '@ridendine/types';
import { DomainEventEmitter } from '../core/event-emitter';
import { AuditLogger } from '../core/audit-logger';
import { SLAManager } from '../core/sla-manager';
import { NotificationSender } from '../core/notification-sender';
import {
  SERVICE_FEE_PERCENT,
  HST_RATE,
  BASE_DELIVERY_FEE,
  PLATFORM_FEE_PERCENT,
  DRIVER_PAYOUT_PERCENT,
} from '../constants';

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

interface CreateOrderInput {
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

export class OrderOrchestrator {
  private client: SupabaseClient;
  private eventEmitter: DomainEventEmitter;
  private auditLogger: AuditLogger;
  private slaManager: SLAManager;
  private notificationSender?: NotificationSender;

  constructor(
    client: SupabaseClient,
    eventEmitter: DomainEventEmitter,
    auditLogger: AuditLogger,
    slaManager: SLAManager,
    notificationSender?: NotificationSender,
  ) {
    this.client = client;
    this.eventEmitter = eventEmitter;
    this.auditLogger = auditLogger;
    this.slaManager = slaManager;
    this.notificationSender = notificationSender;
  }

  /**
   * Create a new order (draft state)
   */
  async createOrder(
    input: CreateOrderInput,
    actor: ActorContext
  ): Promise<OperationResult<OrderData>> {
    // Validate actor can create orders
    if (actor.role !== 'customer' && actor.role !== 'system') {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only customers can create orders' },
      };
    }

    // Fetch menu items with prices
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

    // Validate all items belong to the storefront and are available
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

    // Calculate totals
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

    // Calculate fees
    const deliveryFee = BASE_DELIVERY_FEE / 100; // Convert from cents
    const serviceFee = Math.round(subtotal * (SERVICE_FEE_PERCENT / 100) * 100) / 100;
    const taxableAmount = subtotal + serviceFee + deliveryFee;
    const tax = Math.round(taxableAmount * (HST_RATE / 100) * 100) / 100;
    const tip = input.tip || 0;
    const total = subtotal + deliveryFee + serviceFee + tax + tip;

    // Generate order number
    const orderNumber = `RD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create order in transaction-like manner
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
        estimated_prep_minutes: 20, // Default
      })
      .select()
      .single();

    if (orderError || !order) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: orderError?.message || 'Failed to create order' },
      };
    }

    // Create order items
    const { error: itemsError } = await this.client
      .from('order_items')
      .insert(orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      })));

    if (itemsError) {
      // Rollback order
      await this.client.from('orders').delete().eq('id', order.id);
      return {
        success: false,
        error: { code: 'ITEMS_FAILED', message: 'Failed to create order items' },
      };
    }

    // Emit event
    this.eventEmitter.emit(
      'order.created' as DomainEventType,
      'order',
      order.id,
      { orderNumber, customerId: input.customerId, storefrontId: input.storefrontId, total },
      actor
    );

    // Log audit
    await this.auditLogger.log({
      action: 'create',
      entityType: 'order',
      entityId: order.id,
      actor,
      afterState: { status: 'draft', total, itemCount: orderItems.length },
    });

    await this.eventEmitter.flush();

    return {
      success: true,
      data: order as OrderData,
    };
  }

  /**
   * Authorize payment for order
   */
  async authorizePayment(
    orderId: string,
    paymentIntentId: string,
    actor: ActorContext
  ): Promise<OperationResult<OrderData>> {
    const order = await this.getOrder(orderId);
    if (!order) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      };
    }

    // Validate transition
    const validation = isValidTransition(
      order.engine_status as EngineOrderStatus,
      'payment_authorized',
      'authorize_payment',
      actor.role
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const previousStatus = order.engine_status;

    // Update order
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

    // Create ledger entry
    await this.client.from('ledger_entries').insert({
      order_id: orderId,
      entry_type: 'customer_charge_auth',
      amount_cents: Math.round(order.total * 100),
      currency: 'CAD',
      description: `Payment authorization for order ${order.order_number}`,
      stripe_id: paymentIntentId,
    });

    // Emit event
    this.eventEmitter.emit(
      'order.payment_authorized' as DomainEventType,
      'order',
      orderId,
      { paymentIntentId, amount: order.total },
      actor
    );

    // Log audit
    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'payment_authorized',
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Submit order to kitchen (after payment auth)
   */
  async submitToKitchen(
    orderId: string,
    actor: ActorContext
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
      actor.role
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const previousStatus = order.engine_status;

    // Update order
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

    // Start chef response SLA
    await this.slaManager.startTimer({
      type: 'chef_response' as SLAType,
      entityType: 'order',
      entityId: orderId,
      metadata: { storefrontId: order.storefront_id },
    });

    // Create notification for chef — look up chef's user_id via storefront → chef_profile
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
    await this.client.from('notifications').insert({
      user_id: chefUserId,
      type: 'order_placed',
      title: 'New Order Received',
      body: `Order ${order.order_number} has been placed`,
      message: `Order ${order.order_number} has been placed`,
      data: { orderId, orderNumber: order.order_number },
    });

    // Add to order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: 'pending',
      changed_by: actor.userId,
      notes: 'Order submitted to kitchen',
    });

    // Emit event
    this.eventEmitter.emit(
      'order.submitted' as DomainEventType,
      'order',
      orderId,
      { storefrontId: order.storefront_id },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'pending',
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Chef accepts order
   */
  async acceptOrder(
    orderId: string,
    estimatedPrepMinutes: number,
    actor: ActorContext
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
      'accepted',
      'accept_order',
      actor.role
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    // Verify chef owns this storefront (unless ops override)
    if (actor.role === 'chef_user' || actor.role === 'chef_manager') {
      const { data: chef } = await this.client
        .from('chef_profiles')
        .select('id')
        .eq('user_id', actor.userId)
        .single();

      const { data: storefront } = await this.client
        .from('chef_storefronts')
        .select('chef_id')
        .eq('id', order.storefront_id)
        .single();

      if (!chef || !storefront || storefront.chef_id !== chef.id) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only accept orders for your own storefront' },
        };
      }
    }

    const previousStatus = order.engine_status;

    // Update order
    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        status: 'accepted',
        engine_status: 'accepted',
        estimated_prep_minutes: estimatedPrepMinutes,
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

    // Complete chef response SLA
    await this.slaManager.completeTimer('order', orderId, 'chef_response' as SLAType);

    // Notify customer that order was accepted
    if (this.notificationSender) {
      try {
        const { data: customer } = await this.client
          .from('customers')
          .select('user_id')
          .eq('id', order.customer_id)
          .single();
        if (customer?.user_id) {
          await this.notificationSender.send('order_accepted', customer.user_id, {
            orderNumber: order.order_number,
          });
        }
      } catch {
        // Non-fatal: notification is best-effort
      }
    }

    // Add to kitchen queue
    const { data: queuePosition } = await this.client
      .from('kitchen_queue_entries')
      .select('position')
      .eq('storefront_id', order.storefront_id)
      .in('status', ['queued', 'in_progress'])
      .order('position', { ascending: false })
      .limit(1)
      .single();

    await this.client.from('kitchen_queue_entries').insert({
      storefront_id: order.storefront_id,
      order_id: orderId,
      position: (queuePosition?.position || 0) + 1,
      estimated_prep_minutes: estimatedPrepMinutes,
      status: 'queued',
    });

    // Update storefront queue size
    await this.client.rpc('increment_queue_size', { storefront_id: order.storefront_id });

    // Add to order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: 'accepted',
      changed_by: actor.userId,
      notes: `Estimated prep time: ${estimatedPrepMinutes} minutes`,
    });

    // Emit event
    this.eventEmitter.emit(
      'order.accepted' as DomainEventType,
      'order',
      orderId,
      { estimatedPrepMinutes },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'accepted',
      metadata: { estimatedPrepMinutes },
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Chef rejects order
   */
  async rejectOrder(
    orderId: string,
    reason: OrderRejectReason,
    notes: string | undefined,
    actor: ActorContext
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
      'rejected',
      'reject_order',
      actor.role
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const previousStatus = order.engine_status;

    // Update order
    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        status: 'rejected',
        engine_status: 'rejected',
        rejection_reason: reason,
        rejection_notes: notes,
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

    // Complete chef response SLA
    await this.slaManager.completeTimer('order', orderId, 'chef_response' as SLAType);

    // Void payment authorization if exists
    if (order.payment_intent_id) {
      await this.client.from('ledger_entries').insert({
        order_id: orderId,
        entry_type: 'customer_charge_void',
        amount_cents: -Math.round(order.total * 100),
        currency: 'CAD',
        description: `Payment voided due to rejection: ${reason}`,
        stripe_id: order.payment_intent_id,
      });
    }

    // Create exception
    await this.client.from('order_exceptions').insert({
      exception_type: 'chef_rejected_order',
      severity: 'medium',
      status: 'open',
      order_id: orderId,
      title: 'Order Rejected by Chef',
      description: `Order ${order.order_number} was rejected. Reason: ${reason}. ${notes || ''}`,
      recommended_actions: ['Contact customer', 'Suggest alternative chefs'],
    });

    // Add to order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: 'rejected',
      changed_by: actor.userId,
      notes: `Reason: ${reason}. ${notes || ''}`,
    });

    // Emit event
    this.eventEmitter.emit(
      'order.rejected' as DomainEventType,
      'order',
      orderId,
      { reason, notes },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'rejected',
      reason: `${reason}: ${notes || ''}`,
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Start preparing order
   */
  async startPreparing(
    orderId: string,
    actor: ActorContext
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
      'preparing',
      'start_preparing',
      actor.role
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const previousStatus = order.engine_status;
    const now = new Date().toISOString();

    // Update order
    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        status: 'preparing',
        engine_status: 'preparing',
        prep_started_at: now,
        updated_at: now,
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

    // Update kitchen queue entry
    await this.client
      .from('kitchen_queue_entries')
      .update({ status: 'in_progress', started_at: now, updated_at: now })
      .eq('order_id', orderId);

    // Start prep time SLA
    await this.slaManager.startTimer({
      type: 'prep_time' as SLAType,
      entityType: 'order',
      entityId: orderId,
      customDurationMinutes: order.estimated_prep_minutes || 20,
    });

    // Add to order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: 'preparing',
      changed_by: actor.userId,
    });

    // Emit event
    this.eventEmitter.emit(
      'order.prep_started' as DomainEventType,
      'order',
      orderId,
      { estimatedPrepMinutes: order.estimated_prep_minutes },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'preparing',
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Mark order as ready for pickup
   */
  async markReady(
    orderId: string,
    actor: ActorContext
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
      'ready',
      'mark_ready',
      actor.role
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const previousStatus = order.engine_status;
    const now = new Date().toISOString();

    // Calculate actual prep time
    const actualPrepMinutes = order.prep_started_at
      ? Math.round((new Date().getTime() - new Date(order.prep_started_at).getTime()) / (1000 * 60))
      : undefined;

    // Update order
    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        status: 'ready_for_pickup',
        engine_status: 'ready',
        ready_at: now,
        actual_prep_minutes: actualPrepMinutes,
        updated_at: now,
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

    // Complete prep time SLA
    await this.slaManager.completeTimer('order', orderId, 'prep_time' as SLAType);

    // Update kitchen queue entry
    await this.client
      .from('kitchen_queue_entries')
      .update({
        status: 'completed',
        actual_prep_minutes: actualPrepMinutes,
        completed_at: now,
        updated_at: now,
      })
      .eq('order_id', orderId);

    // Decrement storefront queue size
    await this.client.rpc('decrement_queue_size', { storefront_id: order.storefront_id });

    // Add to order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: 'ready',
      changed_by: actor.userId,
      notes: actualPrepMinutes ? `Actual prep time: ${actualPrepMinutes} minutes` : undefined,
    });

    // Emit event - this will trigger dispatch
    this.eventEmitter.emit(
      'order.ready' as DomainEventType,
      'order',
      orderId,
      { actualPrepMinutes },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'ready',
      metadata: { actualPrepMinutes },
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    reason: OrderCancelReason,
    notes: string | undefined,
    actor: ActorContext
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
      'cancelled',
      'cancel_order',
      actor.role
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const previousStatus = order.engine_status;
    const now = new Date().toISOString();

    // Update order
    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        status: 'cancelled',
        engine_status: 'cancelled',
        cancellation_reason: reason,
        cancellation_notes: notes,
        cancelled_by: actor.userId,
        cancelled_at: now,
        updated_at: now,
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

    // Cancel all active SLAs
    await this.slaManager.cancelTimer('order', orderId);

    // Remove from kitchen queue if present
    await this.client
      .from('kitchen_queue_entries')
      .update({ status: 'cancelled', updated_at: now })
      .eq('order_id', orderId)
      .in('status', ['queued', 'in_progress']);

    // Void payment if authorized
    if (order.payment_intent_id && order.payment_status === 'processing') {
      await this.client.from('ledger_entries').insert({
        order_id: orderId,
        entry_type: 'customer_charge_void',
        amount_cents: -Math.round(order.total * 100),
        currency: 'CAD',
        description: `Payment voided due to cancellation: ${reason}`,
        stripe_id: order.payment_intent_id,
      });
    }

    // Add to order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: 'cancelled',
      changed_by: actor.userId,
      notes: `Reason: ${reason}. ${notes || ''}`,
    });

    // Emit event
    this.eventEmitter.emit(
      'order.cancelled' as DomainEventType,
      'order',
      orderId,
      { reason, notes, cancelledBy: actor.role },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'cancelled',
      reason: `${reason}: ${notes || ''}`,
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Complete order (after delivery)
   */
  async completeOrder(
    orderId: string,
    actor: ActorContext
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
      'completed',
      'complete_order',
      actor.role
    );

    if (!validation.valid) {
      return {
        success: false,
        error: { code: 'INVALID_TRANSITION', message: validation.error || 'Invalid state transition' },
      };
    }

    const previousStatus = order.engine_status;
    const now = new Date().toISOString();

    // Update order
    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        status: 'completed',
        engine_status: 'completed',
        payment_status: 'completed',
        completed_at: now,
        updated_at: now,
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

    // Notify customer that order was delivered
    if (this.notificationSender) {
      try {
        const { data: customer } = await this.client
          .from('customers')
          .select('user_id')
          .eq('id', order.customer_id)
          .single();
        if (customer?.user_id) {
          await this.notificationSender.send('order_delivered', customer.user_id, {
            orderNumber: order.order_number,
          });
        }
      } catch {
        // Non-fatal: notification is best-effort
      }
    }

    // Create ledger entries for payouts
    const platformFee = Math.round(order.subtotal * (PLATFORM_FEE_PERCENT / 100) * 100);
    const chefPayable = Math.round((order.subtotal - platformFee / 100) * 100);
    const driverPayable = Math.round(order.delivery_fee * (DRIVER_PAYOUT_PERCENT / 100) * 100);

    await this.client.from('ledger_entries').insert([
      {
        order_id: orderId,
        entry_type: 'customer_charge_capture',
        amount_cents: Math.round(order.total * 100),
        currency: 'CAD',
        description: `Payment captured for order ${order.order_number}`,
        stripe_id: order.payment_intent_id,
      },
      {
        order_id: orderId,
        entry_type: 'platform_fee',
        amount_cents: platformFee,
        currency: 'CAD',
        description: 'Platform commission',
      },
      {
        order_id: orderId,
        entry_type: 'chef_payable',
        amount_cents: chefPayable,
        currency: 'CAD',
        description: 'Chef earnings',
        entity_type: 'storefront',
        entity_id: order.storefront_id,
      },
      {
        order_id: orderId,
        entry_type: 'driver_payable',
        amount_cents: driverPayable,
        currency: 'CAD',
        description: 'Driver delivery fee',
      },
      {
        order_id: orderId,
        entry_type: 'tax_collected',
        amount_cents: Math.round(order.tax * 100),
        currency: 'CAD',
        description: 'HST collected',
      },
    ]);

    if (order.tip > 0) {
      await this.client.from('ledger_entries').insert({
        order_id: orderId,
        entry_type: 'tip_payable',
        amount_cents: Math.round(order.tip * 100),
        currency: 'CAD',
        description: 'Driver tip',
      });
    }

    // Add to order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: 'completed',
      changed_by: actor.userId,
    });

    // Emit events
    this.eventEmitter.emit(
      'order.completed' as DomainEventType,
      'order',
      orderId,
      { total: order.total, chefPayable: chefPayable / 100, driverPayable: driverPayable / 100 },
      actor
    );

    this.eventEmitter.emit(
      'payout.scheduled' as DomainEventType,
      'order',
      orderId,
      { chefPayable: chefPayable / 100, driverPayable: driverPayable / 100, tip: order.tip },
      actor
    );

    await this.auditLogger.logStatusChange({
      entityType: 'order',
      entityId: orderId,
      actor,
      previousStatus,
      newStatus: 'completed',
    });

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Ops override - force status change
   */
  async opsOverride(
    orderId: string,
    targetStatus: EngineOrderStatus,
    reason: string,
    actor: ActorContext
  ): Promise<OperationResult<OrderData>> {
    // Only ops managers and super admins can override
    if (!['ops_manager', 'super_admin'].includes(actor.role)) {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only ops managers can perform overrides' },
      };
    }

    const order = await this.getOrder(orderId);
    if (!order) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      };
    }

    const previousStatus = order.engine_status;
    const now = new Date().toISOString();

    // Log override before making changes
    await this.auditLogger.logOverride({
      action: 'force_status_change',
      entityType: 'order',
      entityId: orderId,
      actor,
      beforeState: { status: previousStatus },
      afterState: { status: targetStatus },
      reason,
    });

    // Map engine status to legacy status
    const legacyStatus = this.mapToLegacyStatus(targetStatus);

    // Update order
    const { data: updated, error } = await this.client
      .from('orders')
      .update({
        status: legacyStatus,
        engine_status: targetStatus,
        updated_at: now,
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

    // Add to order status history
    await this.client.from('order_status_history').insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: targetStatus,
      changed_by: actor.userId,
      notes: `OPS OVERRIDE: ${reason}`,
    });

    // Emit event
    this.eventEmitter.emit(
      'ops.override.executed' as DomainEventType,
      'order',
      orderId,
      { previousStatus, newStatus: targetStatus, reason },
      actor
    );

    await this.eventEmitter.flush();

    return { success: true, data: updated as OrderData };
  }

  /**
   * Get allowed actions for current order state
   */
  async getAllowedActions(orderId: string, actorRole: string): Promise<string[]> {
    const order = await this.getOrder(orderId);
    if (!order) return [];

    const actions = getAllowedActions(
      order.engine_status as EngineOrderStatus,
      actorRole as ActorContext['role']
    );

    return actions.map((a) => a.action);
  }

  /**
   * Get order by ID
   */
  private async getOrder(orderId: string): Promise<OrderData | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) return null;
    return data as OrderData;
  }

  /**
   * Map engine status to legacy status for backwards compatibility
   */
  private mapToLegacyStatus(engineStatus: EngineOrderStatus): string {
    const mapping: Record<string, string> = {
      draft: 'pending',
      checkout_pending: 'pending',
      payment_authorized: 'pending',
      payment_failed: 'failed',
      pending: 'pending',
      accepted: 'accepted',
      rejected: 'rejected',
      preparing: 'preparing',
      ready: 'ready_for_pickup',
      dispatch_pending: 'ready_for_pickup',
      driver_assigned: 'ready_for_pickup',
      driver_en_route_pickup: 'picked_up',
      picked_up: 'picked_up',
      driver_en_route_dropoff: 'in_transit',
      delivered: 'delivered',
      completed: 'completed',
      cancel_requested: 'pending',
      cancelled: 'cancelled',
      refund_pending: 'completed',
      refunded: 'refunded',
      partially_refunded: 'completed',
      failed: 'cancelled',
      exception: 'pending',
    };
    return mapping[engineStatus] || 'pending';
  }
}

/**
 * Create order orchestrator instance
 */
export function createOrderOrchestrator(
  client: SupabaseClient,
  eventEmitter: DomainEventEmitter,
  auditLogger: AuditLogger,
  slaManager: SLAManager,
  notificationSender?: NotificationSender,
): OrderOrchestrator {
  return new OrderOrchestrator(client, eventEmitter, auditLogger, slaManager, notificationSender);
}
