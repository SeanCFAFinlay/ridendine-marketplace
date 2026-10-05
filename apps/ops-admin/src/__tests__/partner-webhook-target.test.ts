import { assertSafeWebhookTarget } from '@/lib/partner-webhooks';

/**
 * Partner webhook URLs are operator-registered, so this is a low-likelihood
 * SSRF surface — but it is the only outbound request this server makes to an
 * address the codebase does not choose. These assertions pin the guard.
 */
describe('assertSafeWebhookTarget', () => {
  it('accepts a normal public HTTPS endpoint', () => {
    const r = assertSafeWebhookTarget('https://partner.example.com/hooks/ridendine');
    expect(r.ok).toBe(true);
  });

  it('rejects plaintext HTTP', () => {
    const r = assertSafeWebhookTarget('http://partner.example.com/hook');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/not https/);
  });

  it.each([
    ['https://localhost/hook', 'localhost'],
    ['https://api.localhost/hook', 'localhost subdomain'],
    ['https://vault.internal/hook', '.internal TLD'],
  ])('rejects internal hostname %s (%s)', (url) => {
    expect(assertSafeWebhookTarget(url).ok).toBe(false);
  });

  it.each([
    ['https://127.0.0.1/hook', 'IPv4 loopback'],
    ['https://10.1.2.3/hook', 'RFC1918 10/8'],
    ['https://172.16.0.9/hook', 'RFC1918 172.16/12'],
    ['https://172.31.255.1/hook', 'RFC1918 172.31 upper bound'],
    ['https://192.168.1.1/hook', 'RFC1918 192.168/16'],
    ['https://0.0.0.0/hook', 'unspecified'],
    ['https://100.64.0.1/hook', 'carrier-grade NAT'],
  ])('rejects private IPv4 %s (%s)', (url) => {
    expect(assertSafeWebhookTarget(url).ok).toBe(false);
  });

  it('rejects the cloud metadata endpoint', () => {
    // The single most valuable SSRF target on any cloud host.
    const r = assertSafeWebhookTarget('https://169.254.169.254/latest/meta-data/');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/private IPv4/);
  });

  it.each([
    ['https://[::1]/hook', 'IPv6 loopback'],
    ['https://[fd00::1]/hook', 'IPv6 unique-local'],
    ['https://[fe80::1]/hook', 'IPv6 link-local'],
  ])('rejects private IPv6 %s (%s)', (url) => {
    expect(assertSafeWebhookTarget(url).ok).toBe(false);
  });

  it('does not reject public addresses that merely look similar', () => {
    // 172.32 is outside RFC1918; 11.x and 192.169.x are public.
    expect(assertSafeWebhookTarget('https://172.32.0.1/hook').ok).toBe(true);
    expect(assertSafeWebhookTarget('https://11.0.0.1/hook').ok).toBe(true);
    expect(assertSafeWebhookTarget('https://192.169.1.1/hook').ok).toBe(true);
  });

  it('rejects a malformed URL', () => {
    const r = assertSafeWebhookTarget('not a url');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/malformed/);
  });
});
