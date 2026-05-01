export type RateLimitFailBehavior = 'fail_closed' | 'fail_open';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitPolicy extends RateLimitConfig {
  name: string;
  keyStrategy: 'ip' | 'user_id' | 'driver_id' | 'event_id' | 'composite';
  failBehavior: RateLimitFailBehavior;
  risk: 'high' | 'medium' | 'low';
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  policy: string;
  provider: string;
  degraded?: boolean;
  reason?: string;
}

export interface RateLimitStoreStatus {
  provider: string;
  ready: boolean;
  degraded: boolean;
  reason?: string;
}

export interface RateLimitStore {
  consume(
    key: string,
    policy: RateLimitPolicy,
    namespace: string
  ): Promise<Pick<RateLimitDecision, 'allowed' | 'remaining' | 'retryAfter'>>;
  status(): RateLimitStoreStatus;
}
