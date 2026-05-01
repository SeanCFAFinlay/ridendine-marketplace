/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  legacyOrderConfirmationPath,
  orderConfirmationPath,
} from '@/lib/customer-ordering';

describe('customer-ordering helpers (Phase 6)', () => {
  const OLD = process.env;

  afterEach(() => {
    process.env = { ...OLD };
    jest.resetModules();
  });

  it('orderConfirmationPath is canonical under /orders', () => {
    expect(orderConfirmationPath('abc-123')).toBe('/orders/abc-123/confirmation');
  });

  it('legacyOrderConfirmationPath differs from canonical', () => {
    const id = 'x1';
    expect(legacyOrderConfirmationPath(id)).toBe('/order-confirmation/x1');
    expect(orderConfirmationPath(id)).not.toBe(legacyOrderConfirmationPath(id));
  });

  it('getChefPortalSignupUrl uses CHEF_ADMIN base + /auth/signup', () => {
    jest.resetModules();
    process.env = { ...OLD };
    process.env.NEXT_PUBLIC_CHEF_ADMIN_URL = 'http://localhost:3001/';
    delete process.env.NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL;
    const { getChefPortalSignupUrl } = require('@/lib/customer-ordering');
    expect(getChefPortalSignupUrl()).toBe('http://localhost:3001/auth/signup');
  });

  it('getChefPortalSignupUrl prefers explicit portal URL', () => {
    jest.resetModules();
    process.env = { ...OLD };
    process.env.NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL =
      'https://chef.example.com/onboard';
    process.env.NEXT_PUBLIC_CHEF_ADMIN_URL = 'http://localhost:3001';
    const { getChefPortalSignupUrl } = require('@/lib/customer-ordering');
    expect(getChefPortalSignupUrl()).toBe('https://chef.example.com/onboard');
  });

  it('checkout API calls kitchen readiness guard', () => {
    const checkoutApi = join(
      __dirname,
      '../../src/app/api/checkout/route.ts'
    );
    const src = readFileSync(checkoutApi, 'utf8');
    expect(src).toContain('validateCustomerCheckoutReadiness');
    expect(src).toContain('evaluateCheckoutRisk');
    expect(src).toContain('RATE_LIMIT_POLICIES.checkout');
    expect(src).toContain("'RISK_BLOCKED'");
  });

  it('checkout page does not use removed hardcoded fee fallback', () => {
    const checkoutPath = join(
      __dirname,
      '../../src/app/checkout/page.tsx'
    );
    const src = readFileSync(checkoutPath, 'utf8');
    expect(src).not.toContain('deliveryFee: 5.00');
    expect(src).not.toContain('0.13 * 100');
  });
});
