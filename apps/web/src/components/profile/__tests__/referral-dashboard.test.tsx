/**
 * Regression test for the referral-link defect (R-05).
 *
 * The share link was hard-coded to `https://ridendine.com/signup?ref=CODE`:
 * the wrong TLD (production is ridendine.ca) AND a route that does not exist
 * (`/signup` vs `/auth/signup`). Every shared link 404'd, so the referral
 * acquisition channel was dead while the capture side worked fine.
 *
 * These assertions fail if either half regresses.
 */

import { buildReferralLink } from '../referral-dashboard';

describe('buildReferralLink', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it('points at the real signup route, not the non-existent /signup', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://ridendine.ca';
    const link = buildReferralLink('ABC123');

    expect(link).toBe('https://ridendine.ca/auth/signup?ref=ABC123');
    // The bare `/signup` path does not exist in apps/web/src/app; the real
    // route is `/auth/signup`. Assert on the parsed pathname so this cannot
    // be satisfied by a substring match.
    expect(new URL(link).pathname).toBe('/auth/signup');
  });

  it('follows the deployment rather than hard-coding a domain', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://staging.example.com';
    expect(buildReferralLink('XYZ')).toBe('https://staging.example.com/auth/signup?ref=XYZ');
  });

  it('never emits the wrong TLD', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://ridendine.ca';
    expect(buildReferralLink('CODE')).not.toContain('ridendine.com');
  });

  it('tolerates a trailing slash on the configured base URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://ridendine.ca/';
    expect(buildReferralLink('CODE')).toBe('https://ridendine.ca/auth/signup?ref=CODE');
  });

  it('url-encodes the referral code', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://ridendine.ca';
    expect(buildReferralLink('A B&C')).toBe('https://ridendine.ca/auth/signup?ref=A%20B%26C');
  });
});
