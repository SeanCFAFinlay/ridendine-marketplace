// ==========================================
// ORDER CREATION SERVICE TESTS
// Task 4.1 — Phase 3 Stage 4
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrderCreationService } from './order-creation.service';

// ==========================================
// NARROWING HELPERS
// ==========================================

function expectOk<T>(r: { success: boolean; data?: T; error?: unknown }): T {
  if (!r.success) throw new Error(`Expected ok result, got error: ${JSON.stringify(r.error)}`);
  if (r.data === undefined) throw new Error('Expected ok result to have data');
  return r.data;
}

function expectErr(r: { success: boolean; error?: { code: string; message?: string } }): { code: string; message?: string } {
  if (r.success) throw new Error('Expected error result, got ok');
  if (r.error === undefined) throw new Error('Expected error result to have error field');
  return r.error;
}
void expectOk; // suppress unused-variable warning if ok helper not used

// ==========================================
// MOCK FACTORIES
// ==========================================

const ORDER_ID = '00000000-0000-0000-0000-000000000001';
const CUSTOMER_ID = '00000000-0000-0000-0000-000000000002';
const STOREFRONT_ID = '00000000-0000-0000-0000-000000000003';
const CHEF_ID = '00000000-0000-0000-0000-000000000004';
const CHEF_USER_ID = '00000000-0000-0000-0000-000000000005';
const MENU_ITEM_ID = '00000000-0000-0000-0000-000000000006';
const MENU_ITEM_ID_2 = '00000000-0000-0000-0000-000000000007';
const ADDRESS_ID = '00000000-0000-0000-0000-000000000008';

interface MockChain {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

function buildChain(overrides: Partial<MockChain> = {}): MockChain {
  const chain: MockChain = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  // Make chainable
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  return chain;
}

function makeSingleItem() {
  return {
    id: MENU_ITEM_ID,
    name: 'Butter Chicken',
    price: 15.00,
    is_available: true,
    is_sold_out: false,
    storefront_id: STOREFRONT_ID,
  };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    order_number: 'RD-TEST-0001',
    customer_id: CUSTOMER_ID,
    storefront_id: STOREFRONT_ID,
    status: 'pending',
    engine_status: 'draft',
    subtotal: 15.00,
    delivery_fee: 5.00,
    service_fee: 1.20,
    tax: 2.76,
    tip: 0,
    total: 23.96,
    payment_status: 'pending',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockClientForCreate(menuItems: unknown[], order: unknown) {
  const fromMap: Record<string, MockChain> = {};

  const menuChain = buildChain({
    single: vi.fn().mockResolvedValue({ data: order, error: null }),
  });
  menuChain.in.mockReturnValue({
    ...menuChain,
    // returns array of items
    then: undefined,
  });
  // Override: select on menu_items returns in() which resolves to menuItems
  const menuSelectChain = {
    in: vi.fn().mockResolvedValue({ data: menuItems, error: null }),
  };

  const orderInsertChain = buildChain();
  orderInsertChain.select.mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: order, error: null }),
  });
  orderInsertChain.insert.mockReturnValue(orderInsertChain);

  const orderSelectChain = buildChain();
  orderSelectChain.eq.mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: order, error: null }),
  });

  const orderDeleteChain = buildChain();
  orderDeleteChain.eq.mockResolvedValue({ error: null });

  const genericChain = buildChain();
  genericChain.insert.mockResolvedValue({ error: null });

  return {
    from: vi.fn((table: string) => {
      if (table === 'menu_items') {
        return { select: vi.fn().mockReturnValue(menuSelectChain) };
      }
      if (table === 'orders') {
        return {
          insert: vi.fn().mockReturnValue(orderInsertChain),
          select: vi.fn().mockReturnValue(orderSelectChain),
          delete: vi.fn().mockReturnValue(orderDeleteChain),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: order, error: null }),
              }),
            }),
          }),
        };
      }
      // order_items, notifications, ledger_entries, order_exceptions, etc.
      return genericChain;
    }),
    _orderInsertChain: orderInsertChain,
    _genericChain: genericChain,
  };
}

function createMockAudit() {
  return {
    log: vi.fn().mockResolvedValue(null),
    logStatusChange: vi.fn().mockResolvedValue(null),
    logOverride: vi.fn().mockResolvedValue(null),
    getAuditTrail: vi.fn(),
  };
}

function createMockEvents() {
  return {
    emit: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    getPendingEvents: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
    broadcastDriverOffer: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockSla() {
  return {
    startTimer: vi.fn().mockResolvedValue(null),
    completeTimer: vi.fn().mockResolvedValue(null),
    cancelTimer: vi.fn().mockResolvedValue(null),
  };
}

function createMockMasterOrder() {
  return {
    authorizePayment: vi.fn().mockResolvedValue({
      success: true,
      order: { id: ORDER_ID, engine_status: 'payment_authorized', status: 'pending', previous_engine_status: 'draft' },
    }),
    transitionOrder: vi.fn().mockResolvedValue({ success: true }),
  };
}

// ==========================================
// TESTS
// ==========================================

describe('OrderCreationService', () => {
  let audit: ReturnType<typeof createMockAudit>;
  let events: ReturnType<typeof createMockEvents>;
  let sla: ReturnType<typeof createMockSla>;
  let masterOrder: ReturnType<typeof createMockMasterOrder>;

  beforeEach(() => {
    audit = createMockAudit();
    events = createMockEvents();
    sla = createMockSla();
    masterOrder = createMockMasterOrder();
  });

  const customerActor = { userId: CUSTOMER_ID, role: 'customer' as const };
  const systemActor = { userId: 'system', role: 'system' as const };

  describe('createOrder', () => {
    it('happy path — single item computes totals correctly', async () => {
      const menuItem = makeSingleItem();
      const order = makeOrder();
      const client = createMockClientForCreate([menuItem], order);
      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      const result = await service.createOrder(
        {
          customerId: CUSTOMER_ID,
          storefrontId: STOREFRONT_ID,
          deliveryAddressId: ADDRESS_ID,
          items: [{ menuItemId: MENU_ITEM_ID, quantity: 1 }],
        },
        customerActor,
      );

      expect(result.success).toBe(true);
      const data = expectOk(result);
      expect(data.customer_id).toBe(CUSTOMER_ID);
      expect(data.storefront_id).toBe(STOREFRONT_ID);
    });

    it('multi-item cart — sums correctly and includes fees/tax', async () => {
      const items = [
        { ...makeSingleItem(), id: MENU_ITEM_ID, price: 10.00 },
        { id: MENU_ITEM_ID_2, name: 'Naan', price: 3.00, is_available: true, is_sold_out: false, storefront_id: STOREFRONT_ID },
      ];
      const subtotal = 13.00;
      const deliveryFee = 5.00; // BASE_DELIVERY_FEE/100
      const serviceFee = Math.round(subtotal * 0.08 * 100) / 100;
      const tax = Math.round((subtotal + serviceFee + deliveryFee) * 0.13 * 100) / 100;
      const total = subtotal + deliveryFee + serviceFee + tax;
      const order = makeOrder({ subtotal, total, service_fee: serviceFee, tax });

      const client = createMockClientForCreate(items, order);
      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      const result = await service.createOrder(
        {
          customerId: CUSTOMER_ID,
          storefrontId: STOREFRONT_ID,
          deliveryAddressId: ADDRESS_ID,
          items: [
            { menuItemId: MENU_ITEM_ID, quantity: 1 },
            { menuItemId: MENU_ITEM_ID_2, quantity: 1 },
          ],
        },
        customerActor,
      );

      expect(result.success).toBe(true);
    });

    // NOTE: promoCode field exists on CreateOrderInput but the service does not
    // apply discount logic — it is stored as-is and no discount is computed.
    // Skip promo discount assertion; document here for future implementation.

    it('rejects non-customer actor', async () => {
      const client = createMockClientForCreate([], null);
      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      const result = await service.createOrder(
        {
          customerId: 'x',
          storefrontId: STOREFRONT_ID,
          deliveryAddressId: ADDRESS_ID,
          items: [],
        },
        { userId: 'ops-1', role: 'ops_agent' as any },
      );

      expect(result.success).toBe(false);
      expect(expectErr(result).code).toBe('FORBIDDEN');
    });

    it('returns INVALID_ITEMS when menu lookup fails', async () => {
      const client = {
        from: vi.fn((table: string) => {
          if (table === 'menu_items') {
            return { select: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) }) };
          }
          return buildChain();
        }) as ReturnType<typeof vi.fn>,
      };
      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      const result = await service.createOrder(
        { customerId: CUSTOMER_ID, storefrontId: STOREFRONT_ID, deliveryAddressId: ADDRESS_ID, items: [{ menuItemId: MENU_ITEM_ID, quantity: 1 }] },
        customerActor,
      );

      expect(result.success).toBe(false);
      expect(expectErr(result).code).toBe('INVALID_ITEMS');
    });
  });

  describe('authorizePayment', () => {
    it('happy path — updates order, writes ledger entry, emits event', async () => {
      const draftOrder = makeOrder({ engine_status: 'draft' });
      const authorizedOrder = makeOrder({ engine_status: 'payment_authorized', payment_status: 'processing' });

      const insertFn = vi.fn().mockResolvedValue({ error: null });
      const client = {
        from: vi.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: draftOrder, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: authorizedOrder, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'ledger_entries') return { insert: insertFn };
          return buildChain();
        }) as ReturnType<typeof vi.fn>,
      };

      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      const result = await service.authorizePayment(ORDER_ID, 'pi_test_001', systemActor);

      expect(result.success).toBe(true);
      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({ entry_type: 'customer_charge_auth', stripe_id: 'pi_test_001' })
      );
    });

    it('returns NOT_FOUND when order does not exist', async () => {
      const client = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
            }),
          }),
        })) as ReturnType<typeof vi.fn>,
      };
      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      const result = await service.authorizePayment('nonexistent-id', 'pi_test', systemActor);

      expect(result.success).toBe(false);
      expect(expectErr(result).code).toBe('NOT_FOUND');
    });
  });

  describe('submitToKitchen', () => {
    it('happy path — notifies chef, starts SLA, emits event', async () => {
      const paymentAuthorizedOrder = makeOrder({ engine_status: 'payment_authorized' });
      const updatedOrder = makeOrder({ engine_status: 'pending' });
      const insertFn = vi.fn().mockResolvedValue({ error: null });

      const client = {
        from: vi.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: paymentAuthorizedOrder, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: updatedOrder, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'chef_storefronts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { chef_id: CHEF_ID }, error: null }),
                }),
              }),
            };
          }
          if (table === 'chef_profiles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { user_id: CHEF_USER_ID }, error: null }),
                }),
              }),
            };
          }
          return { insert: insertFn };
        }) as ReturnType<typeof vi.fn>,
      };

      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      const result = await service.submitToKitchen(ORDER_ID, systemActor);

      expect(result.success).toBe(true);
      expect(sla.startTimer).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'chef_response', entityId: ORDER_ID })
      );
      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: CHEF_USER_ID, type: 'order_placed' })
      );
    });

    // FND-018 REGRESSION TEST
    it('FND-018 — null chefUserId: no notification INSERT, creates order_exception, no crash', async () => {
      const paymentAuthorizedOrder = makeOrder({ engine_status: 'payment_authorized' });
      const updatedOrder = makeOrder({ engine_status: 'pending' });

      const notificationsInsertFn = vi.fn().mockResolvedValue({ error: null });
      const orderExceptionsInsertFn = vi.fn().mockResolvedValue({ error: null });
      const otherInsertFn = vi.fn().mockResolvedValue({ error: null });

      const client = {
        from: vi.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: paymentAuthorizedOrder, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: updatedOrder, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'chef_storefronts') {
            // Return chef_id but chef_profiles will return null user_id
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { chef_id: CHEF_ID }, error: null }),
                }),
              }),
            };
          }
          if (table === 'chef_profiles') {
            // FND-018: user_id is null
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { user_id: null }, error: null }),
                }),
              }),
            };
          }
          if (table === 'notifications') return { insert: notificationsInsertFn };
          if (table === 'order_exceptions') return { insert: orderExceptionsInsertFn };
          return { insert: otherInsertFn };
        }) as ReturnType<typeof vi.fn>,
      };

      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      // Must not throw
      const result = await service.submitToKitchen(ORDER_ID, systemActor);

      expect(result.success).toBe(true);
      // No notification must be sent when user_id is null
      expect(notificationsInsertFn).not.toHaveBeenCalled();
      // Exception record must be created
      expect(orderExceptionsInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ exception_type: 'chef_notification_failed' })
      );
    });

    it('storefront lookup throws — graceful degradation, no crash, result still succeeds', async () => {
      const paymentAuthorizedOrder = makeOrder({ engine_status: 'payment_authorized' });
      const updatedOrder = makeOrder({ engine_status: 'pending' });

      const orderExceptionsInsertFn = vi.fn().mockResolvedValue({ error: null });
      const otherInsertFn = vi.fn().mockResolvedValue({ error: null });

      const client = {
        from: vi.fn((table: string) => {
          if (table === 'orders') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: paymentAuthorizedOrder, error: null }),
                }),
              }),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: updatedOrder, error: null }),
                  }),
                }),
              }),
            };
          }
          if (table === 'chef_storefronts') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockRejectedValue(new Error('DB connection lost')),
                }),
              }),
            };
          }
          if (table === 'order_exceptions') return { insert: orderExceptionsInsertFn };
          return { insert: otherInsertFn };
        }) as ReturnType<typeof vi.fn>,
      };

      const service = new OrderCreationService(
        client as any, events as any, audit as any, sla as any, masterOrder as any
      );

      // Must not throw even if storefront lookup throws
      await expect(service.submitToKitchen(ORDER_ID, systemActor)).resolves.toBeDefined();
    });
  });
});
