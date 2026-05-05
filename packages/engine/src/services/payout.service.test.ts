import { describe, expect, it, vi } from 'vitest';
import { createLedgerService } from './ledger.service';
import { createPayoutService } from './payout.service';

describe('PayoutService', () => {
  it('moves a bank payout through approval, export, paid, and reconciliation states', async () => {
    const updates: Record<string, unknown>[] = [];
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'chef_payouts') {
          return {
            update: vi.fn((row: Record<string, unknown>) => {
              updates.push({ table, ...row });
              const updateChain: Record<string, unknown> = {};
              updateChain.eq = vi.fn(() => updateChain);
              updateChain.in = vi.fn(() => updateChain);
              updateChain.select = vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'payout-1', ...row }, error: null }),
              });
              updateChain.single = vi.fn().mockResolvedValue({ data: { id: 'payout-1', ...row }, error: null });
              updateChain.then = (fn: (value: { error: null }) => unknown) => Promise.resolve(fn({ error: null }));
              return updateChain;
            }),
          };
        }
        return {};
      }),
    } as never;
    const ledger = createLedgerService(client);
    const payout = createPayoutService(client, ledger);
    const actor = { userId: 'finance-1', role: 'finance_admin' as const };

    await payout.approveBankPayout({ payeeType: 'chef', payoutId: 'payout-1', actor });
    await payout.exportBankPayoutBatch({ payeeType: 'chef', payoutIds: ['payout-1'], actor, bankBatchId: 'batch-1' });
    await payout.markBankPayoutPaid({ payeeType: 'chef', payoutId: 'payout-1', actor, bankReference: 'eft-123' });
    await payout.reconcileBankPayout({ payeeType: 'chef', payoutId: 'payout-1', actor, bankReference: 'eft-123' });

    expect(updates).toEqual([
      expect.objectContaining({ status: 'approved', approved_by: 'finance-1' }),
      expect.objectContaining({ status: 'exported', bank_batch_id: 'batch-1' }),
      expect.objectContaining({ status: 'paid', bank_reference: 'eft-123' }),
      expect.objectContaining({ status: 'reconciled', reconciliation_status: 'reconciled' }),
    ]);
  });

  it('schedules chef payout from platform balance without moving Stripe funds', async () => {
    const transferCreate = vi.fn();
    const inserts: Record<string, unknown>[] = [];
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'platform_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { balance_cents: 5000, currency: 'CAD' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'chef_payout_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { stripe_account_id: 'acct_chef', payout_enabled: true },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'chef_payouts') {
          return {
            insert: vi.fn((row: Record<string, unknown>) => {
              inserts.push(row);
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { id: 'payout-1' }, error: null }),
                }),
              };
            }),
          };
        }
        return {};
      }),
    } as never;

    const ledger = createLedgerService(client);
    const payout = createPayoutService(client, ledger, {
      getStripe: () => ({ transfers: { create: transferCreate } }) as never,
    });

    const result = await payout.scheduleChefPayout({
      chefId: 'chef-1',
      storefrontId: 'store-1',
      amountCents: 2500,
      actor: { userId: 'chef-user', role: 'chef_user', entityId: 'chef-1' },
    });

    expect(result).toEqual({ payoutId: 'payout-1', amountCents: 2500, currency: 'CAD' });
    expect(transferCreate).not.toHaveBeenCalled();
    expect(inserts[0]).toMatchObject({
      chef_id: 'chef-1',
      amount: 2500,
      status: 'scheduled',
    });
  });

  it('rejects chef payout schedule when requested amount exceeds platform balance', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'platform_accounts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { balance_cents: 1200, currency: 'CAD' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    } as never;
    const ledger = createLedgerService(client);
    const payout = createPayoutService(client, ledger);

    const result = await payout.scheduleChefPayout({
      chefId: 'chef-1',
      storefrontId: 'store-1',
      amountCents: 2500,
      actor: { userId: 'chef-user', role: 'chef_user', entityId: 'chef-1' },
    });

    expect(result.error).toBe('Amount exceeds available chef payable balance');
  });

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
