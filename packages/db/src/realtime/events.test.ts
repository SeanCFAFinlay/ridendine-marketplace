import { describe, expect, it } from 'vitest';
import {
  isKnownRealtimeEventId,
  parseBroadcastEnvelope,
  parseOrdersRealtimeRow,
} from './events';

describe('parseOrdersRealtimeRow', () => {
  it('accepts valid order event row', () => {
    const row = {
      id: 'o1',
      order_number: 'R-100',
      status: 'pending',
      total: 42.5,
      created_at: '2026-01-01T00:00:00Z',
      storefront_id: 'sf1',
    };
    expect(parseOrdersRealtimeRow(row)).toEqual({
      id: 'o1',
      order_number: 'R-100',
      status: 'pending',
      total: 42.5,
      created_at: '2026-01-01T00:00:00Z',
      storefront_id: 'sf1',
    });
  });

  it('rejects malformed event', () => {
    expect(parseOrdersRealtimeRow(null)).toBeNull();
    expect(parseOrdersRealtimeRow({})).toBeNull();
    expect(parseOrdersRealtimeRow({ id: 'x' })).toBeNull();
    expect(parseOrdersRealtimeRow({ id: 'x', order_number: 1 })).toBeNull();
  });

  it('rejects non-finite total', () => {
    expect(
      parseOrdersRealtimeRow({
        id: 'o',
        order_number: 'n',
        status: 'p',
        total: NaN,
        created_at: 't',
      })
    ).toBeNull();
  });
});

describe('parseBroadcastEnvelope', () => {
  it('parses nested broadcast payload', () => {
    const raw = {
      payload: {
        event: 'driver_location_updated',
        payload: { lat: 1, lng: 2 },
      },
    };
    expect(parseBroadcastEnvelope(raw)).toEqual({
      event: 'driver_location_updated',
      payload: { lat: 1, lng: 2 },
    });
  });

  it('returns null for malformed', () => {
    expect(parseBroadcastEnvelope(null)).toBeNull();
    expect(parseBroadcastEnvelope({ payload: 'no' })).toBeNull();
    expect(parseBroadcastEnvelope({ payload: { event: '', payload: {} } })).toBeNull();
  });
});

describe('isKnownRealtimeEventId', () => {
  it('ignores unknown event type safely', () => {
    expect(isKnownRealtimeEventId('order.created')).toBe(true);
    expect(isKnownRealtimeEventId('totally.unknown')).toBe(false);
  });
});
