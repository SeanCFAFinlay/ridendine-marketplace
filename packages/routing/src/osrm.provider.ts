import type { RoutingProvider } from './provider';
import type { DurationMatrix, Point, Route } from './types';

const DEFAULT_BASE = 'https://router.project-osrm.org';
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class OsrmRoutingError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = 'OsrmRoutingError';
  }
}

function assertValidPoint(p: Point, label: string): void {
  if (
    typeof p.lat !== 'number' ||
    typeof p.lng !== 'number' ||
    !Number.isFinite(p.lat) ||
    !Number.isFinite(p.lng)
  ) {
    throw new OsrmRoutingError(`Invalid coordinates for ${label}: lat/lng must be finite numbers`);
  }
  if (p.lat < -90 || p.lat > 90 || p.lng < -180 || p.lng > 180) {
    throw new OsrmRoutingError(`Invalid coordinates for ${label}: out of WGS84 range`);
  }
}

export type OsrmProviderOptions = {
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
};

export class OsrmProvider implements RoutingProvider {
  readonly id = 'osrm' as const;

  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;

  constructor(opts: OsrmProviderOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '');
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retries = opts.retries ?? DEFAULT_RETRIES;
  }

  async route(from: Point, to: Point): Promise<Route> {
    assertValidPoint(from, 'from');
    assertValidPoint(to, 'to');

    const path = `/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline`;
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchWithRetry(url);
    if (!res.ok) {
      throw new OsrmRoutingError(`OSRM route HTTP ${res.status}`, String(res.status));
    }
    const json = (await res.json()) as OsrmRouteResponse;
    if (json.code !== 'Ok' || !json.routes?.[0]) {
      throw new OsrmRoutingError(`OSRM route error: ${json.code ?? 'unknown'}`, json.code);
    }
    const r = json.routes[0];
    const leg: Route['legs'][number] = {
      meters: r.distance ?? 0,
      seconds: r.duration ?? 0,
      from: { lat: from.lat, lng: from.lng },
      to: { lat: to.lat, lng: to.lng },
    };
    return {
      meters: r.distance ?? 0,
      seconds: r.duration ?? 0,
      polyline: r.geometry ?? '',
      legs: [leg],
    };
  }

  async matrix(sources: Point[], targets: Point[]): Promise<DurationMatrix> {
    if (!sources.length || !targets.length) {
      return { sources: [...sources], targets: [...targets], durations: [] };
    }
    for (const [i, p] of sources.entries()) assertValidPoint(p, `sources[${i}]`);
    for (const [i, p] of targets.entries()) assertValidPoint(p, `targets[${i}]`);

    const coords = [...sources, ...targets]
      .map((p) => `${p.lng},${p.lat}`)
      .join(';');

    const sourceIdx = sources.map((_, i) => i).join(';');
    const destIdx = targets.map((_, j) => sources.length + j).join(';');

    const path = `/table/v1/driving/${coords}?annotations=duration&sources=${sourceIdx}&destinations=${destIdx}`;
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchWithRetry(url);
    if (!res.ok) {
      throw new OsrmRoutingError(`OSRM table HTTP ${res.status}`, String(res.status));
    }
    const json = (await res.json()) as OsrmTableResponse;
    if (json.code !== 'Ok' || !json.durations) {
      throw new OsrmRoutingError(`OSRM table error: ${json.code ?? 'unknown'}`, json.code);
    }

    return {
      sources: [...sources],
      targets: [...targets],
      durations: json.durations.map((row) => row.map((v) => (v == null || !Number.isFinite(v) ? 0 : v))),
    };
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let last: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (res.status === 429 || res.status >= 500) {
          last = new OsrmRoutingError(`OSRM transient HTTP ${res.status}`);
          await sleep(250 * (attempt + 1));
          continue;
        }
        return res;
      } catch (e) {
        clearTimeout(timer);
        last = e;
        if (attempt < this.retries) await sleep(250 * (attempt + 1));
      }
    }
    throw last instanceof Error ? last : new OsrmRoutingError('OSRM request failed');
  }
}

type OsrmRouteResponse = {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: string;
    legs: Array<{
      steps?: Array<{ maneuver?: { location?: [number, number] } }>;
    }>;
  }>;
};

type OsrmTableResponse = {
  code: string;
  durations?: number[][];
};
