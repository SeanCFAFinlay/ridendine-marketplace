import { describe, expect, it, vi } from 'vitest';
import { createLedgerService, makeLedgerIdempotencyKey } from './ledger.service';

function createLedgerMock() {
  const byKey = new Map<string, string>();

  const ledgerTable = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation((_col: string, key: string) => ({
        maybeSingle: vi.fn(async () => {
          const id = byKey.get(key);
          return { data: id ? { id } : null, error: null };
        }),
      })),
    }),
    insert: vi.fn().mockImplementation((rows: unknown) => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn(async () => {
          const row = (Array.isArray(rows) ? rows[0] : rows) as { idempotency_key: string };
          const id = `led-${row.idempotency_key}`;
          byKey.set(row.idempotency_key, id);
          return { data: { id }, error: null };
        }),
      }),
    })),
  };

  return { client: { from: vi.fn(() => ledgerTable) } as never, ledgerTable };
}

describe('makeLedgerIdempotencyKey', () => {
  it('formats type:source', () => {
    expect(makeLedgerIdempotencyKey('chef_payable', 'order-1')).toBe('chef_payable:order-1');
  });
});

describe('LedgerService', () => {
  it('recordOrderPayment second call is idempotent for all three lines', async () => {
    const { client } = createLedgerMock();
    const svc = createLedgerService(client);
    const input = {
      orderId: 'o1',
      storefrontId: 's1',
      driverId: 'd1',
      subtotalCents: 10_000,
      deliveryFeeCents: 500,
      currency: 'CAD',
    };
    const a = await svc.recordOrderPayment(input);
    const b = await svc.recordOrderPayment(input);
    expect(a.chef.inserted).toBe(true);
    expect(a.driver.inserted).toBe(true);
    expect(a.platform.inserted).toBe(true);
    expect(b.chef.inserted).toBe(false);
    expect(b.driver.inserted).toBe(false);
    expect(b.platform.inserted).toBe(false);
    expect(a.chef.id).toBe(b.chef.id);
  });

  it('recordRefund uses stable keys per refund source', async () => {
    const { client } = createLedgerMock();
    const svc = createLedgerService(client);
    const base = {
      orderId: 'o1',
      storefrontId: 's1',
      driverId: 'd1',
      subtotalCents: 1000,
      deliveryFeeCents: 100,
      currency: 'CAD',
      refundSourceId: 're_123',
    };
    const first = await svc.recordRefund(base);
    const second = await svc.recordRefund(base);
    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
  });
});
