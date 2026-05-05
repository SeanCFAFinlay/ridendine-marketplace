/**
 * @jest-environment node
 */
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
  },
}));

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { auth: {} },
  evaluateRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  rateLimitPolicyResponse: jest.fn(),
}));

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockFrom = jest.fn();
const mockGetDriverByUserId = jest.fn();

jest.mock('@ridendine/db', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
  })),
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
  getDriverByUserId: (...args: unknown[]) => mockGetDriverByUserId(...args),
}));

import { POST } from '../app/api/auth/login/route';

describe('driver auth login route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows an active super admin to sign in without a driver profile', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-super', email: 'superadmin@ridendine.ca' },
        session: { access_token: 'token' },
      },
      error: null,
    });
    mockGetDriverByUserId.mockResolvedValue(null);
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { user_id: 'user-super', role: 'super_admin', is_active: true },
              error: null,
            }),
          }),
        }),
      }),
    });

    const request = new Request('https://driver.ridendine.ca/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'superadmin@ridendine.ca',
        password: 'correct-password',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.driver).toBeNull();
    expect(body.data.platformRole).toBe('super_admin');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('rejects a non-driver non-admin user with a JSON error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'user-customer', email: 'customer@example.com' },
        session: { access_token: 'token' },
      },
      error: null,
    });
    mockGetDriverByUserId.mockResolvedValue(null);
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'not found' },
            }),
          }),
        }),
      }),
    });

    const request = new Request('https://driver.ridendine.ca/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@example.com',
        password: 'correct-password',
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Driver profile not found');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
