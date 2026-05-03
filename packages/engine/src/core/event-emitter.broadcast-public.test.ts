import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DomainEventEmitter } from './event-emitter';

function makeBroadcastClient() {
  const sends: Array<{ channel: string; msg: Record<string, unknown> }> = [];
  const makeCh = (name: string) => {
    const ch = {
      subscribe: vi.fn(),
      send: vi.fn(),
    };
    ch.send.mockImplementation(async (msg: Record<string, unknown>) => {
      sends.push({ channel: name, msg });
      return undefined;
    });
    ch.subscribe.mockImplementation((cb: (status: string) => void) => {
      queueMicrotask(() => cb('SUBSCRIBED'));
      return ch;
    });
    return ch;
  };
  return {
    channel: vi.fn((name: string) => makeCh(name)),
    removeChannel: vi.fn(),
    sends,
  };
}

describe('DomainEventEmitter.broadcastPublic', () => {
  let client: ReturnType<typeof makeBroadcastClient>;
  let emitter: DomainEventEmitter;

  beforeEach(() => {
    client = makeBroadcastClient();
    emitter = new DomainEventEmitter(client as any);
  });

  it('uses channel order:{orderId} and event order_update', async () => {
    await emitter.broadcastPublic('ord-1', {
      public_stage: 'on_the_way',
      eta_dropoff_at: '2026-05-02T12:00:00.000Z',
      route_progress_pct: 10,
      route_remaining_seconds: 120,
      route_to_dropoff_polyline: 'poly',
      driver_lat: 9,
      driver_lng: 8,
    });

    expect(client.channel).toHaveBeenCalledWith('order:ord-1', expect.any(Object));
    expect(client.sends.length).toBeGreaterThanOrEqual(1);
    const sent = client.sends.find((s) => s.channel === 'order:ord-1');
    expect(sent?.msg).toMatchObject({
      type: 'broadcast',
      event: 'order_update',
      payload: {
        public_stage: 'on_the_way',
        eta_dropoff_at: '2026-05-02T12:00:00.000Z',
        route_progress_pct: 10,
        route_remaining_seconds: 120,
        route_to_dropoff_polyline: 'poly',
      },
    });
    expect(sent?.msg.payload).not.toHaveProperty('driver_lat');
    expect(sent?.msg.payload).not.toHaveProperty('driver_lng');
  });

  it('broadcastDriverOffer uses driver channel and strips coords', async () => {
    await emitter.broadcastDriverOffer('drv-1', {
      attempt: 2,
      driver_lat: 1,
      lat: 2,
    });

    const sent = client.sends.find((s) => s.channel === 'driver:drv-1:offers');
    expect(sent?.msg).toMatchObject({
      type: 'broadcast',
      event: 'offer',
      payload: { attempt: 2 },
    });
    expect(sent?.msg.payload).not.toHaveProperty('driver_lat');
    expect(sent?.msg.payload).not.toHaveProperty('lat');
  });
});
