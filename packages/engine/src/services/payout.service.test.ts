import { describe, expect, it, vi } from 'vitest';
import { createLedgerService } from './ledger.service';
import { createPayoutService } from './payout.service';

describe('PayoutService', () => {
  it('instantFeeCents is 1.5%', () => {
    const ledger = createLedgerService({} as never);
    const payout = createPayoutService({} as never, ledger);
    expect(payout.instantFeeCents(10_000)).toBe(150);
    expect(payout.instantFeeCents(3333)).toBe(50);
  });

  it('previewChefRun maps platform_accounts to storefront names', async () => {
    const rows = [{ owner_id: 'sf-1', balance_cents: 4200, currency: 'CAD' }];
    const storefronts = [{ id: 'sf-1', name: 'Tasty Kitchen', chef_id: 'c1' }];

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'platform_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gt: vi.fn().mockResolvedValue({ data: rows, error: null }),
              }),
            }),
          };
        }
        if (table === 'chef_storefronts') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: storefronts, error: null }),
            }),
          };
        }
        return {};
      }),
    } as never;

    const ledger = createLedgerService(client);
    const payout = createPayoutService(client, ledger);
    const preview = await payout.previewChefRun(new Date());
    expect(preview.lines).toHaveLength(1);
    expect(preview.lines[0]?.name).toBe('Tasty Kitchen');
    expect(preview.lines[0]?.amountCents).toBe(4200);
  });
});
