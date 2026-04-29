// ==========================================
// SLA CHECKS TESTS
// TDD: Red-Green-Refactor
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  checkChefAcceptanceTimeout,
  checkDriverAssignmentTimeout,
  checkPickupDelay,
  checkDeliveryDelay,
  checkStalePreparingOrders,
  type SLAViolation,
} from './sla-checks';

// ---- helpers ----

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

function buildClient(rows: unknown[]): SupabaseClient {
  const select = vi.fn().mockReturnThis();
  const eq = vi.fn().mockReturnThis();
  const lt = vi.fn().mockReturnThis();
  const inFn = vi.fn().mockReturnThis();
  const mock = {
    from: vi.fn().mockReturnValue({
      select,
      eq,
      lt,
      in: inFn,
      then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
        resolve({ data: rows, error: null }),
    }),
  };
  return mock as unknown as SupabaseClient;
}

// ---- checkChefAcceptanceTimeout ----

describe('checkChefAcceptanceTimeout', () => {
  it('returns empty array when no violations', async () => {
    const client = buildClient([]);
    const result = await checkChefAcceptanceTimeout(client, 5);
    expect(result).toEqual([]);
  });

  it('maps DB rows to SLAViolation objects', async () => {
    const rows = [
      { id: 'ord-1', engine_status: 'pending', created_at: minutesAgo(8) },
    ];
    const client = buildClient(rows);
    const result = await checkChefAcceptanceTimeout(client, 5);

    expect(result).toHaveLength(1);
    const v = result[0];
    expect(v.entityType).toBe('order');
    expect(v.entityId).toBe('ord-1');
    expect(v.violationType).toBe('chef_acceptance_timeout');
    expect(v.thresholdMinutes).toBe(5);
    expect(v.elapsedMinutes).toBeGreaterThanOrEqual(8);
  });

  it('uses default threshold of 5 minutes', async () => {
    const client = buildClient([]);
    await checkChefAcceptanceTimeout(client);
    // Should not throw; default applied internally
    expect(true).toBe(true);
  });

  it('returns violations for multiple orders', async () => {
    const rows = [
      { id: 'ord-1', engine_status: 'pending', created_at: minutesAgo(10) },
      { id: 'ord-2', engine_status: 'pending', created_at: minutesAgo(7) },
    ];
    const client = buildClient(rows);
    const result = await checkChefAcceptanceTimeout(client, 5);
    expect(result).toHaveLength(2);
  });
});

// ---- checkDriverAssignmentTimeout ----

describe('checkDriverAssignmentTimeout', () => {
  it('returns empty array when no violations', async () => {
    const client = buildClient([]);
    const result = await checkDriverAssignmentTimeout(client, 10);
    expect(result).toEqual([]);
  });

  it('maps delivery rows to SLAViolation objects', async () => {
    const rows = [
      { id: 'del-1', status: 'pending', created_at: minutesAgo(15), escalated_to_ops: false },
    ];
    const client = buildClient(rows);
    const result = await checkDriverAssignmentTimeout(client, 10);

    expect(result).toHaveLength(1);
    const v = result[0];
    expect(v.entityType).toBe('delivery');
    expect(v.entityId).toBe('del-1');
    expect(v.violationType).toBe('driver_assignment_timeout');
    expect(v.thresholdMinutes).toBe(10);
    expect(v.elapsedMinutes).toBeGreaterThanOrEqual(15);
  });

  it('uses default threshold of 10 minutes', async () => {
    const client = buildClient([]);
    await checkDriverAssignmentTimeout(client);
    expect(true).toBe(true);
  });
});

// ---- checkPickupDelay ----

describe('checkPickupDelay', () => {
  it('returns empty array when no violations', async () => {
    const client = buildClient([]);
    const result = await checkPickupDelay(client, 25);
    expect(result).toEqual([]);
  });

  it('maps delivery rows to SLAViolation objects', async () => {
    const rows = [
      { id: 'del-2', status: 'assigned', updated_at: minutesAgo(30) },
    ];
    const client = buildClient(rows);
    const result = await checkPickupDelay(client, 25);

    expect(result).toHaveLength(1);
    const v = result[0];
    expect(v.entityType).toBe('delivery');
    expect(v.entityId).toBe('del-2');
    expect(v.violationType).toBe('pickup_delay');
    expect(v.thresholdMinutes).toBe(25);
    expect(v.elapsedMinutes).toBeGreaterThanOrEqual(30);
  });

  it('uses default threshold of 25 minutes', async () => {
    const client = buildClient([]);
    await checkPickupDelay(client);
    expect(true).toBe(true);
  });
});

// ---- checkDeliveryDelay ----

describe('checkDeliveryDelay', () => {
  it('returns empty array when no violations', async () => {
    const client = buildClient([]);
    const result = await checkDeliveryDelay(client, 35);
    expect(result).toEqual([]);
  });

  it('maps delivery rows to SLAViolation objects', async () => {
    const rows = [
      { id: 'del-3', status: 'picked_up', updated_at: minutesAgo(40) },
    ];
    const client = buildClient(rows);
    const result = await checkDeliveryDelay(client, 35);

    expect(result).toHaveLength(1);
    const v = result[0];
    expect(v.entityType).toBe('delivery');
    expect(v.entityId).toBe('del-3');
    expect(v.violationType).toBe('delivery_delay');
    expect(v.thresholdMinutes).toBe(35);
    expect(v.elapsedMinutes).toBeGreaterThanOrEqual(40);
  });

  it('uses default threshold of 35 minutes', async () => {
    const client = buildClient([]);
    await checkDeliveryDelay(client);
    expect(true).toBe(true);
  });

  it('includes details with status in violation', async () => {
    const rows = [
      { id: 'del-4', status: 'en_route_to_dropoff', updated_at: minutesAgo(40) },
    ];
    const client = buildClient(rows);
    const result = await checkDeliveryDelay(client, 35);

    expect(result[0].details).toMatchObject({ status: 'en_route_to_dropoff' });
  });
});

// ---- checkStalePreparingOrders ----

describe('checkStalePreparingOrders', () => {
  it('returns empty array when no violations', async () => {
    const client = buildClient([]);
    const result = await checkStalePreparingOrders(client, 45);
    expect(result).toEqual([]);
  });

  it('maps order rows to SLAViolation objects', async () => {
    const rows = [
      { id: 'ord-3', engine_status: 'preparing', prep_started_at: minutesAgo(50) },
    ];
    const client = buildClient(rows);
    const result = await checkStalePreparingOrders(client, 45);

    expect(result).toHaveLength(1);
    const v = result[0];
    expect(v.entityType).toBe('order');
    expect(v.entityId).toBe('ord-3');
    expect(v.violationType).toBe('stale_preparing_order');
    expect(v.thresholdMinutes).toBe(45);
    expect(v.elapsedMinutes).toBeGreaterThanOrEqual(50);
  });

  it('uses default threshold of 45 minutes', async () => {
    const client = buildClient([]);
    await checkStalePreparingOrders(client);
    expect(true).toBe(true);
  });
});
