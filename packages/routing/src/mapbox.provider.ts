import type { RoutingProvider } from './provider';
import type { DurationMatrix, Point, Route } from './types';

export class MapboxRoutingError extends Error {
  constructor() {
    super('Mapbox routing provider is not implemented');
    this.name = 'MapboxRoutingError';
  }
}

/**
 * Stub for a future Mapbox Directions / Matrix implementation.
 * Does not read env vars; throws on every call.
 */
export class MapboxProvider implements RoutingProvider {
  readonly id = 'mapbox' as const;

  async route(_from: Point, _to: Point): Promise<Route> {
    throw new MapboxRoutingError();
  }

  async matrix(_sources: Point[], _targets: Point[]): Promise<DurationMatrix> {
    throw new MapboxRoutingError();
  }
}
