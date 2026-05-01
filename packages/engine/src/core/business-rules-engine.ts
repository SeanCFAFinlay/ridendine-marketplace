// ==========================================
// BUSINESS RULES ENGINE
// Validates all business preconditions before
// allowing engine operations. SELECT only.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';

export type RuleResult = {
  allowed: boolean;
  reason: string;
  metadata?: Record<string, unknown>;
};

const CANCELLABLE_STATUSES = new Set([
  'draft',
  'checkout_pending',
  'payment_authorized',
  'pending',
  'accepted',
  'cancel_requested',
]);

const OPS_ROLES = new Set(['ops_admin', 'ops_manager', 'super_admin']);

const MINIMUM_ORDER_AMOUNT = 10;

function allow(metadata?: Record<string, unknown>): RuleResult {
  return { allowed: true, reason: 'ok', metadata };
}

function deny(reason: string, metadata?: Record<string, unknown>): RuleResult {
  return { allowed: false, reason, metadata };
}

// ---------------------------------------------------------------------------
// BusinessRulesEngine
// ---------------------------------------------------------------------------

export class BusinessRulesEngine {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // -------------------------------------------------------------------------
  // canCustomerCreateOrder
  // -------------------------------------------------------------------------
  async canCustomerCreateOrder(input: {
    customerId: string;
    storefrontId: string;
    items: Array<{ menuItemId: string; quantity: number; unitPrice: number }>;
  }): Promise<RuleResult> {
    const { data: storefront } = await this.client
      .from('chef_storefronts')
      .select('id, is_active, chef_id')
      .eq('id', input.storefrontId)
      .single();

    if (!storefront) return deny('Storefront not found');
    if (!storefront.is_active) return deny('Storefront is not active');

    const { data: chef } = await this.client
      .from('chef_profiles')
      .select('id, status')
      .eq('id', storefront.chef_id)
      .single();

    if (!chef || chef.status !== 'approved') {
      return deny('Chef is not approved');
    }

    return this._validateMenuItems(input.storefrontId, input.items);
  }

  private async _validateMenuItems(
    storefrontId: string,
    items: Array<{ menuItemId: string; quantity: number; unitPrice: number }>
  ): Promise<RuleResult> {
    const itemIds = items.map((i) => i.menuItemId);

    const { data: menuItems } = await this.client
      .from('menu_items')
      .select('id, is_available, storefront_id, price')
      .in('id', itemIds)
      .eq('storefront_id', storefrontId)
      .eq('is_available', true);

    const found = menuItems ?? [];

    if (found.length !== items.length) {
      return deny('One or more menu items not found, unavailable, or not part of this storefront');
    }

    const priceMap = new Map(found.map((m: { id: string; price: number }) => [m.id, m.price]));
    for (const item of items) {
      const dbPrice = priceMap.get(item.menuItemId);
      if (dbPrice === undefined) continue;
      if (Math.abs(dbPrice - item.unitPrice) > 0.001) {
        return deny(
          `Price mismatch for item ${item.menuItemId}: expected ${dbPrice}, got ${item.unitPrice}`
        );
      }
    }

    const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    if (total < MINIMUM_ORDER_AMOUNT) {
      return deny(
        `Order total $${total.toFixed(2)} is below minimum order amount of $${MINIMUM_ORDER_AMOUNT}`
      );
    }

    return allow({ total });
  }

  // -------------------------------------------------------------------------
  // canChefAcceptOrder
  // -------------------------------------------------------------------------
  async canChefAcceptOrder(input: {
    orderId: string;
    chefId: string;
  }): Promise<RuleResult> {
    const { data: order } = await this.client
      .from('orders')
      .select('id, engine_status, storefront_id')
      .eq('id', input.orderId)
      .single();

    if (!order) return deny('Order not found');

    const { data: storefront } = await this.client
      .from('chef_storefronts')
      .select('id, chef_id, is_paused')
      .eq('id', order.storefront_id)
      .single();

    if (!storefront || storefront.chef_id !== input.chefId) {
      return deny('Chef does not own this storefront');
    }
    if (order.engine_status !== 'pending') {
      return deny(`Order is not pending (current: ${order.engine_status})`);
    }
    if (storefront.is_paused) {
      return deny('Storefront is paused');
    }

    return allow();
  }

  // -------------------------------------------------------------------------
  // canChefRejectOrder
  // -------------------------------------------------------------------------
  async canChefRejectOrder(input: {
    orderId: string;
    chefId: string;
    reason: string;
  }): Promise<RuleResult> {
    if (!input.reason || !input.reason.trim()) {
      return deny('Rejection reason is required');
    }

    return this.canChefAcceptOrder({ orderId: input.orderId, chefId: input.chefId });
  }

  // -------------------------------------------------------------------------
  // canDriverAcceptDelivery
  // -------------------------------------------------------------------------
  async canDriverAcceptDelivery(input: {
    deliveryId: string;
    driverId: string;
  }): Promise<RuleResult> {
    const { data: delivery } = await this.client
      .from('deliveries')
      .select('id, status, driver_id')
      .eq('id', input.deliveryId)
      .single();

    if (!delivery) return deny('Delivery not found');
    if (delivery.status !== 'pending' && delivery.status !== 'offered') {
      return deny(`Delivery is not available for acceptance (status: ${delivery.status})`);
    }

    const { data: driver } = await this.client
      .from('driver_profiles')
      .select('id, status')
      .eq('id', input.driverId)
      .single();

    if (!driver || driver.status !== 'approved') {
      return deny('Driver is not approved');
    }

    const { data: presence } = await this.client
      .from('driver_presence')
      .select('driver_id, status')
      .eq('driver_id', input.driverId)
      .single();

    if (!presence || presence.status !== 'online') {
      return deny('Driver is offline');
    }

    return allow();
  }

  // -------------------------------------------------------------------------
  // canDriverPickupOrder
  // -------------------------------------------------------------------------
  async canDriverPickupOrder(input: {
    deliveryId: string;
    driverId: string;
  }): Promise<RuleResult> {
    const { data: delivery } = await this.client
      .from('deliveries')
      .select('id, status, driver_id')
      .eq('id', input.deliveryId)
      .single();

    if (!delivery) return deny('Delivery not found');
    if (delivery.driver_id !== input.driverId) {
      return deny('Driver is not assigned to this delivery');
    }

    const validStatuses = new Set(['en_route_to_pickup', 'arrived_at_pickup', 'assigned']);
    if (!validStatuses.has(delivery.status)) {
      return deny(`Cannot pick up: delivery status is ${delivery.status}`);
    }

    return allow();
  }

  // -------------------------------------------------------------------------
  // canDriverDeliverOrder
  // -------------------------------------------------------------------------
  async canDriverDeliverOrder(input: {
    deliveryId: string;
    driverId: string;
  }): Promise<RuleResult> {
    const { data: delivery } = await this.client
      .from('deliveries')
      .select('id, status, driver_id')
      .eq('id', input.deliveryId)
      .single();

    if (!delivery) return deny('Delivery not found');
    if (delivery.driver_id !== input.driverId) {
      return deny('Driver is not assigned to this delivery');
    }

    const validStatuses = new Set([
      'en_route_to_dropoff',
      'en_route_to_customer',
      'arrived_at_dropoff',
      'arrived_at_customer',
    ]);
    if (!validStatuses.has(delivery.status)) {
      return deny(`Cannot deliver: delivery status is ${delivery.status}`);
    }

    return allow();
  }

  // -------------------------------------------------------------------------
  // canCustomerCancelOrder
  // -------------------------------------------------------------------------
  async canCustomerCancelOrder(input: {
    orderId: string;
    customerId: string;
  }): Promise<RuleResult> {
    const { data: order } = await this.client
      .from('orders')
      .select('id, customer_id, engine_status')
      .eq('id', input.orderId)
      .single();

    if (!order) return deny('Order not found');
    if (order.customer_id !== input.customerId) {
      return deny('Customer does not own this order');
    }
    if (!CANCELLABLE_STATUSES.has(order.engine_status)) {
      return deny(`Cannot cancel order with status: ${order.engine_status}`);
    }

    return allow();
  }

  // -------------------------------------------------------------------------
  // canOpsOverrideOrder
  // -------------------------------------------------------------------------
  async canOpsOverrideOrder(input: {
    orderId: string;
    actorRole: string;
  }): Promise<RuleResult> {
    if (!OPS_ROLES.has(input.actorRole)) {
      return deny(`Role '${input.actorRole}' is not authorized to override orders`);
    }

    const { data: order } = await this.client
      .from('orders')
      .select('id, engine_status')
      .eq('id', input.orderId)
      .single();

    if (!order) return deny('Order not found');

    return allow({ engine_status: order.engine_status });
  }

  // -------------------------------------------------------------------------
  // canReleasePayout
  // -------------------------------------------------------------------------
  async canReleasePayout(input: { orderId: string }): Promise<RuleResult> {
    const { data: order } = await this.client
      .from('orders')
      .select('id, engine_status, payment_status')
      .eq('id', input.orderId)
      .single();

    if (!order) return deny('Order not found');

    const completedStatuses = new Set(['completed', 'delivered']);
    if (!completedStatuses.has(order.engine_status)) {
      return deny(`Order is not completed (status: ${order.engine_status})`);
    }
    if (order.payment_status !== 'completed') {
      return deny(`Payment is not completed (status: ${order.payment_status})`);
    }

    const { data: exceptions } = await this.client
      .from('order_exceptions')
      .select('id, status')
      .eq('order_id', input.orderId)
      .not('status', 'in', '("resolved","closed")');

    const openExceptions = exceptions ?? [];
    if (openExceptions.length > 0) {
      return deny('Order has open exceptions that must be resolved before payout', {
        exceptionCount: openExceptions.length,
      });
    }

    return allow();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createBusinessRulesEngine(client: SupabaseClient): BusinessRulesEngine {
  return new BusinessRulesEngine(client);
}
