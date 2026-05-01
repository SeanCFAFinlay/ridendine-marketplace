import { describe, expect, it } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from './rate-limiter';

describe('checkRateLimit', () => {
  const config = { maxRequests: 3, windowSeconds: 60 };

  it('allows requests within limit', () => {
    const result = checkRateLimit('test-ip-1', config, 'test-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks after limit exceeded', () => {
    const store = 'test-block';
    checkRateLimit('ip-block', config, store);
    checkRateLimit('ip-block', config, store);
    checkRateLimit('ip-block', config, store);
    const result = checkRateLimit('ip-block', config, store);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('tracks different IPs independently', () => {
    const store = 'test-independent';
    checkRateLimit('ip-a', config, store);
    checkRateLimit('ip-a', config, store);
    checkRateLimit('ip-a', config, store);

    const resultA = checkRateLimit('ip-a', config, store);
    const resultB = checkRateLimit('ip-b', config, store);

    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

  it('uses different stores independently', () => {
    checkRateLimit('ip-store', config, 'store-x');
    checkRateLimit('ip-store', config, 'store-x');
    checkRateLimit('ip-store', config, 'store-x');

    const blocked = checkRateLimit('ip-store', config, 'store-x');
    const allowed = checkRateLimit('ip-store', config, 'store-y');

    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it('driverLocation preset blocks after maxRequests in window', () => {
    const store = 'driver-location-preset-test';
    const cfg = RATE_LIMITS.driverLocation;
    const id = 'driver-uuid-test-1';
    let last: ReturnType<typeof checkRateLimit> = { allowed: true, remaining: 0 };
    for (let i = 0; i < cfg.maxRequests; i++) {
      last = checkRateLimit(id, cfg, store);
      expect(last.allowed).toBe(true);
    }
    const blocked = checkRateLimit(id, cfg, store);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeDefined();
  });
});
