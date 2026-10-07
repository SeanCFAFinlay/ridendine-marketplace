import { resolveOpsRedirectTarget } from '../app/auth/login/redirect-target';

describe('resolveOpsRedirectTarget', () => {
  it('allows safe same-origin app paths', () => {
    expect(resolveOpsRedirectTarget('/dashboard')).toBe('/dashboard');
    expect(resolveOpsRedirectTarget('/dashboard/orders')).toBe('/dashboard/orders');
    expect(resolveOpsRedirectTarget('/dashboard/settings')).toBe('/dashboard/settings');
  });

  it('normalizes root and auth redirects to the ops dashboard route', () => {
    expect(resolveOpsRedirectTarget('/')).toBe('/dashboard');
    expect(resolveOpsRedirectTarget('/auth/login')).toBe('/dashboard');
    expect(resolveOpsRedirectTarget('/auth/signup')).toBe('/dashboard');
  });

  it('rejects external, protocol-relative, and empty redirects', () => {
    expect(resolveOpsRedirectTarget('https://example.com')).toBe('/dashboard');
    expect(resolveOpsRedirectTarget('//example.com')).toBe('/dashboard');
    expect(resolveOpsRedirectTarget('')).toBe('/dashboard');
    expect(resolveOpsRedirectTarget(null)).toBe('/dashboard');
    expect(resolveOpsRedirectTarget('\\\\malicious.site')).toBe('/dashboard');
  });
});
