import { describe, expect, it, vi, afterEach } from 'vitest';
import { OsrmProvider, OsrmRoutingError } from '../osrm.provider';

describe('OsrmProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('formats route URL as /route/v1/driving/{lng},{lat};{lng},{lat}', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        return new Response(
          JSON.stringify({
            code: 'Ok',
            routes: [
              {
                distance: 1200,
                duration: 180,
                geometry: 'abc',
                legs: [{ steps: [] }],
              },
            ],
          }),
          { status: 200 }
        );
      })
    );

    const p = new OsrmProvider({ timeoutMs: 5000, retries: 0 });
    const route = await p.route({ lat: 43.65, lng: -79.38 }, { lat: 43.7, lng: -79.4 });

    expect(calls[0]).toContain('/route/v1/driving/-79.38,43.65;-79.4,43.7');
    expect(calls[0]).toContain('overview=full');
    expect(calls[0]).toContain('geometries=polyline');
    expect(route.meters).toBe(1200);
    expect(route.seconds).toBe(180);
    expect(route.polyline).toBe('abc');
  });

  it('formats matrix URL with sources and destinations indices', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        return new Response(
          JSON.stringify({
            code: 'Ok',
            durations: [
              [60, 120],
              [90, 30],
            ],
          }),
          { status: 200 }
        );
      })
    );

    const p = new OsrmProvider({ retries: 0 });
    const sources = [
      { lat: 43.6, lng: -79.5 },
      { lat: 43.61, lng: -79.51 },
    ];
    const targets = [{ lat: 43.65, lng: -79.4 }];
    await p.matrix(sources, targets);

    expect(calls[0]).toContain('/table/v1/driving/');
    expect(calls[0]).toContain('sources=');
    expect(calls[0]).toContain('destinations=2');
  });

  it('retries on 429 then succeeds', async () => {
    let n = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        n++;
        if (n === 1) return new Response('{}', { status: 429 });
        return new Response(
          JSON.stringify({
            code: 'Ok',
            routes: [{ distance: 100, duration: 10, geometry: 'x', legs: [] }],
          }),
          { status: 200 }
        );
      })
    );

    const p = new OsrmProvider({ retries: 2, timeoutMs: 3000 });
    const route = await p.route({ lat: 1, lng: 2 }, { lat: 1.01, lng: 2.01 });
    expect(route.meters).toBe(100);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects invalid coordinates', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const p = new OsrmProvider({ retries: 0 });
    await expect(p.route({ lat: 200, lng: 0 }, { lat: 0, lng: 0 })).rejects.toBeInstanceOf(OsrmRoutingError);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
