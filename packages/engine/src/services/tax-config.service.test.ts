import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TaxConfigService } from './tax-config.service';
import { HST_RATE, SERVICE_FEE_PERCENT } from '../constants';

function buildClient(opts: {
  data?: { hst_rate?: number | null; service_fee_percent?: number | null } | null;
  error?: { message: string } | null;
}) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: opts.data ?? null,
        error: opts.error ?? null,
      }),
    })),
  } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('TaxConfigService', () => {
  it('reads hstRate and serviceFeePercent from the DB row', async () => {
    const client = buildClient({ data: { hst_rate: 15, service_fee_percent: 10 } });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(15);
    expect(rates.serviceFeePercent).toBe(10);
  });

  it('returns defaults when DB returns an error', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = buildClient({ data: null, error: { message: 'RLS denied' } });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(HST_RATE);
    expect(rates.serviceFeePercent).toBe(SERVICE_FEE_PERCENT);
    warnSpy.mockRestore();
  });

  it('returns defaults when DB returns null data (missing row)', async () => {
    const client = buildClient({ data: null, error: null });
    const svc = new TaxConfigService(client);

    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(HST_RATE);
    expect(rates.serviceFeePercent).toBe(SERVICE_FEE_PERCENT);
  });

  it('caches results within the 60-second TTL — does not re-hit DB on repeated calls', async () => {
    const client = buildClient({ data: { hst_rate: 12, service_fee_percent: 9 } });
    const svc = new TaxConfigService(client);

    const first = await svc.getTaxRates();
    const second = await svc.getTaxRates();
    const third = await svc.getTaxRates();

    expect(first).toEqual(second);
    expect(second).toEqual(third);
    // DB should be queried exactly once thanks to cache
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after cache TTL expires', async () => {
    const client = buildClient({ data: { hst_rate: 13, service_fee_percent: 8 } });
    const svc = new TaxConfigService(client);

    // Populate cache
    await svc.getTaxRates();

    // Force cache expiry by back-dating it
    (svc as unknown as { cache: { expiresAt: number } }).cache!.expiresAt = Date.now() - 1;

    await svc.getTaxRates();

    // DB should be queried twice: once for initial load, once after expiry
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it('returns defaults when DB throws unexpectedly', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const client = {
      from: vi.fn(() => {
        throw new Error('network timeout');
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient;

    const svc = new TaxConfigService(client);
    const rates = await svc.getTaxRates();

    expect(rates.hstRate).toBe(HST_RATE);
    expect(rates.serviceFeePercent).toBe(SERVICE_FEE_PERCENT);
    warnSpy.mockRestore();
  });
});
