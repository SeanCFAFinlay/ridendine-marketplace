import { resolveChefRedirectTarget } from '../app/auth/login/redirect-target';

describe('resolveChefRedirectTarget', () => {
  it('allows safe same-origin app paths', () => {
    expect(resolveChefRedirectTarget('/dashboard')).toBe('/dashboard');
    expect(resolveChefRedirectTarget('/dashboard/menu')).toBe('/dashboard/menu');
    expect(resolveChefRedirectTarget('/dashboard/orders')).toBe('/dashboard/orders');
  });

  it('normalizes root and auth redirects to the chef dashboard route', () => {
    expect(resolveChefRedirectTarget('/')).toBe('/dashboard');
    expect(resolveChefRedirectTarget('/auth/login')).toBe('/dashboard');
    expect(resolveChefRedirectTarget('/auth/signup')).toBe('/dashboard');
  });

  it('rejects external, protocol-relative, and empty redirects', () => {
    expect(resolveChefRedirectTarget('https://example.com')).toBe('/dashboard');
    expect(resolveChefRedirectTarget('//example.com')).toBe('/dashboard');
    expect(resolveChefRedirectTarget('')).toBe('/dashboard');
    expect(resolveChefRedirectTarget(null)).toBe('/dashboard');
    expect(resolveChefRedirectTarget('\\\\malicious.site')).toBe('/dashboard');
  });
});
