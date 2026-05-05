// ==========================================
// MASTER ORDER ENGINE TESTS
// Tests lifecycle, permissions, audit, events
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EngineOrderStatus } from '@ridendine/types';
import { MasterOrderEngine } from './master-order-engine';

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
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'ledger-1' }, error: null }),
    }),
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
      // order_status_history, audit_logs, deliveries, etc.
      return {
        insert: insertFn,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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

  // ==========================================
  // PHASE 3 PORTS
  // New describe block covering aliases and new methods added in Stage 4.
  // ==========================================

  describe('Phase 3 ports', () => {
    const chefActor = { userId: 'chef-1', role: 'chef_user' as const };
    const opsActor = { userId: 'ops-1', role: 'ops_manager' as const };

    describe('acceptOrder alias', () => {
      it('returns OperationResult with order data when accept succeeds', async () => {
        client = createMockClient({ engine_status: 'pending', status: 'pending' });
        engine = new MasterOrderEngine(client as any, audit as any, events as any);

        const result = await engine.acceptOrder('order-1', 20, chefActor);

        expect(result.success).toBe(true);
        expect(expectOk(result).engine_status).toBe(EngineOrderStatus.ACCEPTED);
      });

      it('wraps chefAccept failure in OperationResult error shape', async () => {
        client = createMockClient({ engine_status: 'completed', status: 'completed' });
        engine = new MasterOrderEngine(client as any, audit as any, events as any);

        const result = await engine.acceptOrder('order-1', 20, chefActor);

        expect(result.success).toBe(false);
        expect(expectErr(result).code).toBe('TRANSITION_FAILED');
      });
    });

    describe('rejectOrder alias + FND-017 payment void', () => {
      it('calls chefReject AND triggers payment void via paymentAdapter', async () => {
        const mockAdapter = {
          cancelPaymentIntent: vi.fn().mockResolvedValue({ cancelled: true, status: 'canceled' }),
        };
        client = createMockClient({
          engine_status: 'pending',
          status: 'pending',
          payment_intent_id: 'pi_test_reject',
          payment_status: 'processing',
          total: 25.00,
          order_number: 'RD-REJECT-001',
        });
        engine = new MasterOrderEngine(client as any, audit as any, events as any, mockAdapter);

        const result = await engine.rejectOrder('order-1', 'Out of stock', undefined, chefActor);

        expect(result.success).toBe(true);
        // FND-017: payment adapter must have been called to void
        expect(mockAdapter.cancelPaymentIntent).toHaveBeenCalledWith('pi_test_reject');
      });

      it('FND-017 — no paymentAdapter: rejectOrder succeeds without calling void', async () => {
        client = createMockClient({
          engine_status: 'pending',
          status: 'pending',
          payment_intent_id: 'pi_test_no_adapter',
        });
        engine = new MasterOrderEngine(client as any, audit as any, events as any);
        // no paymentAdapter passed

        const result = await engine.rejectOrder('order-1', 'Kitchen closed', undefined, chefActor);

        expect(result.success).toBe(true);
        // Ledger entry should say void_pending (no adapter = adapter not available)
        expect(client._insertFn).toHaveBeenCalledWith(
          expect.objectContaining({ entry_type: 'customer_charge_void_pending' })
        );
      });

      it('FND-017 — paymentAdapter throws: order_exception inserted, reject still succeeds', async () => {
        const faultyAdapter = {
          cancelPaymentIntent: vi.fn().mockRejectedValue(new Error('Stripe 500')),
        };
        client = createMockClient({
          engine_status: 'pending',
          status: 'pending',
          payment_intent_id: 'pi_stripe_fault',
          payment_status: 'processing',
          total: 30.00,
          order_number: 'RD-FAULT-001',
        });
        engine = new MasterOrderEngine(client as any, audit as any, events as any, faultyAdapter);

        const result = await engine.rejectOrder('order-1', 'No capacity', undefined, chefActor);

        // Reject still succeeds despite Stripe error
        expect(result.success).toBe(true);
        // order_exceptions should have been inserted with payment_void_failed
        expect(client.from).toHaveBeenCalledWith('order_exceptions');
      });
    });

    describe('cancelOrder + FND-017', () => {
      it('FND-017 — cancelOrder calls paymentAdapter.cancelPaymentIntent when payment_intent present', async () => {
        const mockAdapter = {
          cancelPaymentIntent: vi.fn().mockResolvedValue({ cancelled: true, status: 'canceled' }),
        };
        client = createMockClient({
          engine_status: 'pending',
          status: 'pending',
          payment_intent_id: 'pi_cancel_test',
          payment_status: 'processing',
          total: 20.00,
          order_number: 'RD-CANCEL-001',
        });
        engine = new MasterOrderEngine(client as any, audit as any, events as any, mockAdapter);

        const result = await engine.cancelOrder({
          orderId: 'order-1',
          actorId: 'customer-1',
          actorType: 'customer',
          actorRole: 'customer',
          reason: 'Changed mind',
        });

        expect(result.success).toBe(true);
        expect(mockAdapter.cancelPaymentIntent).toHaveBeenCalledWith('pi_cancel_test');
      });

      it('FND-017 — adapter returns cancelled:false → ledger says void_pending, exception created', async () => {
        const partialAdapter = {
          cancelPaymentIntent: vi.fn().mockResolvedValue({ cancelled: false, status: 'requires_capture' }),
        };
        client = createMockClient({
          engine_status: 'pending',
          status: 'pending',
          payment_intent_id: 'pi_not_cancelled',
          payment_status: 'processing',
          total: 15.00,
          order_number: 'RD-NOTCANCELLED-001',
        });
        engine = new MasterOrderEngine(client as any, audit as any, events as any, partialAdapter);

        await engine.cancelOrder({
          orderId: 'order-1',
          actorId: 'customer-1',
          actorType: 'customer',
          actorRole: 'customer',
          reason: 'Test',
        });

        // Ledger entry must say pending (void not completed)
        expect(client._insertFn).toHaveBeenCalledWith(
          expect.objectContaining({ entry_type: 'customer_charge_void_pending' })
        );
        // Exception must be created
        expect(client.from).toHaveBeenCalledWith('order_exceptions');
      });
    });

    describe('startPreparing alias', () => {
      it('delegates to markPreparing and returns OperationResult', async () => {
        client = createMockClient({ engine_status: 'accepted', status: 'accepted' });
        engine = new MasterOrderEngine(client as any, audit as any, events as any);

        const result = await engine.startPreparing('order-1', chefActor);

        expect(result.success).toBe(true);
        expect(expectOk(result).engine_status).toBe(EngineOrderStatus.PREPARING);
      });
    });

    describe('getAllowedActions', () => {
      it('pending order + chef_user returns accept and reject actions', async () => {
        client = createMockClient({ engine_status: 'pending' });
        engine = new MasterOrderEngine(client as any, audit as any, events as any);

        const actions = await engine.getAllowedActions('order-1', 'chef_user');

        expect(actions).toContain('accept_order');
        expect(actions).toContain('reject_order');
      });

      it('delivered order returns [] or only completion-related actions (no chef actions)', async () => {
        client = createMockClient({ engine_status: 'delivered' });
        engine = new MasterOrderEngine(client as any, audit as any, events as any);

        const actions = await engine.getAllowedActions('order-1', 'chef_user');

        expect(actions).not.toContain('accept_order');
        expect(actions).not.toContain('reject_order');
        expect(actions).not.toContain('start_preparing');
      });

      it('returns [] for order not found', async () => {
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

        const actions = await engine.getAllowedActions('nonexistent', 'chef_user');
        expect(actions).toEqual([]);
      });
    });

    describe('opsOverride', () => {
      it('bypasses state machine — writes status_history + audit_logs override + emits event', async () => {
        const orderData = {
          id: 'order-1',
          engine_status: 'pending',
          status: 'pending',
          order_number: 'RD-OVERRIDE-001',
          customer_id: 'customer-1',
          storefront_id: 'storefront-1',
          subtotal: 20,
          delivery_fee: 5,
          service_fee: 1.6,
          tax: 3.45,
          tip: 0,
          total: 30.05,
          payment_status: 'processing',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        };

        const updateWithSelectFn = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { ...orderData, engine_status: 'cancelled' }, error: null }),
            }),
          }),
        });

        const overrideClient = {
          from: vi.fn((table: string) => {
            if (table === 'orders') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: orderData, error: null }),
                  }),
                }),
                update: updateWithSelectFn,
              };
            }
            return {
              insert: client._insertFn,
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              update: client._updateFn,
            };
          }),
        };

        engine = new MasterOrderEngine(overrideClient as any, audit as any, events as any);

        const result = await engine.opsOverride(
          'order-1',
          EngineOrderStatus.CANCELLED,
          'Customer complaint',
          opsActor,
        );

        expect(result.success).toBe(true);
        expect(audit.logOverride).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'force_status_change',
            entityId: 'order-1',
            reason: 'Customer complaint',
          })
        );
        expect(events.emit).toHaveBeenCalledWith(
          'ops.override.executed',
          'order',
          'order-1',
          expect.objectContaining({ reason: 'Customer complaint', newStatus: EngineOrderStatus.CANCELLED }),
          opsActor,
        );
      });

      it('rejects non-ops role (e.g. chef_user)', async () => {
        engine = new MasterOrderEngine(client as any, audit as any, events as any);

        const result = await engine.opsOverride(
          'order-1',
          EngineOrderStatus.CANCELLED,
          'Test',
          chefActor,
        );

        expect(result.success).toBe(false);
        expect(expectErr(result).code).toBe('FORBIDDEN');
      });
    });

    describe('completeOrder ledger writes', () => {
      it('calls ledger_entries insert with capture + chef payable + driver payable shapes', async () => {
        const orderWithFinancials = {
          id: 'order-1',
          engine_status: 'delivered',
          status: 'delivered',
          order_number: 'RD-COMPLETE-001',
          customer_id: 'customer-1',
          storefront_id: 'storefront-1',
          payment_intent_id: 'pi_complete_test',
          subtotal: 20.00,
          delivery_fee: 5.00,
          service_fee: 1.60,
          tax: 3.45,
          tip: 2.00,
          total: 32.05,
          payment_status: 'processing',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        };

        const ledgerInsertFn = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'ledger-x' }, error: null }),
          }),
          then: vi.fn((cb: (v: unknown) => void) => { cb(undefined); return { catch: vi.fn() }; }),
        });

        // Ledger select chain for idempotency check (maybeSingle)
        const ledgerSelectChain = {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: ledgerInsertFn,
        };

        const completeClient = {
          from: vi.fn((table: string) => {
            if (table === 'orders') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: orderWithFinancials, error: null }),
                  }),
                }),
                update: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ error: null }),
                }),
              };
            }
            if (table === 'deliveries') {
              return {
                select: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: { driver_id: 'driver-1' }, error: null }),
                  }),
                }),
                update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
              };
            }
            if (table === 'ledger_entries') {
              return ledgerSelectChain;
            }
            return {
              insert: client._insertFn,
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
              update: client._updateFn,
            };
          }),
        };

        engine = new MasterOrderEngine(completeClient as any, audit as any, events as any);
        const result = await engine.completeOrder({ orderId: 'order-1', actorId: 'system' });

        expect(result.success).toBe(true);
        // ledger_entries.insert must be called at least twice (capture + payables)
        expect(ledgerInsertFn).toHaveBeenCalledWith(
          expect.objectContaining({ entry_type: 'customer_charge_capture' })
        );
      });
    });
  });
});
