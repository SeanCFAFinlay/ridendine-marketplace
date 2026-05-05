// ==========================================
// DELIVERY ENGINE — driver ownership / transition guards
// Updated (Stage 3): DispatchEngine removed; tests now use DeliveryEngine.
// ==========================================

import { describe, expect, it, vi } from 'vitest';
import { DeliveryEngine } from './delivery-engine';

function createDeliveryDeps() {
  return {
    audit: { logStatusChange: vi.fn().mockResolvedValue(undefined), log: vi.fn().mockResolvedValue(undefined) },
    events: { emit: vi.fn(), flush: vi.fn().mockResolvedValue(undefined) },
    sla: {
      startTimer: vi.fn().mockResolvedValue(undefined),
      completeTimer: vi.fn().mockResolvedValue(undefined),
    },
    masterOrder: {
      syncFromDelivery: vi.fn().mockResolvedValue({ success: true }),
    },
  };
}

describe('DeliveryEngine driver guards', () => {
  it('updateDeliveryStatus returns FORBIDDEN when driver user does not own delivery', async () => {
    const deps = createDeliveryDeps();
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'deliveries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'del-1',
                    driver_id: 'driver-correct',
                    status: 'assigned',
                    order_id: 'ord-1',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'drivers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'driver-other' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    const engine = new DeliveryEngine(
      client as any,
      deps.audit as any,
      deps.events as any,
      deps.masterOrder as any,
      deps.sla as any
    );

    const result = await engine.updateDeliveryStatus('del-1', 'en_route_to_pickup', {
      userId: 'user-1',
      role: 'driver',
      entityId: 'driver-other',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error?.code).toBe('FORBIDDEN');
    }
  });
});
