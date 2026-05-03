import { describe, expect, it, vi } from 'vitest';
import type { AuditLogger } from '../core/audit-logger';
import { ReconciliationService } from './reconciliation.service';
import { createPayoutService } from './payout.service';
import { createLedgerService } from './ledger.service';
import { handleStripeFinanceWebhook } from './stripe-webhook-finance';
import { ActorRole } from '@ridendine/types';

describe('Phase 6 Stripe / finance integration', () => {
  it('reconciliation runDaily flags high variance between stripe snapshot and ledger', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const events = [
      {
        stripe_event_id: 'evt_var',
        related_order_id: 'ord-1',
        related_payment_id: 'pi_1',
        event_type: 'payment_intent.succeeded',
        processed_at: '2026-05-02T12:00:00.000Z',
        stripe_amount_cents: 5000,
      },
    ];

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'stripe_events_processed') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: events, error: null }),
              }),
            }),
          };
        }
        if (table === 'ledger_entries') {
          return {
            select: vi.fn().mockImplementation((cols: string) => {
              if (cols === 'id') {
                return {
                  eq: vi.fn().mockResolvedValue({ data: [{ id: 'l1' }], error: null }),
                };
              }
              return {
                in: vi.fn().mockResolvedValue({
                  data: [{ amount_cents: 4800 }],
                  error: null,
                }),
              };
            }),
          };
        }
        if (table === 'stripe_reconciliation') {
          return { upsert };
        }
        return {};
      }),
    } as never;

    const svc = new ReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');
    expect(summary.examined).toBe(1);
    expect(upsert).toHaveBeenCalledTimes(1);
    const row = upsert.mock.calls[0][0] as {
      variance_cents: number;
      variance_flagged: boolean;
      status: string;
    };
    expect(row.variance_cents).toBe(200);
    expect(row.variance_flagged).toBe(true);
    expect(row.status).toBe('disputed');
  });

  it('executeChefRun calls Stripe transfer then persists stripe_transfer_id on chef_payouts', async () => {
    const transferCreate = vi.fn().mockResolvedValue({ id: 'tr_test_123' });
    const stripe = {
      transfers: {
        create: transferCreate,
        createReversal: vi.fn().mockResolvedValue({}),
      },
    };

    const chefRows = [{ owner_id: 'sf-1', balance_cents: 1000, currency: 'cad' }];
    const storefronts = [{ id: 'sf-1', name: 'Kitchen', chef_id: 'chef-1' }];
    const payoutAccount = { stripe_account_id: 'acct_testchef' };

    const insertRun = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'run-1' }, error: null }),
      }),
    });
    const chefPayoutInsert = vi.fn().mockResolvedValue({ error: null });
    const payoutRunUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const ledgerInserts: { stripe_id?: string | null }[] = [];

    const unifiedFrom = vi.fn((table: string) => {
      if (table === 'platform_accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockResolvedValue({ data: chefRows, error: null }),
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
      if (table === 'chef_storefronts') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: storefronts, error: null }),
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { chef_id: 'chef-1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'chef_payout_accounts') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  stripe_account_id: 'acct_testchef',
                  payout_enabled: true,
                  is_verified: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'chef_payouts') {
        return {
          insert: chefPayoutInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'payout_runs') {
        return { insert: insertRun, update: payoutRunUpdate };
      }
      if (table === 'ledger_entries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockImplementation((row: { stripe_id?: string | null }) => {
            ledgerInserts.push(row);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'led-1' }, error: null }),
              }),
            };
          }),
        };
      }
      return {};
    });

    const c = { from: unifiedFrom } as never;
    const ledger = createLedgerService(c);
    const payout = createPayoutService(c, ledger, {
      getStripe: () => stripe as never,
    });

    const result = await payout.executeChefRun({
      periodStart: '2026-05-01',
      periodEnd: '2026-05-07',
      actor: { userId: 'u1', role: ActorRole.FINANCE_ADMIN },
    });

    expect(result.runId).toBe('run-1');
    expect(result.processed).toBe(1);
    expect(transferCreate).toHaveBeenCalled();
    const lastLedger = ledgerInserts[ledgerInserts.length - 1];
    expect(lastLedger?.stripe_id).toBe('tr_test_123');
    const cpArg = chefPayoutInsert.mock.calls[0][0] as { stripe_transfer_id: string };
    expect(cpArg.stripe_transfer_id).toBe('tr_test_123');
  });

  it('handleStripeFinanceWebhook transfer.created upserts reconciliation', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn((t: string) => {
        if (t === 'ledger_entries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [{ id: 'l1' }], error: null }),
            }),
          };
        }
        if (t === 'stripe_reconciliation') {
          return { upsert };
        }
        if (t === 'chef_payouts' || t === 'driver_payouts') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({}) }),
              }),
            }),
          };
        }
        return {};
      }),
    } as never;

    const audit = { log: vi.fn().mockResolvedValue(null) } as unknown as AuditLogger;
    const ledger = createLedgerService({} as never);
    const event = {
      id: 'evt_tr',
      type: 'transfer.created',
      data: { object: { id: 'tr_abc', amount: 2500 } },
    };

    await handleStripeFinanceWebhook(client, { ledger, audit }, event as never, {
      userId: 'sys',
      role: ActorRole.SYSTEM,
    });

    expect(upsert).toHaveBeenCalled();
    const arg = upsert.mock.calls[0][0] as { ledger_entry_ids: string[]; stripe_event_id: string };
    expect(arg.stripe_event_id).toBe('evt_tr');
    expect(arg.ledger_entry_ids).toEqual(['l1']);
  });
});
