// ==========================================
// MASTER ORDER ENGINE TESTS
// Tests lifecycle, permissions, audit, events
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EngineOrderStatus } from '@ridendine/types';
import { MasterOrderEngine } from './master-order-engine';

// Mock Supabase client
function createMockClient(orderData: Record<string, unknown> = {}) {
  const defaultOrder = {
    id: 'order-1',
    engine_status: 'pending',
    status: 'pending',
    customer_id: 'customer-1',
    storefront_id: 'storefront-1',
    payment_status: 'processing',
    payment_intent_id: 'pi_test_123',
    ...orderData,
  };

  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  const insertFn = vi.fn().mockReturnValue({
    then: vi.fn((cb: (v: unknown) => void) => { cb(undefined); return { catch: vi.fn() }; }),
  });

  return {
    from: vi.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: defaultOrder, error: null }),
            }),
          }),
          update: updateFn,
        };
      }
      // order_status_history, audit_logs
      return {
        insert: insertFn,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        update: updateFn,
      };
    }),
    _updateFn: updateFn,
    _insertFn: insertFn,
  };
}

function createMockAudit() {
  return {
    log: vi.fn().mockResolvedValue(null),
    logStatusChange: vi.fn(),
    logOverride: vi.fn(),
    getAuditTrail: vi.fn(),
  };
}

function createMockEvents() {
  return {
    emit: vi.fn(),
    flush: vi.fn(),
    getPendingEvents: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
  };
}

describe('MasterOrderEngine', () => {
  let client: ReturnType<typeof createMockClient>;
  let audit: ReturnType<typeof createMockAudit>;
  let events: ReturnType<typeof createMockEvents>;
  let engine: MasterOrderEngine;

  beforeEach(() => {
    client = createMockClient();
    audit = createMockAudit();
    events = createMockEvents();
    engine = new MasterOrderEngine(client as any, audit as any, events as any);
  });

  describe('valid full order lifecycle', () => {
    it('chef can accept a pending order', async () => {
      client = createMockClient({ engine_status: 'pending', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.chefAccept({
        orderId: 'order-1',
        actorId: 'chef-1',
        actorRole: 'chef_user',
      });

      expect(result.success).toBe(true);
      expect(result.order.engine_status).toBe(EngineOrderStatus.ACCEPTED);
    });

    it('chef can mark preparing after acceptance', async () => {
      client = createMockClient({ engine_status: 'accepted', status: 'accepted' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.markPreparing({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      expect(result.success).toBe(true);
      expect(result.order.engine_status).toBe(EngineOrderStatus.PREPARING);
    });

    it('chef can mark ready after preparing', async () => {
      client = createMockClient({ engine_status: 'preparing', status: 'preparing' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.markReadyForPickup({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      expect(result.success).toBe(true);
      expect(result.order.engine_status).toBe(EngineOrderStatus.READY);
    });

    it('system can complete a delivered order', async () => {
      client = createMockClient({ engine_status: 'delivered', status: 'delivered' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.completeOrder({
        orderId: 'order-1',
        actorId: 'system',
      });

      expect(result.success).toBe(true);
      expect(result.order.engine_status).toBe(EngineOrderStatus.COMPLETED);
    });
  });

  describe('invalid direct transition rejected', () => {
    it('rejects PENDING_PAYMENT -> PREPARING', async () => {
      client = createMockClient({ engine_status: 'checkout_pending', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.markPreparing({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid order transition');
    });

    it('rejects DRAFT -> COMPLETED', async () => {
      client = createMockClient({ engine_status: 'draft', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.completeOrder({
        orderId: 'order-1',
        actorId: 'system',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid order transition');
    });
  });

  describe('terminal state protected', () => {
    it('COMPLETED -> PREPARING must fail', async () => {
      client = createMockClient({ engine_status: 'completed', status: 'completed' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.markPreparing({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      expect(result.success).toBe(false);
    });

    it('CANCELLED -> ACCEPTED must fail', async () => {
      client = createMockClient({ engine_status: 'cancelled', status: 'cancelled' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.chefAccept({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      expect(result.success).toBe(false);
    });

    it('COMPLETED -> REFUNDED is allowed', async () => {
      client = createMockClient({ engine_status: 'completed', status: 'completed' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.refundOrder({
        orderId: 'order-1',
        actorId: 'ops-1',
        actorRole: 'ops_manager',
      });

      expect(result.success).toBe(true);
      expect(result.order.engine_status).toBe(EngineOrderStatus.REFUNDED);
    });
  });

  describe('chef permission enforced', () => {
    it('wrong actor role cannot accept order', async () => {
      client = createMockClient({ engine_status: 'pending', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.transitionOrder({
        orderId: 'order-1',
        action: 'accept_order',
        targetStatus: EngineOrderStatus.ACCEPTED,
        actorType: 'customer',
        actorId: 'customer-1',
        actorRole: 'customer',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not permitted');
    });

    it('driver cannot accept order (chef action)', async () => {
      client = createMockClient({ engine_status: 'pending', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.transitionOrder({
        orderId: 'order-1',
        action: 'accept_order',
        targetStatus: EngineOrderStatus.ACCEPTED,
        actorType: 'driver',
        actorId: 'driver-1',
        actorRole: 'driver',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not permitted');
    });
  });

  describe('audit log created for transition', () => {
    it('logs audit entry on successful transition', async () => {
      client = createMockClient({ engine_status: 'pending', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      await engine.chefAccept({
        orderId: 'order-1',
        actorId: 'chef-1',
        actorRole: 'chef_user',
      });

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'status_change',
          entityType: 'order',
          entityId: 'order-1',
          beforeState: expect.objectContaining({ engine_status: 'pending' }),
          afterState: expect.objectContaining({ engine_status: 'accepted' }),
        })
      );
    });

    it('does not log audit on failed transition', async () => {
      client = createMockClient({ engine_status: 'completed', status: 'completed' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      await engine.markPreparing({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  describe('status history created for transition', () => {
    it('inserts order_status_history on successful transition', async () => {
      client = createMockClient({ engine_status: 'pending', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      await engine.chefAccept({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      // Verify from was called with order_status_history
      expect(client.from).toHaveBeenCalledWith('order_status_history');
    });
  });

  describe('event emitted for transition', () => {
    it('emits event on successful transition', async () => {
      client = createMockClient({ engine_status: 'pending', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      await engine.chefAccept({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      expect(events.emit).toHaveBeenCalledWith(
        'order.accepted',
        'order',
        'order-1',
        expect.objectContaining({
          orderId: 'order-1',
          previousStatus: 'pending',
          nextStatus: 'accepted',
        }),
        expect.objectContaining({
          userId: 'chef-1',
        }),
      );
    });

    it('does not emit event on failed transition', async () => {
      client = createMockClient({ engine_status: 'completed', status: 'completed' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      await engine.markPreparing({
        orderId: 'order-1',
        actorId: 'chef-1',
      });

      expect(events.emit).not.toHaveBeenCalled();
    });
  });

  describe('order not found', () => {
    it('returns error when order does not exist', async () => {
      const emptyClient = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        })),
      };
      engine = new MasterOrderEngine(emptyClient as any, audit as any, events as any);

      const result = await engine.chefAccept({
        orderId: 'nonexistent',
        actorId: 'chef-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('cancel and refund flows', () => {
    it('customer can cancel a pending order', async () => {
      client = createMockClient({ engine_status: 'pending', status: 'pending' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.cancelOrder({
        orderId: 'order-1',
        actorId: 'customer-1',
        actorType: 'customer',
        actorRole: 'customer',
        reason: 'Changed my mind',
      });

      expect(result.success).toBe(true);
      expect(result.order.engine_status).toBe(EngineOrderStatus.CANCELLED);
    });

    it('customer cannot cancel a delivered order', async () => {
      client = createMockClient({ engine_status: 'delivered', status: 'delivered' });
      engine = new MasterOrderEngine(client as any, audit as any, events as any);

      const result = await engine.cancelOrder({
        orderId: 'order-1',
        actorId: 'customer-1',
        actorType: 'customer',
        actorRole: 'customer',
        reason: 'Too late',
      });

      expect(result.success).toBe(false);
    });
  });
});
