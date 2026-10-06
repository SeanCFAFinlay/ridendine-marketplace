import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
  createCentralEngine: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}));

vi.mock('@ridendine/db', () => ({
  createServerClient: mocks.createServerClient,
  createAdminClient: mocks.createAdminClient,
}));

vi.mock('./index', () => ({
  createCentralEngine: mocks.createCentralEngine,
}));

import {
  getChefActorContext,
  getChefBasicContext,
  getDriverActorContext,
} from './server';

type QueryChain = {
  select: () => QueryChain;
  eq: () => QueryChain;
  order: () => QueryChain;
  limit: () => QueryChain;
  single: () => Promise<{ data: unknown; error: null }>;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
};

function tableQuery(data: unknown): QueryChain {
  const chain: QueryChain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => ({ data, error: null })),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  return chain;
}

function setCurrentUser(userId: string | null) {
  mocks.cookies.mockResolvedValue({});
  mocks.createServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: userId ? { id: userId } : null },
      })),
    },
  });
}

function setAdminTables(tables: Record<string, unknown>) {
  mocks.createAdminClient.mockReturnValue({
    from: vi.fn((table: string) => tableQuery(tables[table] ?? null)),
  });
}

describe('server actor context helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies privileged chef context for pending chefs by default', async () => {
    setCurrentUser('user-chef');
    setAdminTables({
      chef_profiles: { id: 'chef-1', status: 'pending' },
      chef_storefronts: { id: 'storefront-1' },
    });

    await expect(getChefActorContext()).resolves.toBeNull();
  });

  it('allows privileged chef context for approved chefs with storefronts', async () => {
    setCurrentUser('user-chef');
    setAdminTables({
      chef_profiles: { id: 'chef-1', status: 'approved' },
      chef_storefronts: { id: 'storefront-1' },
    });

    await expect(getChefActorContext()).resolves.toEqual({
      actor: { userId: 'user-chef', role: 'chef_user', entityId: 'chef-1' },
      chefId: 'chef-1',
      storefrontId: 'storefront-1',
    });
  });

  it('keeps chef onboarding context available for pending chefs', async () => {
    setCurrentUser('user-chef');
    setAdminTables({
      chef_profiles: { id: 'chef-1', status: 'pending' },
      chef_storefronts: null,
    });

    await expect(getChefBasicContext()).resolves.toEqual({
      userId: 'user-chef',
      chefId: 'chef-1',
      chefStatus: 'pending',
      storefrontId: null,
    });
  });

  it('denies driver context for pending drivers by default', async () => {
    setCurrentUser('user-driver');
    setAdminTables({
      drivers: { id: 'driver-1', status: 'pending' },
    });

    await expect(getDriverActorContext()).resolves.toBeNull();
  });

  it('denies driver context for suspended drivers by default', async () => {
    setCurrentUser('user-driver');
    setAdminTables({
      drivers: { id: 'driver-1', status: 'suspended' },
    });

    await expect(getDriverActorContext()).resolves.toBeNull();
  });

  it('allows dispatch context for approved drivers by default', async () => {
    setCurrentUser('user-driver');
    setAdminTables({
      drivers: { id: 'driver-1', status: 'approved' },
    });

    await expect(getDriverActorContext()).resolves.toEqual({
      actor: { userId: 'user-driver', role: 'driver', entityId: 'driver-1' },
      driverId: 'driver-1',
    });
  });

  it('allows driver onboarding context when approval is not required', async () => {
    setCurrentUser('user-driver');
    setAdminTables({
      drivers: { id: 'driver-1', status: 'pending' },
    });

    await expect(getDriverActorContext({ requireApproved: false })).resolves.toEqual({
      actor: { userId: 'user-driver', role: 'driver', entityId: 'driver-1' },
      driverId: 'driver-1',
    });
  });
});
