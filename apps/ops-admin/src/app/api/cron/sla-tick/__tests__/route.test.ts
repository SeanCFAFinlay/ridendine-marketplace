/**
 * TDD: SLA tick cron route
 * Tests for GET/POST /api/cron/sla-tick
 */

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
}));

const mockProcessExpiredTimers = jest.fn();
jest.mock('@ridendine/engine', () => ({
  createCentralEngine: jest.fn(() => ({
    sla: { processExpiredTimers: mockProcessExpiredTimers },
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

describe('GET /api/cron/sla-tick', () => {
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

  it('returns 200 and calls processExpiredTimers for valid bearer', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(true);
    mockProcessExpiredTimers.mockResolvedValue({
      warnings: [{ id: 'w1' }],
      breaches: [{ id: 'b1' }, { id: 'b2' }],
    });

    const res = await GET(makeRequest({ authorization: 'Bearer dev-cron-secret' }));

    expect(res.status).toBe(200);
    expect(mockProcessExpiredTimers).toHaveBeenCalledTimes(1);

    const callArg = (NextResponse.json as jest.Mock).mock.calls[0][0];
    expect(callArg.success).toBe(true);
    expect(callArg.data.warningsCount).toBe(1);
    expect(callArg.data.breachesCount).toBe(2);
    expect(typeof callArg.data.ts).toBe('string');
  });

  it('returns 500 when engine throws', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(true);
    mockProcessExpiredTimers.mockRejectedValue(new Error('db error'));

    await expect(GET(makeRequest({ authorization: 'Bearer dev-cron-secret' }))).rejects.toThrow('db error');
  });
});

describe('POST /api/cron/sla-tick', () => {
  it('returns 401 for missing auth', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(false);

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
  });

  it('returns 200 and calls processExpiredTimers for valid bearer', async () => {
    (validateEngineProcessorHeaders as jest.Mock).mockReturnValue(true);
    mockProcessExpiredTimers.mockResolvedValue({ warnings: [], breaches: [] });

    const res = await POST(makeRequest({ authorization: 'Bearer dev-cron-secret' }));

    expect(res.status).toBe(200);
    expect(mockProcessExpiredTimers).toHaveBeenCalledTimes(1);
  });
});
