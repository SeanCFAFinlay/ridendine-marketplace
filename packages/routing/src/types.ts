export type Point = { lat: number; lng: number };

export type Leg = {
  meters: number;
  seconds: number;
  from: Point;
  to: Point;
};

export type Route = {
  meters: number;
  seconds: number;
  polyline: string;
  legs: Leg[];
};

export type DurationMatrix = {
  sources: Point[];
  targets: Point[];
  /** durations[i][j] = seconds from sources[i] to targets[j] */
  durations: number[][];
};

export type ProviderId = 'osrm' | 'mapbox';
