/**
 * @jest-environment node
 */
const mockGetChefById = jest.fn();
jest.mock('@ridendine/db', () => ({
  createAdminClient: jest.fn(() => ({})),
  getChefById: (...a: unknown[]) => mockGetChefById(...a),
}));
jest.mock('@/lib/engine', () => ({ getChefActorContext: jest.fn() }));

import { isKitchenOwner } from '../chef-owner';

const ctx = (userId: string) => ({
  chefId: 'chef-1',
  storefrontId: 'store-1',
  actor: { userId, role: 'chef_user' as const, entityId: 'chef-1' },
});

describe('isKitchenOwner', () => {
  beforeEach(() => mockGetChefById.mockReset());

  it('is true for the chef profile owner', async () => {
    mockGetChefById.mockResolvedValue({ id: 'chef-1', user_id: 'owner' });
    await expect(isKitchenOwner(ctx('owner') as never)).resolves.toBe(true);
  });

  it('is false for kitchen staff sharing the chef context', async () => {
    mockGetChefById.mockResolvedValue({ id: 'chef-1', user_id: 'owner' });
    await expect(isKitchenOwner(ctx('staff') as never)).resolves.toBe(false);
  });

  it('fails closed on lookup errors or a missing profile', async () => {
    mockGetChefById.mockRejectedValue(new Error('db down'));
    await expect(isKitchenOwner(ctx('owner') as never)).resolves.toBe(false);
    mockGetChefById.mockResolvedValue(null);
    await expect(isKitchenOwner(ctx('owner') as never)).resolves.toBe(false);
  });
});
