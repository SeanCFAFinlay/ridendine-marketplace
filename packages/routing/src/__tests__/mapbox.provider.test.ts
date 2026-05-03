import { describe, expect, it } from 'vitest';
import { MapboxProvider, MapboxRoutingError } from '../mapbox.provider';

describe('MapboxProvider', () => {
  it('throws clear not-implemented error', async () => {
    const p = new MapboxProvider();
    await expect(p.route({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })).rejects.toThrow(MapboxRoutingError);
    await expect(p.matrix([], [])).rejects.toThrow(/not implemented/i);
  });
});
