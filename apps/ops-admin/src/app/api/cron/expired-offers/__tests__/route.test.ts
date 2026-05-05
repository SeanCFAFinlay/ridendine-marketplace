/**
 * TDD: Expired offers cron route
 * Tests for GET/POST /api/cron/expired-offers
 */

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
}));

const mockProcessExpiredOffers = jest.fn();
jest.mock('@ridendine/engine', () => ({
  createCentralEngine: jest.fn(() => ({
    dispatch: { processExpiredOffers: mockProcessExpiredOffers },
  })),
}));

jest.mock('@ridendine/utils', () => ({
  validateEngineProcessorHeaders: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data: unknown, init?: { status?: number }) => ({
      data,
      status: init?.status ?? 200,
    })),
  },
}));

import { GET, POST } from '../route';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import { NextResponse } from 'next/server';

function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/cron/expired-offers', () => {
  it('returns 401 when authorization header is missing', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(false);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(res.data).toMatchObject({ success: false, error: 'Unauthorized' });
  });

  it('returns 401 when bearer token is wrong', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(false);

    const res = await GET(makeRequest({ authorization: 'Bearer wrong-token' }));

    expect(res.status).toBe(401);
  });

  it('returns 200 and calls processExpiredOffers for valid bearer', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(true);
    mockProcessExpiredOffers.mockResolvedValue(5);

    const res = await GET(makeRequest({ authorization: 'Bearer dev-cron-secret' }));

    expect(res.status).toBe(200);
    expect(mockProcessExpiredOffers).toHaveBeenCalledTimes(1);

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg.success).toBe(true);
    expect(callArg.data.processed).toBe(5);
    expect(typeof callArg.data.ts).toBe('string');
  });

  it('returns 500 when engine throws', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(true);
    mockProcessExpiredOffers.mockRejectedValue(new Error('dispatch error'));

    await expect(GET(makeRequest({ authorization: 'Bearer dev-cron-secret' }))).rejects.toThrow('dispatch error');
  });
});

describe('POST /api/cron/expired-offers', () => {
  it('returns 401 for missing auth', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(false);

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
  });

  it('returns 200 and calls processExpiredOffers for valid bearer', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(true);
    mockProcessExpiredOffers.mockResolvedValue(3);

    const res = await POST(makeRequest({ authorization: 'Bearer dev-cron-secret' }));

    expect(res.status).toBe(200);
    expect(mockProcessExpiredOffers).toHaveBeenCalledTimes(1);
  });
});
