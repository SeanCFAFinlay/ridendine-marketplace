import { describe, expect, it } from 'vitest';
import { stripeConnectStatus } from './finance.repository';

describe('stripeConnectStatus', () => {
  it('is active and verified once Stripe enables payouts', () => {
    expect(stripeConnectStatus({ payouts_enabled: true, details_submitted: true })).toEqual({
      status: 'active',
      payoutEnabled: true,
      isVerified: true,
    });
  });

  it('is pending while onboarding is incomplete', () => {
    expect(stripeConnectStatus({ payouts_enabled: false, details_submitted: false })).toEqual({
      status: 'pending',
      payoutEnabled: false,
      isVerified: false,
    });
  });

  it('is restricted when Stripe disables the account', () => {
    expect(
      stripeConnectStatus({ payouts_enabled: false, requirements: { disabled_reason: 'requirements.past_due' } }).status
    ).toBe('restricted');
  });
});
