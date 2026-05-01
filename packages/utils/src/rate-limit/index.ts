import { getClientIp } from '../rate-limiter';
import { MemoryRateLimitStore } from './memory-store';
import { UpstashRateLimitStore } from './distributed-store';
import type {
  RateLimitDecision,
  RateLimitPolicy,
  RateLimitStore,
  RateLimitStoreStatus,
} from './types';
export * from './policies';
export * from './types';

const memoryStore = new MemoryRateLimitStore();

let cachedStore: RateLimitStore | null = null;

function isProductionLikeEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const appEnv = process.env.APP_ENV ?? '';
  return nodeEnv === 'production' || appEnv === 'staging' || appEnv === 'production';
}

function hasUpstashConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function resolveStore(): RateLimitStore {
  if (cachedStore) return cachedStore;

  if (hasUpstashConfig()) {
    cachedStore = new UpstashRateLimitStore({
      baseUrl: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    });
    return cachedStore;
  }

  cachedStore = memoryStore;
  return cachedStore;
}

export function getRateLimitProviderStatus(): RateLimitStoreStatus {
  const store = resolveStore();
  const base = store.status();

  if (base.provider === 'memory' && isProductionLikeEnvironment()) {
    return {
      provider: 'memory',
      ready: false,
      degraded: true,
      reason: 'Distributed rate-limit provider is not configured in production-like environment',
    };
  }

  return base;
}

function buildFailClosedDecision(policy: RateLimitPolicy, reason: string): RateLimitDecision {
  return {
    allowed: false,
    remaining: 0,
    retryAfter: 60,
    policy: policy.name,
    provider: 'none',
    degraded: true,
    reason,
  };
}

function buildIdentifier(
  policy: RateLimitPolicy,
  params: {
    request: Request;
    userId?: string;
    driverId?: string;
    eventId?: string;
    routeKey?: string;
  }
): string {
  const ip = getClientIp(params.request);
  const routeKey = params.routeKey ?? new URL(params.request.url).pathname;

  switch (policy.keyStrategy) {
    case 'user_id':
      return params.userId ? `user:${params.userId}` : `ip:${ip}`;
    case 'driver_id':
      return params.driverId ? `driver:${params.driverId}` : `ip:${ip}`;
    case 'event_id':
      return params.eventId ? `event:${params.eventId}` : `ip:${ip}`;
    case 'composite':
      return `ip:${ip}:route:${routeKey}:user:${params.userId ?? 'anon'}`;
    case 'ip':
    default:
      return `ip:${ip}`;
  }
}

export async function evaluateRateLimit(params: {
  request: Request;
  policy: RateLimitPolicy;
  namespace: string;
  userId?: string;
  driverId?: string;
  eventId?: string;
  routeKey?: string;
}): Promise<RateLimitDecision> {
  const status = getRateLimitProviderStatus();
  const policy = params.policy;

  if (status.degraded && policy.failBehavior === 'fail_closed' && policy.risk === 'high') {
    return buildFailClosedDecision(policy, status.reason ?? 'rate_limit_provider_unavailable');
  }

  try {
    const store = resolveStore();
    const key = buildIdentifier(policy, params);
    const result = await store.consume(key, policy, params.namespace);
    return {
      ...result,
      policy: policy.name,
      provider: store.status().provider,
      degraded: status.degraded,
      reason: status.reason,
    };
  } catch (error) {
    if (policy.failBehavior === 'fail_closed') {
      return buildFailClosedDecision(
        policy,
        error instanceof Error ? error.message : 'rate_limit_provider_error'
      );
    }
    return {
      allowed: true,
      remaining: policy.maxRequests,
      policy: policy.name,
      provider: status.provider,
      degraded: true,
      reason: error instanceof Error ? error.message : 'rate_limit_provider_error',
    };
  }
}

export function rateLimitPolicyResponse(
  decision: Pick<RateLimitDecision, 'retryAfter' | 'policy' | 'reason'>
): Response {
  const retryAfter = Math.max(1, decision.retryAfter ?? 60);
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        policy: decision.policy,
      },
      retryAfter,
      reason: decision.reason,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}
