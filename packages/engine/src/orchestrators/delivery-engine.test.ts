// ==========================================
// DELIVERY ENGINE TESTS
// Tests delivery lifecycle, permissions, audit, events
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EngineDeliveryStatus } from '@ridendine/types';
import { DeliveryEngine } from './delivery-engine';
import { MasterOrderEngine } from './master-order-engine';

function createMockClient(deliveryData: Record<string, unknown> = {}) {
  const defaultDelivery = {
    id: 'delivery-1',
    order_id: 'order-1',
    driver_id: null,
    status: 'pending',
    ...deliveryData,
  };

  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const insertFn = vi.fn().mockReturnValue({
    then: vi.fn((cb: (v: unknown) => void) => { cb(undefined); return { catch: vi.fn() }; }),
  });

  return {
    from: vi.fn((table: string) => {
      if (table === 'deliveries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: defaultDelivery, error: null }),
            }),
          }),
          update: updateFn,
        };
      }
      return {
        insert: insertFn,
        update: updateFn,
      };
    }),
  };
}

function createMockAudit() {
  return { log: vi.fn().mockResolvedValue(null) };
}

function createMockEvents() {
  return { emit: vi.fn(), flush: vi.fn() };
}

function createMockMasterOrderEngine() {
  return {
    syncFromDelivery: vi.fn().mockResolvedValue({ success: true }),
    transitionOrder: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as MasterOrderEngine;
}

describe('DeliveryEngine', () => {
  let client: ReturnType<typeof createMockClient>;
  let audit: ReturnType<typeof createMockAudit>;
  let events: ReturnType<typeof createMockEvents>;
  let masterOrder: MasterOrderEngine;
  let engine: DeliveryEngine;

  beforeEach(() => {
    client = createMockClient();
    audit = createMockAudit();
    events = createMockEvents();
    masterOrder = createMockMasterOrderEngine();
    engine = new DeliveryEngine(client as any, audit as any, events as any, masterOrder);
  });

  describe('valid delivery lifecycle', () => {
    it('can offer delivery to driver', async () => {
      const result = await engine.offerDeliveryToDriver({
        deliveryId: 'delivery-1',
        actorId: 'system',
        driverId: 'driver-1',
      });

      expect(result.success).toBe(true);
      expect(result.delivery.status).toBe(EngineDeliveryStatus.OFFERED);
    });

    it('driver can accept delivery', async () => {
      client = createMockClient({ status: 'offered' });
      engine = new DeliveryEngine(client as any, audit as any, events as any, masterOrder);

      const result = await engine.driverAcceptDelivery({
        deliveryId: 'delivery-1',
        actorId: 'driver-1',
        driverId: 'driver-1',
      });

      expect(result.success).toBe(true);
      expect(result.delivery.status).toBe(EngineDeliveryStatus.ACCEPTED);
    });

    it('driver can mark en route to pickup', async () => {
      client = createMockClient({ status: 'assigned' }); // legacy 'assigned' maps to ACCEPTED
      engine = new DeliveryEngine(client as any, audit as any, events as any, masterOrder);

      const result = await engine.markEnRouteToPickup({
        deliveryId: 'delivery-1',
        actorId: 'driver-1',
      });

      expect(result.success).toBe(true);
      expect(result.delivery.status).toBe(EngineDeliveryStatus.EN_ROUTE_TO_PICKUP);
    });

    it('driver can mark delivered', async () => {
      client = createMockClient({ status: 'arrived_at_dropoff' }); // maps to ARRIVED_AT_CUSTOMER
      engine = new DeliveryEngine(client as any, audit as any, events as any, masterOrder);

      const result = await engine.markDelivered({
        deliveryId: 'delivery-1',
        actorId: 'driver-1',
      });

      expect(result.success).toBe(true);
      expect(result.delivery.status).toBe(EngineDeliveryStatus.DELIVERED);
    });
  });

  describe('driver permission enforced', () => {
    it('customer cannot accept delivery', async () => {
      client = createMockClient({ status: 'offered' });
      engine = new DeliveryEngine(client as any, audit as any, events as any, masterOrder);

      const result = await engine.transitionDelivery({
        deliveryId: 'delivery-1',
        action: 'accept_delivery',
        targetStatus: EngineDeliveryStatus.ACCEPTED,
        actorType: 'customer',
        actorId: 'customer-1',
        actorRole: 'customer',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not permitted');
    });

    it('chef cannot mark delivery as picked up', async () => {
      client = createMockClient({ status: 'arrived_at_pickup' });
      engine = new DeliveryEngine(client as any, audit as any, events as any, masterOrder);

      const result = await engine.transitionDelivery({
        deliveryId: 'delivery-1',
        action: 'mark_picked_up',
        targetStatus: EngineDeliveryStatus.PICKED_UP,
        actorType: 'chef',
        actorId: 'chef-1',
        actorRole: 'chef_user',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not permitted');
    });
  });

  describe('invalid transitions rejected', () => {
    it('cannot skip to delivered from unassigned', async () => {
      const result = await engine.markDelivered({
        deliveryId: 'delivery-1',
        actorId: 'driver-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid delivery transition');
    });
  });

  describe('audit and events', () => {
    it('creates audit log on delivery transition', async () => {
      const result = await engine.offerDeliveryToDriver({
        deliveryId: 'delivery-1',
        actorId: 'system',
        driverId: 'driver-1',
      });

      expect(result.success).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'status_change',
          entityType: 'delivery',
          entityId: 'delivery-1',
        })
      );
    });

    it('emits event on delivery transition', async () => {
      await engine.offerDeliveryToDriver({
        deliveryId: 'delivery-1',
        actorId: 'system',
        driverId: 'driver-1',
      });

      expect(events.emit).toHaveBeenCalledWith(
        'delivery.offered',
        'delivery',
        'delivery-1',
        expect.objectContaining({
          deliveryId: 'delivery-1',
          orderId: 'order-1',
        }),
        expect.any(Object),
      );
    });
  });

  describe('order sync', () => {
    it('syncs order status when delivery picked up', async () => {
      client = createMockClient({ status: 'arrived_at_pickup' });
      engine = new DeliveryEngine(client as any, audit as any, events as any, masterOrder);

      await engine.markPickedUp({
        deliveryId: 'delivery-1',
        actorId: 'driver-1',
      });

      expect(masterOrder.syncFromDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          targetOrderStatus: 'picked_up',
        })
      );
    });

    it('syncs order status when delivery delivered', async () => {
      client = createMockClient({ status: 'arrived_at_dropoff' });
      engine = new DeliveryEngine(client as any, audit as any, events as any, masterOrder);

      await engine.markDelivered({
        deliveryId: 'delivery-1',
        actorId: 'driver-1',
      });

      expect(masterOrder.syncFromDelivery).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          targetOrderStatus: 'delivered',
        })
      );
    });
  });
});
