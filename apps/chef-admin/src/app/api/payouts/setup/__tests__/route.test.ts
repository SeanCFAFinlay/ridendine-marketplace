/**
 * @jest-environment node
 *
 * POST /api/payouts/setup — Stripe Connect onboarding.
 *  - redirect base URL resolution (NEXT_PUBLIC_CHEF_ADMIN_URL → NEXT_PUBLIC_APP_URL → 500)
 *  - the account row is persisted with the service client (no RLS INSERT policy)
 *  - an existing account is reused + re-synced, never duplicated
 */

const mockGetChefActorContext = jest.fn();
const mockGetStripeClient = jest.fn();
const mockGetChefPayoutAccount = jest.fn();
const mockCreateChefPayoutAccount = jest.fn();
const mockSyncChefPayoutAccountFromStripe = jest.fn();
const mockGetChefById = jest.fn();

jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
  getChefPayoutAccount: (...a: unknown[]) => mockGetChefPayoutAccount(...a),
  createChefPayoutAccount: (...a: unknown[]) => mockCreateChefPayoutAccount(...a),
  syncChefPayoutAccountFromStripe: (...a: unknown[]) => mockSyncChefPayoutAccountFromStripe(...a),
  getChefById: (...a: unknown[]) => mockGetChefById(...a),
}));

jest.mock('@ridendine/engine', () => ({
  getStripeClient: () => mockGetStripeClient(),
}));

jest.mock('@/lib/engine', () => ({
  getChefActorContext: () => mockGetChefActorContext(),
}));

import { POST } from '../route';

function buildStripeMock(url = 'https://connect.stripe.com/setup/c/acct') {
  return {
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_new' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'acct_existing', payouts_enabled: true, details_submitted: true }),
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({ url }),
    },
  };
}

describe('POST /api/payouts/setup', () => {
  let stripe: ReturnType<typeof buildStripeMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_CHEF_ADMIN_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    mockGetChefActorContext.mockResolvedValue({
      chefId: 'chef-1',
      storefrontId: 'store-1',
      actor: { userId: 'user-1', role: 'chef_user', entityId: 'chef-1' },
    });
    mockGetChefPayoutAccount.mockResolvedValue({ chef_id: 'chef-1', stripe_account_id: 'acct_existing' });
    mockGetChefById.mockResolvedValue({ id: 'chef-1', display_name: 'Alice Chef' });
    stripe = buildStripeMock();
    mockGetStripeClient.mockReturnValue(stripe);
  });

  it('rejects unauthenticated callers', async () => {
    mockGetChefActorContext.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('uses NEXT_PUBLIC_CHEF_ADMIN_URL when set', async () => {
    process.env.NEXT_PUBLIC_CHEF_ADMIN_URL = 'https://chef.ridendine.com';
    const res = await POST();
    expect(res.status).toBe(200);
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
    expect(res.status).toBe(200);
    expect(stripe.accountLinks.create).toHaveBeenCalledWith(
      expect.objectContaining({ return_url: expect.stringContaining('https://app.ridendine.com') })
    );
  });

  it('returns 500 when neither env var is set', async () => {
    const res = await POST();
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toMatch(/misconfiguration|NEXT_PUBLIC_CHEF_ADMIN_URL/i);
    expect(stripe.accounts.create).not.toHaveBeenCalled();
  });

  it('creates and persists a Connect account (service client) on first setup', async () => {
    process.env.NEXT_PUBLIC_CHEF_ADMIN_URL = 'https://chef.ridendine.com';
    mockGetChefPayoutAccount.mockResolvedValue(null);

    const res = await POST();

    expect(res.status).toBe(200);
    expect(stripe.accounts.create).toHaveBeenCalledTimes(1);
    expect(stripe.accounts.create.mock.calls[0][1]).toEqual({ idempotencyKey: 'chef-connect-account:chef-1' });
    expect(mockCreateChefPayoutAccount).toHaveBeenCalledWith({}, 'chef-1', 'acct_new');
  });

  it('reuses and re-syncs an existing account instead of creating another', async () => {
    process.env.NEXT_PUBLIC_CHEF_ADMIN_URL = 'https://chef.ridendine.com';

    const res = await POST();

    expect(res.status).toBe(200);
    expect(stripe.accounts.create).not.toHaveBeenCalled();
    expect(stripe.accounts.retrieve).toHaveBeenCalledWith('acct_existing');
    expect(mockSyncChefPayoutAccountFromStripe).toHaveBeenCalled();
    expect(mockCreateChefPayoutAccount).not.toHaveBeenCalled();
  });

  it('returns 500 (not a silent success) when saving the account fails', async () => {
    process.env.NEXT_PUBLIC_CHEF_ADMIN_URL = 'https://chef.ridendine.com';
    mockGetChefPayoutAccount.mockResolvedValue(null);
    mockCreateChefPayoutAccount.mockRejectedValue(new Error('insert denied'));

    const res = await POST();
    expect(res.status).toBe(500);
    expect(stripe.accountLinks.create).not.toHaveBeenCalled();
  });
});
