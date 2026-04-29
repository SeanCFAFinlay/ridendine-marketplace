// ==========================================
// IN-MEMORY RATE LIMITER
// Simple token bucket implementation for API route protection.
// Per-IP limiting with automatic cleanup of stale entries.
// No external dependencies — works on Vercel serverless.
// Note: Per-instance only (each serverless function has its own bucket).
// For distributed limiting, use Upstash Redis.
// ==========================================

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterConfig {
  /** Max requests in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(name: string): Map<string, RateLimitEntry> {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  return stores.get(name)!;
}

// Clean up stale entries every 60 seconds
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        if (now - entry.lastRefill > 300_000) { // 5 min stale
          store.delete(key);
        }
      }
    }
  }, 60_000);
  // Don't block process exit
  if (cleanupInterval.unref) cleanupInterval.unref();
}

/**
 * Check if a request should be rate limited.
 * Returns { allowed: true } or { allowed: false, retryAfter: seconds }.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimiterConfig,
  storeName = 'default'
): { allowed: boolean; remaining: number; retryAfter?: number } {
  ensureCleanup();
  const store = getStore(storeName);
  const now = Date.now();

  let entry = store.get(identifier);

  if (!entry) {
    entry = { tokens: config.maxRequests - 1, lastRefill: now };
    store.set(identifier, entry);
    return { allowed: true, remaining: entry.tokens };
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - entry.lastRefill) / 1000;
  const refillRate = config.maxRequests / config.windowSeconds;
  const newTokens = Math.min(config.maxRequests, entry.tokens + elapsed * refillRate);

  entry.tokens = newTokens;
  entry.lastRefill = now;

  if (entry.tokens < 1) {
    const retryAfter = Math.ceil((1 - entry.tokens) / refillRate);
    return { allowed: false, remaining: 0, retryAfter };
  }

  entry.tokens -= 1;
  return { allowed: true, remaining: Math.floor(entry.tokens) };
}

/**
 * Extract client IP from request headers (works on Vercel).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

/**
 * Preset rate limit configs for common use cases.
 */
export const RATE_LIMITS = {
  /** Auth endpoints: 5 attempts per 60 seconds */
  auth: { maxRequests: 5, windowSeconds: 60 },
  /** Checkout: 3 per 60 seconds */
  checkout: { maxRequests: 3, windowSeconds: 60 },
  /** General API: 60 per 60 seconds */
  api: { maxRequests: 60, windowSeconds: 60 },
  /** Upload: 10 per 60 seconds */
  upload: { maxRequests: 10, windowSeconds: 60 },
  /** Webhook: 100 per 60 seconds (Stripe sends bursts) */
  webhook: { maxRequests: 100, windowSeconds: 60 },
} as const;

/**
 * Helper: create a rate-limited response.
 */
export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests', retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
}
