/**
 * TDD: Analytics Trends API route
 * Tests for GET /api/analytics/trends
 */

// Mock dependencies before importing
jest.mock('@/lib/engine', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require('next/server');
  return {
    getOpsActorContext: jest.fn(),
    guardPlatformApi: jest.fn((actor: unknown) =>
      actor
        ? null
        : NextResponse.json(
            {
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
            },
            { status: 401 }
          )
    ),
  };
});

const mockFrom = jest.fn();
jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({ data, status: init && init.status ? init.status : 200 })),
  },
}));

import { GET } from '../route';
import { getOpsActorContext } from '@/lib/engine';
import { NextResponse } from 'next/server';

function makeRequest(params = {}) {
  const url = new URL('http://localhost/api/analytics/trends');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return { url: url.toString() } as any;
}

function makeQueryChain(data) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data }),
  };
  return chain;
}

function makeChefChain(data) {
  return {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data }),
  };
}

function makeLedgerChain(data) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockResolvedValue({ data }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/analytics/trends', () => {
  it('returns 401 when actor is null', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
  });

  it('returns trend data with correct shape when authorized', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      role: 'ops_manager',
      entityId: 'e1',
      sessionId: 's1',
    });

    const orders = [
      { id: 'o1', total: 25.00, status: 'delivered', payment_status: 'completed', created_at: new Date().toISOString() },
      { id: 'o2', total: 15.00, status: 'cancelled', payment_status: 'pending', created_at: new Date().toISOString() },
    ];

    mockFrom.mockImplementation((table) => {
      if (table === 'orders') return makeQueryChain(orders);
      if (table === 'ledger_entries') return makeLedgerChain([{ entity_id: 'chef1', amount_cents: 1000 }]);
      if (table === 'chef_profiles') return makeChefChain([{ id: 'chef1', display_name: 'Chef Alice' }]);
      return makeQueryChain([]);
    });

    await GET(makeRequest({ days: '7' }));

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg.data).toHaveProperty('trend');
    expect(callArg.data).toHaveProperty('topChefs');
    expect(callArg.data).toHaveProperty('peakHours');
    expect(callArg.data).toHaveProperty('summary');
    expect(Array.isArray(callArg.data.trend)).toBe(true);
    expect(Array.isArray(callArg.data.peakHours)).toBe(true);
    expect(callArg.data.peakHours).toHaveLength(24);
  });

  it('fills in missing dates with zeros in trend array', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      role: 'ops_manager',
      entityId: 'e1',
      sessionId: 's1',
    });

    mockFrom.mockImplementation((table) => {
      if (table === 'orders') return makeQueryChain([]);
      if (table === 'ledger_entries') return makeLedgerChain([]);
      if (table === 'chef_profiles') return makeChefChain([]);
      return makeQueryChain([]);
    });

    await GET(makeRequest({ days: '7' }));

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg.data.trend.length).toBeGreaterThanOrEqual(7);
    const allZero = callArg.data.trend.every((d) => d.orders === 0 && d.revenue === 0);
    expect(allZero).toBe(true);
  });

  it('calculates summary totals correctly', async () => {
    (getOpsActorContext as jest.Mock).mockResolvedValue({
      userId: 'u1',
      role: 'ops_manager',
      entityId: 'e1',
      sessionId: 's1',
    });

    const today = new Date().toISOString();
    const orders = [
      { id: 'o1', total: 100, status: 'delivered', payment_status: 'completed', created_at: today },
      { id: 'o2', total: 50, status: 'completed', payment_status: 'completed', created_at: today },
      { id: 'o3', total: 30, status: 'cancelled', payment_status: 'pending', created_at: today },
    ];

    mockFrom.mockImplementation((table) => {
      if (table === 'orders') return makeQueryChain(orders);
      if (table === 'ledger_entries') return makeLedgerChain([]);
      if (table === 'chef_profiles') return makeChefChain([]);
      return makeQueryChain([]);
    });

    await GET(makeRequest({ days: '1' }));

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg.data.summary.totalOrders).toBe(3);
    // revenue only from payment_status === 'completed'
    expect(callArg.data.summary.totalRevenue).toBe(150);
  });
});
