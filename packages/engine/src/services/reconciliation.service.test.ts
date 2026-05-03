import { describe, expect, it, vi } from 'vitest';
import { createReconciliationService } from './reconciliation.service';

describe('ReconciliationService', () => {
  it('runDaily upserts unmatched when no ledger rows match', async () => {
    const upserts: unknown[] = [];

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'stripe_events_processed') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({
                  data: [
                    {
                      stripe_event_id: 'evt_unmatched',
                      related_order_id: null,
                      related_payment_id: 'pi_missing',
                      event_type: 'payment_intent.succeeded',
                      processed_at: '2026-05-02T15:00:00.000Z',
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'ledger_entries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string) => {
                if (col === 'stripe_id') {
                  return Promise.resolve({ data: [], error: null });
                }
                if (col === 'order_id') {
                  return {
                    in: vi.fn().mockResolvedValue({ data: [], error: null }),
                  };
                }
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          };
        }
        if (table === 'stripe_reconciliation') {
          return {
            upsert: vi.fn(async (row: unknown) => {
              upserts.push(row);
              return { error: null };
            }),
          };
        }
        return {};
      }),
    } as never;

    const svc = createReconciliationService(client);
    const summary = await svc.runDaily('2026-05-02');
    expect(summary.examined).toBe(1);
    expect(summary.matched).toBe(0);
    expect(summary.unmatched).toBe(1);
    expect(upserts).toHaveLength(1);
    const row = upserts[0] as {
      stripe_event_id: string;
      status: string;
      variance_cents: number;
      ledger_entry_ids: string[];
    };
    expect(row.stripe_event_id).toBe('evt_unmatched');
    expect(row.status).toBe('unmatched');
    expect(row.variance_cents).toBe(1);
    expect(row.ledger_entry_ids).toEqual([]);
  });
});
