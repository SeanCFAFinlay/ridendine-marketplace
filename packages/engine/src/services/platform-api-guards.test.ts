import { describe, expect, it } from 'vitest';
import { ActorRole } from '@ridendine/types';
import type { PlatformCapability } from '@ridendine/types';
import { guardPlatformApi, hasPlatformApiCapability } from './platform-api-guards';
import type { ActorContext } from '@ridendine/types';

function actor(role: (typeof ActorRole)[keyof typeof ActorRole]): ActorContext {
  return { userId: 'u1', role, entityId: 'e1' };
}

// All non-platform roles that should be denied platform API access
const NON_PLATFORM_ROLES = [
  ActorRole.CUSTOMER,
  ActorRole.CHEF_USER,
  ActorRole.DRIVER,
] as const;

// All platform roles
const ALL_PLATFORM_ROLES = [
  ActorRole.SUPER_ADMIN,
  ActorRole.OPS_ADMIN,
  ActorRole.OPS_MANAGER,
  ActorRole.OPS_AGENT,
  ActorRole.FINANCE_ADMIN,
  ActorRole.FINANCE_MANAGER,
  ActorRole.SUPPORT_AGENT,
] as const;

// ---------------------------------------------------------------------------
// Fixtures: [capability, allowed roles, denied roles]
// ---------------------------------------------------------------------------

interface CapabilityFixture {
  capability: PlatformCapability;
  allowed: ReadonlyArray<(typeof ActorRole)[keyof typeof ActorRole]>;
  denied: ReadonlyArray<(typeof ActorRole)[keyof typeof ActorRole]>;
}

const FIXTURES: CapabilityFixture[] = [
  {
    capability: 'platform_settings',
    allowed: [ActorRole.SUPER_ADMIN],
    denied: [ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER, ActorRole.OPS_AGENT,
             ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER, ActorRole.SUPPORT_AGENT,
             ActorRole.CUSTOMER, ActorRole.CHEF_USER, ActorRole.DRIVER],
  },
  {
    capability: 'finance_refunds_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.OPS_ADMIN, ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT,
             ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'finance_refunds_sensitive',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.OPS_ADMIN, ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT,
             ActorRole.CUSTOMER, ActorRole.CHEF_USER],
  },
  {
    capability: 'finance_refunds_request',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'finance_payouts',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.OPS_ADMIN, ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT,
             ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'finance_engine',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.OPS_ADMIN, ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT,
             ActorRole.CUSTOMER],
  },
  {
    capability: 'finance_export_ledger',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER, ActorRole.OPS_AGENT,
             ActorRole.SUPPORT_AGENT, ActorRole.CUSTOMER],
  },
  {
    capability: 'ops_export_operational',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT],
    denied: [ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER, ActorRole.CUSTOMER],
  },
  {
    capability: 'ops_orders_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT],
    denied: [ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER, ActorRole.CUSTOMER,
             ActorRole.DRIVER],
  },
  {
    capability: 'ops_orders_write',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER,
             ActorRole.DRIVER],
  },
  {
    capability: 'ops_entity_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT],
    denied: [ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER, ActorRole.CUSTOMER],
  },
  {
    capability: 'order_override',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'audit_timeline_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER, ActorRole.CHEF_USER],
  },
  {
    capability: 'dispatch_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER],
  },
  {
    capability: 'dispatch_write',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER,
             ActorRole.DRIVER],
  },
  {
    capability: 'exceptions_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT],
    denied: [ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'exceptions_write',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER],
  },
  {
    capability: 'dashboard_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'dashboard_actions',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER],
  },
  {
    capability: 'analytics_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'support_queue',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT],
    denied: [ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER, ActorRole.CUSTOMER,
             ActorRole.DRIVER],
  },
  {
    capability: 'announcements',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'promos',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.CUSTOMER,
             ActorRole.DRIVER],
  },
  {
    capability: 'team_list',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER],
  },
  {
    capability: 'team_manage',
    allowed: [ActorRole.SUPER_ADMIN],
    denied: [ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER, ActorRole.OPS_AGENT,
             ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER],
  },
  {
    capability: 'customers_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT],
    denied: [ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'customers_write',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER],
  },
  {
    capability: 'chefs_governance',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER, ActorRole.CHEF_USER],
  },
  {
    capability: 'drivers_governance',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'deliveries_read',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT],
    denied: [ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER, ActorRole.DRIVER],
  },
  {
    capability: 'deliveries_write',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT],
    denied: [ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.CUSTOMER],
  },
  {
    capability: 'engine_rules',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER],
  },
  {
    capability: 'engine_maintenance',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER],
  },
  {
    capability: 'storefront_ops',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER],
    denied: [ActorRole.OPS_AGENT, ActorRole.SUPPORT_AGENT, ActorRole.FINANCE_ADMIN,
             ActorRole.CUSTOMER, ActorRole.CHEF_USER],
  },
  {
    capability: 'engine_health',
    allowed: [ActorRole.SUPER_ADMIN, ActorRole.OPS_ADMIN, ActorRole.OPS_MANAGER,
              ActorRole.OPS_AGENT, ActorRole.FINANCE_ADMIN, ActorRole.FINANCE_MANAGER,
              ActorRole.SUPPORT_AGENT],
    denied: [ActorRole.CUSTOMER, ActorRole.CHEF_USER, ActorRole.DRIVER],
  },
];

// ---------------------------------------------------------------------------
// guardPlatformApi — null actor
// ---------------------------------------------------------------------------

describe('guardPlatformApi — null actor', () => {
  it('returns 401 when actor is null for ops_orders_read', () => {
    const res = guardPlatformApi(null, 'ops_orders_read');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 401 when actor is null for platform_settings', () => {
    const res = guardPlatformApi(null, 'platform_settings');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 401 when actor is null for finance_payouts', () => {
    const res = guardPlatformApi(null, 'finance_payouts');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 401 when actor is null for engine_health', () => {
    const res = guardPlatformApi(null, 'engine_health');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Non-platform actors hitting any platform capability → 403
// ---------------------------------------------------------------------------

describe('guardPlatformApi — non-platform actors denied all capabilities', () => {
  it.each(NON_PLATFORM_ROLES)('%s is denied platform_settings', (role) => {
    const res = guardPlatformApi(actor(role), 'platform_settings');
    expect(res!.status).toBe(403);
  });

  it.each(NON_PLATFORM_ROLES)('%s is denied ops_orders_read', (role) => {
    const res = guardPlatformApi(actor(role), 'ops_orders_read');
    expect(res!.status).toBe(403);
  });

  it.each(NON_PLATFORM_ROLES)('%s is denied finance_payouts', (role) => {
    const res = guardPlatformApi(actor(role), 'finance_payouts');
    expect(res!.status).toBe(403);
  });

  it.each(NON_PLATFORM_ROLES)('%s is denied dispatch_write', (role) => {
    const res = guardPlatformApi(actor(role), 'dispatch_write');
    expect(res!.status).toBe(403);
  });

  it.each(NON_PLATFORM_ROLES)('%s is denied engine_health', (role) => {
    const res = guardPlatformApi(actor(role), 'engine_health');
    expect(res!.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Per-capability: allowed roles return null, denied roles return 403
// ---------------------------------------------------------------------------

describe.each(FIXTURES)('$capability', ({ capability, allowed, denied }) => {
  it.each(allowed as string[])('allows %s', (role) => {
    const a = actor(role as (typeof ActorRole)[keyof typeof ActorRole]);
    const res = guardPlatformApi(a, capability);
    expect(res).toBeNull();
  });

  it.each(denied as string[])('denies %s', (role) => {
    const a = actor(role as (typeof ActorRole)[keyof typeof ActorRole]);
    const res = guardPlatformApi(a, capability);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// hasPlatformApiCapability — companion function
// ---------------------------------------------------------------------------

describe('hasPlatformApiCapability', () => {
  it('returns false for null actor', () => {
    expect(hasPlatformApiCapability(null, 'ops_orders_read')).toBe(false);
  });

  it('returns false for null actor on any capability', () => {
    expect(hasPlatformApiCapability(null, 'platform_settings')).toBe(false);
    expect(hasPlatformApiCapability(null, 'engine_health')).toBe(false);
    expect(hasPlatformApiCapability(null, 'finance_payouts')).toBe(false);
  });

  it('returns true when actor has the capability', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.FINANCE_ADMIN), 'finance_refunds_sensitive')).toBe(true);
    expect(hasPlatformApiCapability(actor(ActorRole.SUPER_ADMIN), 'platform_settings')).toBe(true);
    expect(hasPlatformApiCapability(actor(ActorRole.SUPPORT_AGENT), 'support_queue')).toBe(true);
  });

  it('returns false when actor lacks the capability', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.OPS_AGENT), 'finance_refunds_sensitive')).toBe(false);
    expect(hasPlatformApiCapability(actor(ActorRole.OPS_MANAGER), 'platform_settings')).toBe(false);
    expect(hasPlatformApiCapability(actor(ActorRole.FINANCE_MANAGER), 'ops_orders_read')).toBe(false);
  });

  it('matches guard allow-list for finance_admin + finance_refunds_sensitive', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.FINANCE_ADMIN), 'finance_refunds_sensitive')).toBe(true);
    expect(hasPlatformApiCapability(actor(ActorRole.OPS_AGENT), 'finance_refunds_sensitive')).toBe(false);
  });

  it('support_agent can read support_queue but not ops_orders_write', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.SUPPORT_AGENT), 'support_queue')).toBe(true);
    expect(hasPlatformApiCapability(actor(ActorRole.SUPPORT_AGENT), 'ops_orders_write')).toBe(false);
  });

  it('finance_manager cannot access ops_orders_read (no cross-domain access)', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.FINANCE_MANAGER), 'ops_orders_read')).toBe(false);
  });

  it('super_admin has engine_health access', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.SUPER_ADMIN), 'engine_health')).toBe(true);
  });

  it.each(NON_PLATFORM_ROLES)('%s has no platform capabilities', (role) => {
    const a = actor(role);
    expect(hasPlatformApiCapability(a, 'platform_settings')).toBe(false);
    expect(hasPlatformApiCapability(a, 'ops_orders_read')).toBe(false);
    expect(hasPlatformApiCapability(a, 'finance_payouts')).toBe(false);
  });
});
