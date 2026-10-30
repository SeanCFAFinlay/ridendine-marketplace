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

const mockEvaluateRateLimit = jest.fn();
const mockRateLimitPolicyResponse = jest.fn(
  () => new Response(JSON.stringify({ error: 'Too many attempts' }), { status: 429 })
);

jest.mock('@ridendine/utils', () => ({
  RATE_LIMIT_POLICIES: { auth: { id: 'auth-policy' } },
  evaluateRateLimit: (...args: unknown[]) => mockEvaluateRateLimit(...args),
  rateLimitPolicyResponse: (...args: unknown[]) => mockRateLimitPolicyResponse(...args),
}));

const mockGetUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockUpdateUser = jest.fn();
const mockUpdateUserById = jest.fn();

jest.mock('@ridendine/db', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      updateUser: mockUpdateUser,
    },
  })),
  createAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
      },
    },
  })),
}));

import { POST } from '../route';

function request(body: Record<string, unknown>) {
  return new Request('https://chef.ridendine.ca/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateRateLimit.mockResolvedValue({ allowed: true });
  });

  it('rejects unauthenticated requests with 401', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') });

    const res = await POST(request({ currentPassword: 'ride1234', newPassword: 'newpassword123' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('validates password length and required fields with 400', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'usr-1', email: 'roy@cooco.app' } },
      error: null,
    });

    const res = await POST(request({ currentPassword: 'ride1234', newPassword: 'short' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('at least 8 characters');
  });

  it('rejects when new password matches current password', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'usr-1', email: 'roy@cooco.app' } },
      error: null,
    });

    const res = await POST(request({ currentPassword: 'ride1234', newPassword: 'ride1234' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('different from current password');
  });

  it('rejects with 400 if current password verification fails', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'usr-1', email: 'roy@cooco.app' } },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: null,
      error: new Error('Invalid login credentials'),
    });

    const res = await POST(request({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Incorrect current password');
  });

  it('successfully updates password when credentials are valid', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'usr-1', email: 'roy@cooco.app' } },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' } },
      error: null,
    });
    mockUpdateUser.mockResolvedValueOnce({
      data: { user: { id: 'usr-1' } },
      error: null,
    });

    const res = await POST(request({ currentPassword: 'ride1234', newPassword: 'newpassword123' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toBe('Password changed successfully');
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
  });
});
