// ==========================================
// HEALTH CHECKS
// Health check functions for API endpoints.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  details: Record<string, unknown>;
}

function now(): string {
  return new Date().toISOString();
}

function oneHourAgo(): string {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString();
}

// ---- public functions ----

export async function checkDatabaseHealth(client: SupabaseClient): Promise<HealthStatus> {
  const { error } = await (client.from('orders').select('id').limit(1) as unknown as Promise<{ data: unknown; error: unknown }>);

  if (error) {
    return { status: 'down', timestamp: now(), details: { error } };
  }

  return { status: 'healthy', timestamp: now(), details: {} };
}

export async function checkEngineHealth(client: SupabaseClient): Promise<HealthStatus> {
  try {
    const [activeResult, breachedResult, exceptionsResult] = await Promise.all([
      client
        .from('sla_timers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active') as unknown as Promise<{ count: number | null; error: unknown }>,
      client
        .from('sla_timers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'breached') as unknown as Promise<{ count: number | null; error: unknown }>,
      client
        .from('order_exceptions')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'escalated']) as unknown as Promise<{ count: number | null; error: unknown }>,
    ]);

    if (activeResult.error || breachedResult.error || exceptionsResult.error) {
      const error = activeResult.error ?? breachedResult.error ?? exceptionsResult.error;
      return { status: 'down', timestamp: now(), details: { error } };
    }

    const activeSlaTimers = activeResult.count ?? 0;
    const breachedSlaTimers = breachedResult.count ?? 0;
    const openExceptions = exceptionsResult.count ?? 0;

    const isDegraded = breachedSlaTimers > 5 || openExceptions > 10;

    return {
      status: isDegraded ? 'degraded' : 'healthy',
      timestamp: now(),
      details: { activeSlaTimers, breachedSlaTimers, openExceptions },
    };
  } catch (error) {
    return { status: 'down', timestamp: now(), details: { error } };
  }
}

export async function checkDispatchHealth(client: SupabaseClient): Promise<HealthStatus> {
  try {
    const [driversResult, deliveriesResult] = await Promise.all([
      client
        .from('driver_presence')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'online') as unknown as Promise<{ count: number | null; error: unknown }>,
      client
        .from('deliveries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending') as unknown as Promise<{ count: number | null; error: unknown }>,
    ]);

    if (driversResult.error || deliveriesResult.error) {
      const error = driversResult.error ?? deliveriesResult.error;
      return { status: 'down', timestamp: now(), details: { error } };
    }

    const onlineDrivers = driversResult.count ?? 0;
    const pendingDeliveries = deliveriesResult.count ?? 0;

    const isDegraded = onlineDrivers === 0 && pendingDeliveries > 0;

    return {
      status: isDegraded ? 'degraded' : 'healthy',
      timestamp: now(),
      details: { onlineDrivers, pendingDeliveries },
    };
  } catch (error) {
    return { status: 'down', timestamp: now(), details: { error } };
  }
}

export async function checkPaymentHealth(client: SupabaseClient): Promise<HealthStatus> {
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  if (!stripeConfigured) {
    return {
      status: 'degraded',
      timestamp: now(),
      details: { stripeConfigured: false, recentFailures: null },
    };
  }

  try {
    const { count, error } = await (client
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'failed')
      .gte('updated_at', oneHourAgo()) as unknown as Promise<{ count: number | null; error: unknown }>);

    if (error) {
      return { status: 'down', timestamp: now(), details: { error } };
    }

    const recentFailures = count ?? 0;
    const isDegraded = recentFailures > 5;

    return {
      status: isDegraded ? 'degraded' : 'healthy',
      timestamp: now(),
      details: { stripeConfigured: true, recentFailures },
    };
  } catch (error) {
    return { status: 'down', timestamp: now(), details: { error } };
  }
}

export async function checkSystemHealth(
  client: SupabaseClient,
): Promise<{ overall: HealthStatus; components: Record<string, HealthStatus> }> {
  const [database, engine, dispatch, payment] = await Promise.all([
    checkDatabaseHealth(client),
    checkEngineHealth(client),
    checkDispatchHealth(client),
    checkPaymentHealth(client),
  ]);

  const components = { database, engine, dispatch, payment };
  const statuses = Object.values(components).map((c) => c.status);

  const overallStatus = statuses.includes('down')
    ? 'down'
    : statuses.includes('degraded')
      ? 'degraded'
      : 'healthy';

  return {
    overall: { status: overallStatus, timestamp: now(), details: {} },
    components,
  };
}
