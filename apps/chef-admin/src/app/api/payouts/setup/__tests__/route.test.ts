/**
 * @jest-environment node
 *
 * Task 4 — Chef Connect redirect fix: unit tests for baseUrl resolution.
 *
 * The route resolves baseUrl as:
 *   process.env.NEXT_PUBLIC_CHEF_ADMIN_URL || process.env.NEXT_PUBLIC_APP_URL
 * And returns 500 when neither is set.
 */

const mockGetChefActorContext = jest.fn();
const mockGetStripeClient = jest.fn();
const mockCreateServerClient = jest.fn();
const mockCookies = jest.fn();

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}));

jest.mock('@ridendine/db', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('@ridendine/engine', () => ({
  getStripeClient: () => mockGetStripeClient(),
}));

jest.mock('@/lib/engine', () => ({
  getChefActorContext: () => mockGetChefActorContext(),
}));

import { POST } from '../route';

function buildSupabaseMock(overrides?: {
  user?: { id: string; email: string } | null;
  chefProfile?: { id: string; display_name: string } | null;
  existingAccount?: { stripe_account_id: string } | null;
}) {
  const user = overrides?.user ?? { id: 'user-1', email: 'chef@example.com' };
  const chefProfile = overrides?.chefProfile ?? { id: 'chef-1', display_name: 'Alice Chef' };
  const existingAccount = overrides?.existingAccount ?? { stripe_account_id: 'acct_existing' };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn((table: string) => {
      if (table === 'chef_profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: chefProfile, error: null }),
            }),
          }),
        };
      }
      if (table === 'chef_payout_accounts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: existingAccount, error: null }),
            }),
          }),
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    }),
  };
}

function buildStripeAccountLinkMock(url = 'https://connect.stripe.com/setup/c/acct') {
  return {
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_new' }),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({ url }),
    },
  };
}

describe('POST /api/payouts/setup — baseUrl resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_CHEF_ADMIN_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    mockGetChefActorContext.mockResolvedValue({
      chefId: 'chef-1',
      actor: { userId: 'user-1', role: 'chef_user', entityId: 'chef-1' },
    });
    mockCookies.mockReturnValue({});
    mockCreateServerClient.mockReturnValue(buildSupabaseMock());
    mockGetStripeClient.mockReturnValue(buildStripeAccountLinkMock());
  });

  it('uses NEXT_PUBLIC_CHEF_ADMIN_URL when set', async () => {
    process.env.NEXT_PUBLIC_CHEF_ADMIN_URL = 'https://chef.ridendine.com';

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBeDefined();

    const stripe = mockGetStripeClient();
    expect(stripe.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: expect.stringContaining('https://chef.ridendine.com'),
        refresh_url: expect.stringContaining('https://chef.ridendine.com'),
      })
    );
  });

  it('falls back to NEXT_PUBLIC_APP_URL when NEXT_PUBLIC_CHEF_ADMIN_URL is not set', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.ridendine.com';

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBeDefined();

    const stripe = mockGetStripeClient();
    expect(stripe.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: expect.stringContaining('https://app.ridendine.com'),
        refresh_url: expect.stringContaining('https://app.ridendine.com'),
      })
    );
  });

  it('returns 500 when neither env var is set', async () => {
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/misconfiguration|NEXT_PUBLIC_CHEF_ADMIN_URL/i);
  });
});
