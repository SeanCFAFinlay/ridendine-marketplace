import { describe, expect, it } from 'vitest';
import {
  createDefaultPlatformRuleSet,
  shouldFallbackToDefaultPlatformSettings,
} from '@ridendine/db';

describe('platform settings fallback', () => {
  it('creates a safe default ruleset when settings are unavailable', () => {
    const rules = createDefaultPlatformRuleSet();

    expect(rules.dispatchRadiusKm).toBe(10);
    expect(rules.maxDeliveryDistanceKm).toBe(15);
    expect(rules.offerTimeoutSeconds).toBe(60);
    expect(rules.refundAutoReviewThresholdCents).toBe(2500);
  });

  it('treats missing table and missing row errors as fallback conditions', () => {
    expect(
      shouldFallbackToDefaultPlatformSettings({
        code: 'PGRST205',
        message: 'Could not find the table public.platform_settings',
        status: 404,
      })
    ).toBe(true);

    expect(
      shouldFallbackToDefaultPlatformSettings({
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
      })
    ).toBe(true);

    expect(
      shouldFallbackToDefaultPlatformSettings({
        code: '42501',
        message: 'permission denied',
      })
    ).toBe(false);
  });
});
