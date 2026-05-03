import { describe, expect, it } from 'vitest';
import {
  sanitizePublicOrderBroadcastPayload,
  stripSensitiveCoordinateKeys,
} from './public-broadcast-sanitizer';

describe('sanitizePublicOrderBroadcastPayload', () => {
  it('keeps only whitelisted keys', () => {
    const out = sanitizePublicOrderBroadcastPayload({
      public_stage: 'on_the_way',
      eta_dropoff_at: '2026-01-01T00:00:00.000Z',
      route_progress_pct: 42,
      route_remaining_seconds: 600,
      route_to_dropoff_polyline: 'abc',
      driver_lat: 99,
      secret: 'nope',
    });
    expect(out).toEqual({
      public_stage: 'on_the_way',
      eta_dropoff_at: '2026-01-01T00:00:00.000Z',
      route_progress_pct: 42,
      route_remaining_seconds: 600,
      route_to_dropoff_polyline: 'abc',
    });
    expect(out).not.toHaveProperty('driver_lat');
    expect(out).not.toHaveProperty('secret');
  });

  it('drops coordinate keys even if mistakenly whitelisted name', () => {
    const out = sanitizePublicOrderBroadcastPayload({
      public_stage: 'cooking',
      lat: 1,
      lng: 2,
      driver_lng: 3,
      chef_lat: 4,
      storefront_lng: 5,
      position: { x: 1 },
      location: 'x',
      driverLocation: {},
      chefLocation: {},
    } as Record<string, unknown>);
    expect(out).toEqual({ public_stage: 'cooking' });
  });
});

describe('stripSensitiveCoordinateKeys', () => {
  it('removes forbidden keys from shallow objects', () => {
    const out = stripSensitiveCoordinateKeys({
      offerId: 'o1',
      lat: 1,
      driver_lng: 2,
      meta: { nested: 1 },
    } as Record<string, unknown>);
    expect(out).toEqual({ offerId: 'o1', meta: { nested: 1 } });
  });
});
