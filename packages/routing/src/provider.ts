import type { DurationMatrix, Point, ProviderId, Route } from './types';

export interface RoutingProvider {
  readonly id: ProviderId;
  route(from: Point, to: Point): Promise<Route>;
  matrix(sources: Point[], targets: Point[]): Promise<DurationMatrix>;
}
