/**
 * @jest-environment node
 */

const mockAdd = jest.fn();
const mockLimit = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: () => ({}),
  addLaunchSignup: (...args: unknown[]) => mockAdd(...args),
}));

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { supportWrite: { name: 'support_write' } },
  evaluateRateLimit: (...args: unknown[]) => mockLimit(...args),
  rateLimitPolicyResponse: () => Response.json({ success: false }, { status: 429 }),
}));

import { NextRequest } from 'next/server';
import { LAUNCH_CONSENT_TEXT } from '@ridendine/validation';
import { POST } from '../../../src/app/api/launch-signup/route';

function post(body: string) {
  return POST(
    new NextRequest('http://localhost/api/launch-signup', { method: 'POST', body })
  );
}

describe('POST /api/launch-signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLimit.mockResolvedValue({ allowed: true });
    mockAdd.mockResolvedValue(undefined);
  });

  it('saves a normalised address with the wording the person agreed to', async () => {
    const res = await post(JSON.stringify({ email: '  Jane@Example.COM ', source: 'coming-soon' }));
    expect(res.status).toBe(200);
    expect(mockAdd).toHaveBeenCalledWith(expect.anything(), {
      email: 'jane@example.com',
      source: 'coming-soon',
      consent_text: LAUNCH_CONSENT_TEXT,
    });
  });

  it('ignores consent wording sent by the client', async () => {
    await post(JSON.stringify({ email: 'a@example.com', consent_text: 'anything' }));
    expect(mockAdd.mock.calls[0][1].consent_text).toBe(LAUNCH_CONSENT_TEXT);
  });

  it.each(['{"email":"nope"}', '{}', 'null', 'not json', '{"email":"a@example.com","source":"x"}'])(
    'rejects %s',
    async (body) => {
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(mockAdd).not.toHaveBeenCalled();
    }
  );

  it('drops bot submissions without saying so', async () => {
    const res = await post(JSON.stringify({ email: 'bot@example.com', company: 'Spam Inc' }));
    expect(res.status).toBe(200);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('stops when rate limited', async () => {
    mockLimit.mockResolvedValue({ allowed: false });
    expect((await post(JSON.stringify({ email: 'a@example.com' }))).status).toBe(429);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('reports a failed save and keeps the address out of the logs', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockAdd.mockRejectedValue({ code: '42P01', message: 'failed for a@example.com' });
    const res = await post(JSON.stringify({ email: 'a@example.com' }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain('a@example.com');
    log.mockRestore();
  });
});
