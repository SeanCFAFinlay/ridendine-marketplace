// ==========================================
// DOMAIN EVENT EMITTER TESTS
// TDD: correlation_id support
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DomainEventEmitter, createEventEmitter } from './event-emitter';
import { ActorRole } from '@ridendine/types';
import type { DomainEventType, ActorContext } from '@ridendine/types';

// Minimal Supabase client mock
function makeMockClient() {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const makeChannel = () => {
    const ch: {
      send: ReturnType<typeof vi.fn>;
      subscribe: ReturnType<typeof vi.fn>;
    } = {
      send: vi.fn().mockResolvedValue({}),
      subscribe: vi.fn(),
    };
    ch.subscribe.mockImplementation((cb: (status: string) => void) => {
      queueMicrotask(() => cb('SUBSCRIBED'));
      return ch;
    });
    return ch;
  };

  return {
    from: vi.fn(() => ({
      insert: insertMock,
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    })),
    channel: vi.fn(() => makeChannel()),
    removeChannel: vi.fn(),
    _insertMock: insertMock,
  };
}

const actor: ActorContext = {
  userId: 'user-1',
  role: ActorRole.CHEF_USER,
  entityId: 'chef-1',
};

const EVENT_TYPE = 'order.created' as DomainEventType;

describe('DomainEventEmitter - correlation_id injection', () => {
  let client: ReturnType<typeof makeMockClient>;
  let emitter: DomainEventEmitter;

  beforeEach(() => {
    client = makeMockClient();
    emitter = new DomainEventEmitter(client as any);
  });

  it('injects correlation_id equal to event.id when none provided', () => {
    const event = emitter.emit(EVENT_TYPE, 'order', 'ord-1', {}, actor);

    expect(event.payload.correlation_id).toBe(event.id);
  });

  it('preserves an existing correlation_id in the payload', () => {
    const event = emitter.emit(EVENT_TYPE, 'order', 'ord-2', { correlation_id: 'custom-corr' }, actor);

    expect(event.payload.correlation_id).toBe('custom-corr');
  });

  it('injects order_id from orderId field', () => {
    const event = emitter.emit(EVENT_TYPE, 'order', 'ord-3', { orderId: 'ORD-99' }, actor);

    expect(event.payload.order_id).toBe('ORD-99');
  });

  it('injects order_id from order_id field (snake_case)', () => {
    const event = emitter.emit(EVENT_TYPE, 'order', 'ord-4', { order_id: 'ORD-88' }, actor);

    expect(event.payload.order_id).toBe('ORD-88');
  });

  it('sets order_id to null when neither orderId nor order_id present', () => {
    const event = emitter.emit(EVENT_TYPE, 'order', 'ord-5', {}, actor);

    expect(event.payload.order_id).toBeNull();
  });

  it('injects delivery_id from deliveryId field', () => {
    const event = emitter.emit(EVENT_TYPE, 'delivery', 'del-1', { deliveryId: 'DEL-77' }, actor);

    expect(event.payload.delivery_id).toBe('DEL-77');
  });

  it('injects delivery_id from delivery_id field (snake_case)', () => {
    const event = emitter.emit(EVENT_TYPE, 'delivery', 'del-2', { delivery_id: 'DEL-66' }, actor);

    expect(event.payload.delivery_id).toBe('DEL-66');
  });

  it('sets delivery_id to null when neither deliveryId nor delivery_id present', () => {
    const event = emitter.emit(EVENT_TYPE, 'delivery', 'del-3', {}, actor);

    expect(event.payload.delivery_id).toBeNull();
  });

  it('does not change the method signature - all original fields still present', () => {
    const event = emitter.emit(EVENT_TYPE, 'order', 'ord-6', { foo: 'bar' }, actor);

    expect(event.id).toBeDefined();
    expect(event.type).toBe(EVENT_TYPE);
    expect(event.entityType).toBe('order');
    expect(event.entityId).toBe('ord-6');
    expect(event.actor).toEqual(actor);
    expect(event.timestamp).toBeDefined();
    expect(event.version).toBe(1);
    expect(event.payload.foo).toBe('bar');
  });
});

describe('DomainEventEmitter - setCorrelation / clearCorrelation', () => {
  let client: ReturnType<typeof makeMockClient>;
  let emitter: DomainEventEmitter;

  beforeEach(() => {
    client = makeMockClient();
    emitter = new DomainEventEmitter(client as any);
  });

  it('uses the set correlation context for subsequent events', () => {
    emitter.setCorrelation('shared-corr-id');

    const e1 = emitter.emit(EVENT_TYPE, 'order', 'ord-a', {}, actor);
    const e2 = emitter.emit(EVENT_TYPE, 'order', 'ord-b', {}, actor);

    expect(e1.payload.correlation_id).toBe('shared-corr-id');
    expect(e2.payload.correlation_id).toBe('shared-corr-id');
  });

  it('explicit payload correlation_id overrides setCorrelation context', () => {
    emitter.setCorrelation('ctx-corr');

    const event = emitter.emit(EVENT_TYPE, 'order', 'ord-c', { correlation_id: 'explicit' }, actor);

    expect(event.payload.correlation_id).toBe('explicit');
  });

  it('falls back to event.id after clearCorrelation', () => {
    emitter.setCorrelation('temp-corr');
    emitter.clearCorrelation();

    const event = emitter.emit(EVENT_TYPE, 'order', 'ord-d', {}, actor);

    expect(event.payload.correlation_id).toBe(event.id);
  });

  it('clearCorrelation is idempotent (no-op when already null)', () => {
    expect(() => {
      emitter.clearCorrelation();
      emitter.clearCorrelation();
    }).not.toThrow();
  });
});

describe('createEventEmitter factory', () => {
  it('returns a DomainEventEmitter instance with setCorrelation method', () => {
    const client = makeMockClient();
    const emitter = createEventEmitter(client as any);

    expect(typeof emitter.setCorrelation).toBe('function');
    expect(typeof emitter.clearCorrelation).toBe('function');
  });
});
