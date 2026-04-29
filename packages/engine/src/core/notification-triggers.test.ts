// ==========================================
// NOTIFICATION TRIGGERS TESTS
// TDD: Domain event → notification mapping
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationTriggers, createNotificationTriggers } from './notification-triggers';
import type { NotificationSender } from './notification-sender';

function createMockSender(): NotificationSender {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    registerProvider: vi.fn(),
    providers: [],
  } as unknown as NotificationSender;
}

function createMockClient(overrides?: {
  orderData?: Record<string, unknown> | null;
  storefrontData?: Record<string, unknown> | null;
  driverData?: Record<string, unknown> | null;
  insertError?: string | null;
}) {
  const orderData = overrides?.orderData !== undefined
    ? overrides.orderData
    : { customer_id: 'cust-1' };
  const storefrontData = overrides?.storefrontData !== undefined
    ? overrides.storefrontData
    : { chef_profiles: { user_id: 'chef-user-1' } };
  const driverData = overrides?.driverData !== undefined
    ? overrides.driverData
    : { user_id: 'driver-user-1' };
  const insertError = overrides?.insertError ?? null;

  const insertMock = vi.fn().mockResolvedValue({ error: insertError });

  const fromMock = vi.fn((table: string) => {
    if (table === 'orders') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: orderData, error: null }),
      };
    }
    if (table === 'chef_storefronts') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: storefrontData, error: null }),
      };
    }
    if (table === 'driver_profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: driverData, error: null }),
      };
    }
    if (table === 'notifications') {
      return { insert: insertMock };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: insertMock,
    };
  });

  return { from: fromMock, _insertMock: insertMock };
}

describe('NotificationTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- factory ----

  it('createNotificationTriggers returns a NotificationTriggers instance', () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = createNotificationTriggers(client as any, sender);
    expect(triggers).toBeInstanceOf(NotificationTriggers);
  });

  // ---- onOrderCreated ----

  it('onOrderCreated sends order_placed to customer', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onOrderCreated({
      orderId: 'ord-1',
      customerName: 'Alice',
      storefrontId: 'sf-1',
      orderNumber: 'RD-001',
    });

    expect(sender.send).toHaveBeenCalledWith(
      'order_placed',
      'cust-1',
      expect.objectContaining({ orderNumber: 'RD-001' }),
      expect.anything(),
    );
  });

  it('onOrderCreated sends order_placed notification to chef', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onOrderCreated({
      orderId: 'ord-1',
      customerName: 'Alice',
      storefrontId: 'sf-1',
      orderNumber: 'RD-001',
    });

    const calls = (sender.send as ReturnType<typeof vi.fn>).mock.calls;
    const chefCall = calls.find((c: unknown[]) => c[1] === 'chef-user-1');
    expect(chefCall).toBeDefined();
    expect(chefCall![0]).toBe('order_placed');
  });

  it('onOrderCreated does not throw if DB lookup fails', async () => {
    const client = createMockClient({ orderData: null });
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await expect(
      triggers.onOrderCreated({
        orderId: 'ord-bad',
        customerName: 'Alice',
        storefrontId: 'sf-1',
        orderNumber: 'RD-999',
      }),
    ).resolves.not.toThrow();
  });

  // ---- onChefAccepted ----

  it('onChefAccepted sends order_accepted to customer', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onChefAccepted({
      orderId: 'ord-1',
      customerId: 'cust-1',
      orderNumber: 'RD-001',
    });

    expect(sender.send).toHaveBeenCalledWith(
      'order_accepted',
      'cust-1',
      expect.objectContaining({ orderNumber: 'RD-001' }),
      expect.anything(),
    );
  });

  // ---- onChefRejected ----

  it('onChefRejected sends order_rejected to customer', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onChefRejected({
      orderId: 'ord-1',
      customerId: 'cust-1',
      orderNumber: 'RD-001',
      reason: 'Closed for the day',
    });

    expect(sender.send).toHaveBeenCalledWith(
      'order_rejected',
      'cust-1',
      expect.objectContaining({ orderNumber: 'RD-001' }),
      expect.anything(),
    );
  });

  // ---- onOrderReady ----

  it('onOrderReady sends order_ready to customer', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onOrderReady({
      orderId: 'ord-1',
      customerId: 'cust-1',
      orderNumber: 'RD-001',
    });

    expect(sender.send).toHaveBeenCalledWith(
      'order_ready',
      'cust-1',
      expect.objectContaining({ orderNumber: 'RD-001' }),
      expect.anything(),
    );
  });

  // ---- onDriverOffered ----

  it('onDriverOffered looks up driver user_id and sends delivery_offer', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onDriverOffered({
      deliveryId: 'del-1',
      driverId: 'drv-profile-1',
      storefrontName: 'Chef Alice Kitchen',
      pickupAddress: '123 Main St',
    });

    expect(sender.send).toHaveBeenCalledWith(
      'delivery_offer',
      'driver-user-1',
      expect.objectContaining({ storefrontName: 'Chef Alice Kitchen' }),
      expect.anything(),
    );
  });

  it('onDriverOffered does not throw if driver lookup fails', async () => {
    const client = createMockClient({ driverData: null });
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await expect(
      triggers.onDriverOffered({
        deliveryId: 'del-1',
        driverId: 'drv-bad',
        storefrontName: 'Kitchen',
        pickupAddress: '123 Main St',
      }),
    ).resolves.not.toThrow();
  });

  // ---- onDriverAssigned ----

  it('onDriverAssigned sends order_picked_up notification to customer', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onDriverAssigned({
      orderId: 'ord-1',
      customerId: 'cust-1',
      driverName: 'Bob',
    });

    expect(sender.send).toHaveBeenCalledWith(
      'order_picked_up',
      'cust-1',
      expect.objectContaining({ driverName: 'Bob' }),
      expect.anything(),
    );
  });

  // ---- onOrderDelivered ----

  it('onOrderDelivered sends order_delivered to customer', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onOrderDelivered({
      orderId: 'ord-1',
      customerId: 'cust-1',
      orderNumber: 'RD-001',
    });

    expect(sender.send).toHaveBeenCalledWith(
      'order_delivered',
      'cust-1',
      expect.objectContaining({ orderNumber: 'RD-001' }),
      expect.anything(),
    );
  });

  // ---- onOrderCancelled ----

  it('onOrderCancelled inserts a notification directly to DB', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onOrderCancelled({
      orderId: 'ord-1',
      customerId: 'cust-1',
      orderNumber: 'RD-001',
      reason: 'Chef unavailable',
    });

    expect(client._insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'cust-1',
        type: 'order_cancelled',
        data: expect.objectContaining({ order_id: 'ord-1' }),
      }),
    );
  });

  it('onOrderCancelled does not throw on DB insert error', async () => {
    const client = createMockClient({ insertError: 'DB error' });
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await expect(
      triggers.onOrderCancelled({
        orderId: 'ord-1',
        customerId: 'cust-1',
        orderNumber: 'RD-001',
        reason: 'Chef unavailable',
      }),
    ).resolves.not.toThrow();
  });

  // ---- onRefundProcessed ----

  it('onRefundProcessed inserts a refund_processed notification to DB', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    const triggers = new NotificationTriggers(client as any, sender);

    await triggers.onRefundProcessed({
      orderId: 'ord-1',
      customerId: 'cust-1',
      orderNumber: 'RD-001',
      amount: 19.99,
    });

    expect(client._insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'cust-1',
        type: 'refund_processed',
        data: expect.objectContaining({ order_id: 'ord-1' }),
      }),
    );
  });

  // ---- best-effort: sender.send throws ----

  it('does not throw when sender.send rejects', async () => {
    const client = createMockClient();
    const sender = createMockSender();
    (sender.send as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('send failed'));
    const triggers = new NotificationTriggers(client as any, sender);

    await expect(
      triggers.onChefAccepted({
        orderId: 'ord-1',
        customerId: 'cust-1',
        orderNumber: 'RD-001',
      }),
    ).resolves.not.toThrow();
  });
});
