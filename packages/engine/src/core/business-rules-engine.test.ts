// ==========================================
// BUSINESS RULES ENGINE TESTS
// TDD: Validate all business preconditions
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BusinessRulesEngine, createBusinessRulesEngine } from './business-rules-engine';
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Helpers to build chainable Supabase mock
// ---------------------------------------------------------------------------

type MockChain = Record<string, unknown> & PromiseLike<{ data: unknown; error: unknown }>;

function makeChain(resolvedValue: { data: unknown; error: unknown }): MockChain {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'in', 'not', 'neq', 'single', 'limit', 'maybeSingle'];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // make the chain thenable so await works
  chain['then'] = <TResult1, TResult2>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> => {
    return Promise.resolve(resolvedValue).then(onfulfilled, onrejected ?? undefined);
  };
  return chain as MockChain;
}

function mockFrom(returnsByTable: Record<string, ReturnType<typeof makeChain>>) {
  return vi.fn((table: string) => returnsByTable[table] ?? makeChain({ data: null, error: null }));
}

function makeClient(fromImpl: ReturnType<typeof mockFrom>): SupabaseClient {
  return { from: fromImpl } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('BusinessRulesEngine', () => {
  // -------------------------------------------------------------------------
  // canCustomerCreateOrder
  // -------------------------------------------------------------------------
  describe('canCustomerCreateOrder', () => {
    const baseInput = {
      customerId: 'cust-1',
      storefrontId: 'sf-1',
      items: [
        { menuItemId: 'item-1', quantity: 2, unitPrice: 10.0 },
      ],
    };

    it('returns allowed=false when storefront not found', async () => {
      const storefrontChain = makeChain({ data: null, error: null });
      const client = makeClient(mockFrom({ chef_storefronts: storefrontChain }));
      const engine = new BusinessRulesEngine(client);

      const result = await engine.canCustomerCreateOrder(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/storefront/i);
    });

    it('returns allowed=false when storefront is not active', async () => {
      const storefrontChain = makeChain({
        data: { id: 'sf-1', is_active: false, chef_id: 'chef-1' },
        error: null,
      });
      const client = makeClient(mockFrom({ chef_storefronts: storefrontChain }));
      const engine = new BusinessRulesEngine(client);

      const result = await engine.canCustomerCreateOrder(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not active/i);
    });

    it('returns allowed=false when chef is not approved', async () => {
      const storefrontChain = makeChain({
        data: { id: 'sf-1', is_active: true, chef_id: 'chef-1' },
        error: null,
      });
      const chefChain = makeChain({
        data: { id: 'chef-1', status: 'pending' },
        error: null,
      });
      const menuChain = makeChain({ data: [], error: null });

      const from = mockFrom({
        chef_storefronts: storefrontChain,
        chef_profiles: chefChain,
        menu_items: menuChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canCustomerCreateOrder(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/chef.*not approved/i);
    });

    it('returns allowed=false when menu item not found for storefront', async () => {
      const storefrontChain = makeChain({
        data: { id: 'sf-1', is_active: true, chef_id: 'chef-1' },
        error: null,
      });
      const chefChain = makeChain({
        data: { id: 'chef-1', status: 'approved' },
        error: null,
      });
      // menu items returns empty (item not found)
      const menuChain = makeChain({ data: [], error: null });

      const from = mockFrom({
        chef_storefronts: storefrontChain,
        chef_profiles: chefChain,
        menu_items: menuChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canCustomerCreateOrder(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/menu item/i);
    });

    it('returns allowed=false when menu item price does not match', async () => {
      const storefrontChain = makeChain({
        data: { id: 'sf-1', is_active: true, chef_id: 'chef-1' },
        error: null,
      });
      const chefChain = makeChain({
        data: { id: 'chef-1', status: 'approved' },
        error: null,
      });
      // price mismatch: DB has 15.00 but input sends 10.00
      const menuChain = makeChain({
        data: [{ id: 'item-1', is_available: true, storefront_id: 'sf-1', price: 15.0 }],
        error: null,
      });

      const from = mockFrom({
        chef_storefronts: storefrontChain,
        chef_profiles: chefChain,
        menu_items: menuChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canCustomerCreateOrder(baseInput);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/price/i);
    });

    it('returns allowed=false when order total below minimum', async () => {
      const input = {
        customerId: 'cust-1',
        storefrontId: 'sf-1',
        items: [{ menuItemId: 'item-1', quantity: 1, unitPrice: 5.0 }],
      };
      const storefrontChain = makeChain({
        data: { id: 'sf-1', is_active: true, chef_id: 'chef-1' },
        error: null,
      });
      const chefChain = makeChain({
        data: { id: 'chef-1', status: 'approved' },
        error: null,
      });
      const menuChain = makeChain({
        data: [{ id: 'item-1', is_available: true, storefront_id: 'sf-1', price: 5.0 }],
        error: null,
      });

      const from = mockFrom({
        chef_storefronts: storefrontChain,
        chef_profiles: chefChain,
        menu_items: menuChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canCustomerCreateOrder(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/minimum/i);
    });

    it('returns allowed=true for a valid order', async () => {
      const storefrontChain = makeChain({
        data: { id: 'sf-1', is_active: true, chef_id: 'chef-1' },
        error: null,
      });
      const chefChain = makeChain({
        data: { id: 'chef-1', status: 'approved' },
        error: null,
      });
      const menuChain = makeChain({
        data: [{ id: 'item-1', is_available: true, storefront_id: 'sf-1', price: 10.0 }],
        error: null,
      });

      const from = mockFrom({
        chef_storefronts: storefrontChain,
        chef_profiles: chefChain,
        menu_items: menuChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canCustomerCreateOrder(baseInput);

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // canChefAcceptOrder
  // -------------------------------------------------------------------------
  describe('canChefAcceptOrder', () => {
    const input = { orderId: 'order-1', chefId: 'chef-1' };

    it('returns allowed=false when order not found', async () => {
      const orderChain = makeChain({ data: null, error: null });
      const engine = new BusinessRulesEngine(makeClient(mockFrom({ orders: orderChain })));

      const result = await engine.canChefAcceptOrder(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/order not found/i);
    });

    it('returns allowed=false when storefront does not belong to chef', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'pending', storefront_id: 'sf-1' },
        error: null,
      });
      const storefrontChain = makeChain({
        data: { id: 'sf-1', chef_id: 'chef-99', is_paused: false },
        error: null,
      });
      const from = mockFrom({ orders: orderChain, chef_storefronts: storefrontChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canChefAcceptOrder(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not own/i);
    });

    it('returns allowed=false when order status is not pending', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'accepted', storefront_id: 'sf-1' },
        error: null,
      });
      const storefrontChain = makeChain({
        data: { id: 'sf-1', chef_id: 'chef-1', is_paused: false },
        error: null,
      });
      const from = mockFrom({ orders: orderChain, chef_storefronts: storefrontChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canChefAcceptOrder(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not pending/i);
    });

    it('returns allowed=false when storefront is paused', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'pending', storefront_id: 'sf-1' },
        error: null,
      });
      const storefrontChain = makeChain({
        data: { id: 'sf-1', chef_id: 'chef-1', is_paused: true },
        error: null,
      });
      const from = mockFrom({ orders: orderChain, chef_storefronts: storefrontChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canChefAcceptOrder(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/paused/i);
    });

    it('returns allowed=true for valid accept', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'pending', storefront_id: 'sf-1' },
        error: null,
      });
      const storefrontChain = makeChain({
        data: { id: 'sf-1', chef_id: 'chef-1', is_paused: false },
        error: null,
      });
      const from = mockFrom({ orders: orderChain, chef_storefronts: storefrontChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canChefAcceptOrder(input);

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // canChefRejectOrder
  // -------------------------------------------------------------------------
  describe('canChefRejectOrder', () => {
    it('returns allowed=false when reason is empty', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'pending', storefront_id: 'sf-1' },
        error: null,
      });
      const storefrontChain = makeChain({
        data: { id: 'sf-1', chef_id: 'chef-1', is_paused: false },
        error: null,
      });
      const from = mockFrom({ orders: orderChain, chef_storefronts: storefrontChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canChefRejectOrder({
        orderId: 'order-1',
        chefId: 'chef-1',
        reason: '  ',
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/reason/i);
    });

    it('returns allowed=true with valid reason and pending order', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'pending', storefront_id: 'sf-1' },
        error: null,
      });
      const storefrontChain = makeChain({
        data: { id: 'sf-1', chef_id: 'chef-1', is_paused: false },
        error: null,
      });
      const from = mockFrom({ orders: orderChain, chef_storefronts: storefrontChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canChefRejectOrder({
        orderId: 'order-1',
        chefId: 'chef-1',
        reason: 'Out of ingredients',
      });

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // canDriverAcceptDelivery
  // -------------------------------------------------------------------------
  describe('canDriverAcceptDelivery', () => {
    const input = { deliveryId: 'del-1', driverId: 'drv-1' };

    it('returns allowed=false when delivery not found', async () => {
      const deliveryChain = makeChain({ data: null, error: null });
      const engine = new BusinessRulesEngine(makeClient(mockFrom({ deliveries: deliveryChain })));

      const result = await engine.canDriverAcceptDelivery(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/delivery not found/i);
    });

    it('returns allowed=false when delivery status is not pending/offered', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'assigned', driver_id: null },
        error: null,
      });
      const driverChain = makeChain({
        data: { id: 'drv-1', status: 'approved' },
        error: null,
      });
      const presenceChain = makeChain({
        data: { driver_id: 'drv-1', status: 'online' },
        error: null,
      });
      const from = mockFrom({
        deliveries: deliveryChain,
        driver_profiles: driverChain,
        driver_presence: presenceChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canDriverAcceptDelivery(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not available/i);
    });

    it('returns allowed=false when driver not approved', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'pending', driver_id: null },
        error: null,
      });
      const driverChain = makeChain({
        data: { id: 'drv-1', status: 'suspended' },
        error: null,
      });
      const presenceChain = makeChain({
        data: { driver_id: 'drv-1', status: 'online' },
        error: null,
      });
      const from = mockFrom({
        deliveries: deliveryChain,
        driver_profiles: driverChain,
        driver_presence: presenceChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canDriverAcceptDelivery(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/driver.*not approved/i);
    });

    it('returns allowed=false when driver is offline', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'offered', driver_id: null },
        error: null,
      });
      const driverChain = makeChain({
        data: { id: 'drv-1', status: 'approved' },
        error: null,
      });
      const presenceChain = makeChain({
        data: { driver_id: 'drv-1', status: 'offline' },
        error: null,
      });
      const from = mockFrom({
        deliveries: deliveryChain,
        driver_profiles: driverChain,
        driver_presence: presenceChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canDriverAcceptDelivery(input);

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/offline/i);
    });

    it('returns allowed=true for valid driver accept', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'pending', driver_id: null },
        error: null,
      });
      const driverChain = makeChain({
        data: { id: 'drv-1', status: 'approved' },
        error: null,
      });
      const presenceChain = makeChain({
        data: { driver_id: 'drv-1', status: 'online' },
        error: null,
      });
      const from = mockFrom({
        deliveries: deliveryChain,
        driver_profiles: driverChain,
        driver_presence: presenceChain,
      });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canDriverAcceptDelivery(input);

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // canDriverPickupOrder
  // -------------------------------------------------------------------------
  describe('canDriverPickupOrder', () => {
    it('returns allowed=false when driver does not own delivery', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'en_route_to_pickup', driver_id: 'drv-99' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ deliveries: deliveryChain }))
      );

      const result = await engine.canDriverPickupOrder({ deliveryId: 'del-1', driverId: 'drv-1' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not assigned/i);
    });

    it('returns allowed=false when delivery status is invalid for pickup', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'delivered', driver_id: 'drv-1' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ deliveries: deliveryChain }))
      );

      const result = await engine.canDriverPickupOrder({ deliveryId: 'del-1', driverId: 'drv-1' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/cannot pick up/i);
    });

    it('returns allowed=true for valid pickup', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'arrived_at_pickup', driver_id: 'drv-1' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ deliveries: deliveryChain }))
      );

      const result = await engine.canDriverPickupOrder({ deliveryId: 'del-1', driverId: 'drv-1' });

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // canDriverDeliverOrder
  // -------------------------------------------------------------------------
  describe('canDriverDeliverOrder', () => {
    it('returns allowed=false when driver does not own delivery', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'en_route_to_dropoff', driver_id: 'drv-99' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ deliveries: deliveryChain }))
      );

      const result = await engine.canDriverDeliverOrder({ deliveryId: 'del-1', driverId: 'drv-1' });

      expect(result.allowed).toBe(false);
    });

    it('returns allowed=true for valid deliver', async () => {
      const deliveryChain = makeChain({
        data: { id: 'del-1', status: 'arrived_at_customer', driver_id: 'drv-1' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ deliveries: deliveryChain }))
      );

      const result = await engine.canDriverDeliverOrder({ deliveryId: 'del-1', driverId: 'drv-1' });

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // canCustomerCancelOrder
  // -------------------------------------------------------------------------
  describe('canCustomerCancelOrder', () => {
    it('returns allowed=false when customer does not own order', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', customer_id: 'cust-99', engine_status: 'pending' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ orders: orderChain }))
      );

      const result = await engine.canCustomerCancelOrder({ orderId: 'order-1', customerId: 'cust-1' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not own/i);
    });

    it('returns allowed=false when order is in preparing or later', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', customer_id: 'cust-1', engine_status: 'preparing' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ orders: orderChain }))
      );

      const result = await engine.canCustomerCancelOrder({ orderId: 'order-1', customerId: 'cust-1' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/cannot cancel/i);
    });

    it('returns allowed=true for cancellable statuses', async () => {
      for (const status of ['draft', 'checkout_pending', 'payment_authorized', 'pending', 'accepted', 'cancel_requested']) {
        const orderChain = makeChain({
          data: { id: 'order-1', customer_id: 'cust-1', engine_status: status },
          error: null,
        });
        const engine = new BusinessRulesEngine(
          makeClient(mockFrom({ orders: orderChain }))
        );

        const result = await engine.canCustomerCancelOrder({ orderId: 'order-1', customerId: 'cust-1' });
        expect(result.allowed).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // canOpsOverrideOrder
  // -------------------------------------------------------------------------
  describe('canOpsOverrideOrder', () => {
    it('returns allowed=false for non-ops roles', async () => {
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({}))
      );

      const result = await engine.canOpsOverrideOrder({ orderId: 'order-1', actorRole: 'customer' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not authorized/i);
    });

    it('returns allowed=false when order does not exist', async () => {
      const orderChain = makeChain({ data: null, error: null });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ orders: orderChain }))
      );

      const result = await engine.canOpsOverrideOrder({ orderId: 'order-1', actorRole: 'ops_manager' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/order not found/i);
    });

    it('returns allowed=true for ops_manager with existing order', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'pending' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ orders: orderChain }))
      );

      const result = await engine.canOpsOverrideOrder({ orderId: 'order-1', actorRole: 'ops_manager' });

      expect(result.allowed).toBe(true);
    });

    it('returns allowed=true for super_admin', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'completed' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ orders: orderChain }))
      );

      const result = await engine.canOpsOverrideOrder({ orderId: 'order-1', actorRole: 'super_admin' });

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // canReleasePayout
  // -------------------------------------------------------------------------
  describe('canReleasePayout', () => {
    it('returns allowed=false when order not found', async () => {
      const orderChain = makeChain({ data: null, error: null });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ orders: orderChain }))
      );

      const result = await engine.canReleasePayout({ orderId: 'order-1' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/order not found/i);
    });

    it('returns allowed=false when engine_status is not completed/delivered', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'pending', payment_status: 'completed' },
        error: null,
      });
      const engine = new BusinessRulesEngine(
        makeClient(mockFrom({ orders: orderChain }))
      );

      const result = await engine.canReleasePayout({ orderId: 'order-1' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not completed/i);
    });

    it('returns allowed=false when payment_status is not completed', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'completed', payment_status: 'pending' },
        error: null,
      });
      const exceptionsChain = makeChain({ data: [], error: null });
      const from = mockFrom({ orders: orderChain, order_exceptions: exceptionsChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canReleasePayout({ orderId: 'order-1' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/payment.*not completed/i);
    });

    it('returns allowed=false when open exceptions exist', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'delivered', payment_status: 'completed' },
        error: null,
      });
      const exceptionsChain = makeChain({
        data: [{ id: 'exc-1', status: 'open' }],
        error: null,
      });
      const from = mockFrom({ orders: orderChain, order_exceptions: exceptionsChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canReleasePayout({ orderId: 'order-1' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/open exception/i);
    });

    it('returns allowed=true when order is completed with no open exceptions', async () => {
      const orderChain = makeChain({
        data: { id: 'order-1', engine_status: 'completed', payment_status: 'completed' },
        error: null,
      });
      const exceptionsChain = makeChain({ data: [], error: null });
      const from = mockFrom({ orders: orderChain, order_exceptions: exceptionsChain });
      const engine = new BusinessRulesEngine(makeClient(from));

      const result = await engine.canReleasePayout({ orderId: 'order-1' });

      expect(result.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // createBusinessRulesEngine factory
  // -------------------------------------------------------------------------
  describe('createBusinessRulesEngine', () => {
    it('returns a BusinessRulesEngine instance', () => {
      const client = { from: vi.fn() } as unknown as SupabaseClient;
      const engine = createBusinessRulesEngine(client);
      expect(engine).toBeInstanceOf(BusinessRulesEngine);
    });
  });
});
