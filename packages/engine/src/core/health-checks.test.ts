// ==========================================
// HEALTH CHECKS TESTS
// TDD: Red-Green-Refactor
// ==========================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  checkDatabaseHealth,
  checkEngineHealth,
  checkDispatchHealth,
  checkPaymentHealth,
  checkSystemHealth,
  type HealthStatus,
} from './health-checks';

// ---- helpers ----

function buildQueryChain(result: { data?: unknown; count?: number | null; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'in', 'gte', 'limit'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // Promise resolution
  chain.then = (resolve: (v: unknown) => void) => resolve({ ...result, error: result.error ?? null });
  return chain;
}

function buildClient(overrides: Record<string, { data?: unknown; count?: number | null; error?: unknown }> = {}) {
  const defaultResult = { data: [], count: 0 };
  return {
    from: vi.fn((table: string) => buildQueryChain(overrides[table] ?? defaultResult)),
  } as unknown as SupabaseClient;
}

// ---- checkDatabaseHealth ----

describe('checkDatabaseHealth', () => {
  it('returns healthy when query succeeds', async () => {
    const client = buildClient({ orders: { data: [] } });
    const result = await checkDatabaseHealth(client);
    expect(result.status).toBe('healthy');
    expect(result.timestamp).toBeTruthy();
    expect(result.details).toBeDefined();
  });

  it('returns down when query fails', async () => {
    const client = buildClient({ orders: { error: { message: 'connection refused' } } });
    const result = await checkDatabaseHealth(client);
    expect(result.status).toBe('down');
    expect(result.details).toHaveProperty('error');
  });

  it('includes a valid ISO timestamp', async () => {
    const client = buildClient({ orders: { data: [] } });
    const result = await checkDatabaseHealth(client);
    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});

// ---- checkEngineHealth ----

describe('checkEngineHealth', () => {
  it('returns healthy when no breaches and no open exceptions', async () => {
    const client = buildClient({
      sla_timers: { count: 3 },
      order_exceptions: { count: 2 },
    });
    // Need to handle two sla_timers queries (active and breached)
    // Use a custom client that tracks call count
    let slaCallCount = 0;
    const customClient = {
      from: vi.fn((table: string) => {
        if (table === 'sla_timers') {
          slaCallCount++;
          const count = slaCallCount === 1 ? 5 : 0; // active=5, breached=0
          return buildQueryChain({ count });
        }
        if (table === 'order_exceptions') {
          return buildQueryChain({ count: 2 });
        }
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkEngineHealth(customClient);
    expect(result.status).toBe('healthy');
  });

  it('returns degraded when breached SLA timers > 5', async () => {
    let slaCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'sla_timers') {
          slaCallCount++;
          const count = slaCallCount === 1 ? 10 : 6; // active=10, breached=6
          return buildQueryChain({ count });
        }
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkEngineHealth(client);
    expect(result.status).toBe('degraded');
  });

  it('returns degraded when open exceptions > 10', async () => {
    let slaCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'sla_timers') {
          slaCallCount++;
          return buildQueryChain({ count: slaCallCount === 1 ? 5 : 0 });
        }
        if (table === 'order_exceptions') {
          return buildQueryChain({ count: 11 });
        }
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkEngineHealth(client);
    expect(result.status).toBe('degraded');
  });

  it('returns down when query fails', async () => {
    const client = buildClient({ sla_timers: { error: { message: 'db error' } } });
    const result = await checkEngineHealth(client);
    expect(result.status).toBe('down');
  });

  it('includes active and breached counts in details', async () => {
    let slaCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'sla_timers') {
          slaCallCount++;
          return buildQueryChain({ count: slaCallCount === 1 ? 4 : 1 });
        }
        return buildQueryChain({ count: 3 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkEngineHealth(client);
    expect(result.details).toHaveProperty('activeSlaTimers');
    expect(result.details).toHaveProperty('breachedSlaTimers');
    expect(result.details).toHaveProperty('openExceptions');
  });
});

// ---- checkDispatchHealth ----

describe('checkDispatchHealth', () => {
  it('returns healthy when drivers online', async () => {
    let callCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'driver_presence') return buildQueryChain({ count: 3 });
        if (table === 'deliveries') return buildQueryChain({ count: 2 });
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkDispatchHealth(client);
    expect(result.status).toBe('healthy');
  });

  it('returns degraded when 0 drivers online and pending deliveries > 0', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'driver_presence') return buildQueryChain({ count: 0 });
        if (table === 'deliveries') return buildQueryChain({ count: 5 });
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkDispatchHealth(client);
    expect(result.status).toBe('degraded');
  });

  it('returns healthy when 0 drivers and 0 pending deliveries', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'driver_presence') return buildQueryChain({ count: 0 });
        if (table === 'deliveries') return buildQueryChain({ count: 0 });
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkDispatchHealth(client);
    expect(result.status).toBe('healthy');
  });

  it('returns down when query fails', async () => {
    const client = buildClient({ driver_presence: { error: { message: 'db error' } } });
    const result = await checkDispatchHealth(client);
    expect(result.status).toBe('down');
  });

  it('includes driver and delivery counts in details', async () => {
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'driver_presence') return buildQueryChain({ count: 2 });
        if (table === 'deliveries') return buildQueryChain({ count: 1 });
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkDispatchHealth(client);
    expect(result.details).toHaveProperty('onlineDrivers');
    expect(result.details).toHaveProperty('pendingDeliveries');
  });
});

// ---- checkPaymentHealth ----

describe('checkPaymentHealth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns healthy when Stripe key exists and no recent failures', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    const client = buildClient({ orders: { count: 0 } });
    const result = await checkPaymentHealth(client);
    expect(result.status).toBe('healthy');
  });

  it('returns degraded when STRIPE_SECRET_KEY is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const client = buildClient({ orders: { count: 0 } });
    const result = await checkPaymentHealth(client);
    expect(result.status).toBe('degraded');
    expect(result.details).toHaveProperty('stripeConfigured', false);
  });

  it('returns degraded when >5 failures in last hour', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    const client = buildClient({ orders: { count: 6 } });
    const result = await checkPaymentHealth(client);
    expect(result.status).toBe('degraded');
  });

  it('returns healthy with exactly 5 failures (boundary)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    const client = buildClient({ orders: { count: 5 } });
    const result = await checkPaymentHealth(client);
    expect(result.status).toBe('healthy');
  });

  it('returns down when query fails', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    const client = buildClient({ orders: { error: { message: 'db error' } } });
    const result = await checkPaymentHealth(client);
    expect(result.status).toBe('down');
  });

  it('includes recentFailures and stripeConfigured in details', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    const client = buildClient({ orders: { count: 2 } });
    const result = await checkPaymentHealth(client);
    expect(result.details).toHaveProperty('recentFailures');
    expect(result.details).toHaveProperty('stripeConfigured');
  });
});

// ---- checkSystemHealth ----

describe('checkSystemHealth', () => {
  it('returns healthy overall when all components healthy', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    let slaCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'sla_timers') {
          slaCallCount++;
          return buildQueryChain({ count: slaCallCount % 2 === 1 ? 3 : 0 });
        }
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkSystemHealth(client);
    expect(result.overall.status).toBe('healthy');
    expect(result.components).toHaveProperty('database');
    expect(result.components).toHaveProperty('engine');
    expect(result.components).toHaveProperty('dispatch');
    expect(result.components).toHaveProperty('payment');
  });

  it('returns down overall when any component is down', async () => {
    const client = buildClient({
      orders: { error: { message: 'db down' } },
    });
    const result = await checkSystemHealth(client);
    expect(result.overall.status).toBe('down');
  });

  it('returns degraded overall when any component is degraded but none down', async () => {
    process.env.STRIPE_SECRET_KEY = undefined as unknown as string;
    delete process.env.STRIPE_SECRET_KEY;

    let slaCallCount = 0;
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'sla_timers') {
          slaCallCount++;
          return buildQueryChain({ count: slaCallCount % 2 === 1 ? 3 : 0 });
        }
        if (table === 'driver_presence') return buildQueryChain({ count: 2 });
        if (table === 'deliveries') return buildQueryChain({ count: 0 });
        return buildQueryChain({ count: 0 });
      }),
    } as unknown as SupabaseClient;

    const result = await checkSystemHealth(client);
    expect(result.overall.status).toBe('degraded');
  });

  it('overall status is down takes precedence over degraded', async () => {
    // database down, payment degraded
    delete process.env.STRIPE_SECRET_KEY;
    const client = buildClient({
      orders: { error: { message: 'db down' } },
    });
    const result = await checkSystemHealth(client);
    expect(result.overall.status).toBe('down');
  });
});
