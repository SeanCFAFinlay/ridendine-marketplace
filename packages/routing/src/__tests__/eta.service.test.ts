import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EtaService } from '../eta.service';
import type { RoutingProvider } from '../provider';
import type { Point, Route } from '../types';

function makeFakeProvider(routes: Route[]): RoutingProvider {
  let i = 0;
  return {
    id: 'osrm',
    async route(): Promise<Route> {
      const r = routes[Math.min(i++, routes.length - 1)]!;
      return {
        meters: r.meters,
        seconds: r.seconds,
        polyline: r.polyline,
        legs:
          r.legs.length > 0
            ? r.legs
            : [{ meters: r.meters, seconds: r.seconds, from: { lat: 0, lng: 0 }, to: { lat: 1, lng: 1 } }],
      };
    },
    async matrix(sources: Point[], targets: Point[]) {
      return {
        sources: [...sources],
        targets: [...targets],
        durations: sources.map((_, idx) => [idx + 10]),
      };
    },
  };
}

function chainMock(rows: Record<string, unknown>[]) {
  const state = { idx: 0 };
  const build = () => {
    const row = rows[state.idx] ?? rows[rows.length - 1]!;
    state.idx++;
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row, error: null }),
          single: async () => ({ data: row, error: null }),
        }),
        maybeSingle: async () => ({ data: row, error: null }),
      }),
    };
  };
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: build().select().eq().maybeSingle,
          single: build().select().eq().single,
        }),
      }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
    }),
  };
}

describe('EtaService', () => {
  it('computeInitial writes dropoff columns', async () => {
    const route: Route = {
      meters: 5000,
      seconds: 600,
      polyline: 'qqq',
      legs: [],
    };
    const provider = makeFakeProvider([route]);
    const updates: Record<string, unknown>[] = [];
    const db = {
      from: (table: string) => {
        if (table === 'orders') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'o1', storefront_id: 'sf1', delivery_address_id: 'a1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'deliveries') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'd1',
                    pickup_lat: 43.65,
                    pickup_lng: -79.4,
                    dropoff_lat: 43.7,
                    dropoff_lng: -79.45,
                  },
                  error: null,
                }),
              }),
            }),
            update: (payload: Record<string, unknown>) => {
              updates.push(payload);
              return {
                eq: () => Promise.resolve({ error: null }),
              };
            },
          };
        }
        if (table === 'chef_storefronts') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      },
    } as unknown as SupabaseClient;

    const eta = new EtaService(provider, db);
    await eta.computeInitial('o1');

    expect(updates[0]).toMatchObject({
      route_to_dropoff_polyline: 'qqq',
      route_to_dropoff_meters: 5000,
      route_to_dropoff_seconds: 600,
      routing_provider: 'osrm',
    });
    expect(updates[0]?.eta_dropoff_at).toBeDefined();
  });

  it('rankDrivers sorts by ascending seconds', async () => {
    const provider: RoutingProvider = {
      id: 'osrm',
      async route() {
        throw new Error('unused');
      },
      async matrix(sources: Point[]) {
        return {
          sources: [...sources],
          targets: [{ lat: 0, lng: 0 }],
          durations: [[100], [50], [200]],
        };
      },
    };

    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { pickup_lat: 43, pickup_lng: -79 },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const eta = new EtaService(provider, db);
    const ranked = await eta.rankDrivers('d1', [
      { driverId: 'a', point: { lat: 1, lng: 1 } },
      { driverId: 'b', point: { lat: 2, lng: 2 } },
      { driverId: 'c', point: { lat: 3, lng: 3 } },
    ]);
    expect(ranked.map((r) => r.driverId).join(',')).toBe('b,a,c');
  });
});
