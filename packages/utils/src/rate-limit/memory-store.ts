import type { RateLimitPolicy, RateLimitStore, RateLimitStoreStatus } from './types';

interface Entry {
  tokens: number;
  lastRefillAtMs: number;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly stores = new Map<string, Map<string, Entry>>();

  private getStore(namespace: string): Map<string, Entry> {
    const existing = this.stores.get(namespace);
    if (existing) return existing;
    const created = new Map<string, Entry>();
    this.stores.set(namespace, created);
    return created;
  }

  async consume(key: string, policy: RateLimitPolicy, namespace: string) {
    const now = Date.now();
    const store = this.getStore(namespace);
    const fullKey = `${namespace}:${key}`;
    const found = store.get(fullKey);

    if (!found) {
      store.set(fullKey, {
        tokens: policy.maxRequests - 1,
        lastRefillAtMs: now,
      });
      return { allowed: true, remaining: policy.maxRequests - 1 };
    }

    const elapsedSeconds = (now - found.lastRefillAtMs) / 1000;
    const refillRate = policy.maxRequests / policy.windowSeconds;
    const refilled = Math.min(policy.maxRequests, found.tokens + elapsedSeconds * refillRate);
    found.tokens = refilled;
    found.lastRefillAtMs = now;

    if (found.tokens < 1) {
      const retryAfter = Math.ceil((1 - found.tokens) / refillRate);
      return { allowed: false, remaining: 0, retryAfter };
    }

    found.tokens -= 1;
    return { allowed: true, remaining: Math.floor(found.tokens) };
  }

  status(): RateLimitStoreStatus {
    return {
      provider: 'memory',
      ready: true,
      degraded: false,
    };
  }
}
