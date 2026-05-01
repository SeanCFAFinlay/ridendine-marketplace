import type { RateLimitPolicy, RateLimitStore, RateLimitStoreStatus } from './types';

interface UpstashResult<T = string> {
  result: T;
}

export class UpstashRateLimitStore implements RateLimitStore {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(params: { baseUrl: string; token: string }) {
    this.baseUrl = params.baseUrl.replace(/\/+$/, '');
    this.token = params.token;
  }

  private async upstash<T = string>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`upstash_error_${response.status}`);
    }

    const json = (await response.json()) as UpstashResult<T>;
    return json.result;
  }

  async consume(key: string, policy: RateLimitPolicy, namespace: string) {
    const namespaced = `rl:${namespace}:${policy.name}:${key}`;
    const current = Number(await this.upstash<string>(`/incr/${encodeURIComponent(namespaced)}`));

    if (current === 1) {
      await this.upstash<string>(`/expire/${encodeURIComponent(namespaced)}/${policy.windowSeconds}`);
    }

    const ttl = Number(await this.upstash<string>(`/ttl/${encodeURIComponent(namespaced)}`));
    const allowed = current <= policy.maxRequests;
    const remaining = Math.max(0, policy.maxRequests - current);

    return {
      allowed,
      remaining,
      retryAfter: allowed ? undefined : Math.max(1, ttl),
    };
  }

  status(): RateLimitStoreStatus {
    return {
      provider: 'upstash-redis',
      ready: true,
      degraded: false,
    };
  }
}
