// ==========================================
// TAX CONFIG SERVICE
// Runtime authority for HST and service-fee rates.
// Reads from platform_settings (single-row config table).
// Falls back to constants.ts defaults on any DB failure.
// Optional 60-second in-memory cache to avoid per-request DB hits.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { HST_RATE, SERVICE_FEE_PERCENT } from '../constants';

export interface TaxRates {
  hstRate: number;
  serviceFeePercent: number;
}

const DEFAULT_RATES: TaxRates = {
  hstRate: HST_RATE,
  serviceFeePercent: SERVICE_FEE_PERCENT,
};

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  rates: TaxRates;
  expiresAt: number;
}

export class TaxConfigService {
  private cache: CacheEntry | null = null;

  constructor(private readonly client: SupabaseClient) {}

  async getTaxRates(): Promise<TaxRates> {
    const now = Date.now();
    if (this.cache && now < this.cache.expiresAt) {
      return this.cache.rates;
    }

    const rates = await this.fetchRates();
    this.cache = { rates, expiresAt: now + CACHE_TTL_MS };
    return rates;
  }

  private async fetchRates(): Promise<TaxRates> {
    try {
      const { data, error } = await (this.client as unknown as SupabaseClient)
        .from('platform_settings')
        .select('hst_rate, service_fee_percent')
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        if (error) {
          console.warn('[TaxConfigService] DB error reading platform_settings:', error.message);
        }
        return DEFAULT_RATES;
      }

      const row = data as { hst_rate?: number | null; service_fee_percent?: number | null };
      const hstRate = typeof row.hst_rate === 'number' ? row.hst_rate : DEFAULT_RATES.hstRate;
      const serviceFeePercent =
        typeof row.service_fee_percent === 'number'
          ? row.service_fee_percent
          : DEFAULT_RATES.serviceFeePercent;

      return { hstRate, serviceFeePercent };
    } catch (err) {
      console.warn('[TaxConfigService] Unexpected error fetching tax config:', err);
      return DEFAULT_RATES;
    }
  }
}

export function createTaxConfigService(client: SupabaseClient): TaxConfigService {
  return new TaxConfigService(client);
}
