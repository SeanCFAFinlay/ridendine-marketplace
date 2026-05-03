/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from '../app/api/location/route';

const refreshFromDriverPing = jest.fn().mockResolvedValue({
  progressPct: 12,
  remainingSeconds: 90,
  etaDropoffAt: new Date('2026-06-15T10:00:00.000Z'),
});
const broadcastPublic = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/engine', () => ({
  getDriverActorContext: jest.fn().mockResolvedValue({
    driverId: 'driver-self',
    actor: { userId: 'u1', role: 'driver', entityId: 'driver-self' },
  }),
  getEngine: jest.fn(() => ({
    eta: { refreshFromDriverPing },
    events: { broadcastPublic },
  })),
  errorResponse: (code: string, message: string, status = 400) =>
    new Response(JSON.stringify({ success: false, error: { code, message } }), { status }),
  successResponse: (data: unknown, status = 200) =>
    new Response(JSON.stringify({ success: true, data }), { status }),
}));

jest.mock('@ridendine/utils', () => ({
  evaluateRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  isPlausibleClientIsoTime: jest.fn().mockReturnValue(true),
  RATE_LIMIT_POLICIES: { driverLocation: {}, auth: {} },
  rateLimitPolicyResponse: jest.fn(),
}));

const DELIVERY_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/** First deliveries.maybeSingle uses this for ownership check */
let deliveryOwnerId = 'driver-self';
let deliveriesPhase = 0;

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'driver_presence') {
        return { upsert: jest.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'driver_locations') {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'delivery_tracking_events') {
        return { insert: jest.fn().mockResolvedValue({ error: null }) };
      }
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { public_stage: 'on_the_way' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'deliveries') {
        deliveriesPhase += 1;
        if (deliveriesPhase === 1) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: DELIVERY_UUID, driver_id: deliveryOwnerId },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (deliveriesPhase === 2) {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: DELIVERY_UUID,
                      driver_id: 'driver-self',
                      status: 'picked_up',
                      order_id: 'ord-1',
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    eta_pickup_at: null,
                    route_to_dropoff_polyline: 'polyx',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { insert: jest.fn() };
    }),
  })),
}));

describe('POST /api/location', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deliveriesPhase = 0;
    deliveryOwnerId = 'driver-self';
  });

  it('returns 403 when deliveryId is not owned by driver', async () => {
    deliveryOwnerId = 'other-driver';
    const req = new NextRequest('http://localhost/api/location', {
      method: 'POST',
      body: JSON.stringify({
        lat: 43.2,
        lng: -79.8,
        deliveryId: DELIVERY_UUID,
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(refreshFromDriverPing).not.toHaveBeenCalled();
    expect(broadcastPublic).not.toHaveBeenCalled();
  });

  it('calls refreshFromDriverPing and broadcastPublic with sanitized fields when delivery is on customer leg', async () => {
    const req = new NextRequest('http://localhost/api/location', {
      method: 'POST',
      body: JSON.stringify({
        lat: 43.25,
        lng: -79.87,
        deliveryId: DELIVERY_UUID,
      }),
    });
    const res = await POST(req);
    expect(res.ok).toBe(true);
    expect(refreshFromDriverPing).toHaveBeenCalledWith(
      DELIVERY_UUID,
      expect.objectContaining({ lat: 43.25, lng: -79.87 })
    );
    expect(broadcastPublic).toHaveBeenCalledWith(
      'ord-1',
      expect.objectContaining({
        public_stage: 'on_the_way',
        route_progress_pct: 12,
        route_remaining_seconds: 90,
        route_to_dropoff_polyline: 'polyx',
      })
    );
    const [, payload] = broadcastPublic.mock.calls[0]!;
    expect(payload).not.toHaveProperty('lat');
    expect(payload).not.toHaveProperty('lng');
    expect(payload).not.toHaveProperty('driver_lat');
  });
});
