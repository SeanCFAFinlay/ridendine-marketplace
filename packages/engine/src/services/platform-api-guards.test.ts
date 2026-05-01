import { describe, expect, it } from 'vitest';
import { ActorRole } from '@ridendine/types';
import { guardPlatformApi, hasPlatformApiCapability } from './platform-api-guards';

function actor(role: (typeof ActorRole)[keyof typeof ActorRole]) {
  return { userId: 'u1', role, entityId: 'e1' };
}

describe('guardPlatformApi', () => {
  it('returns 401 when actor is null', () => {
    const res = guardPlatformApi(null, 'ops_orders_read');
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it('returns 403 when customer role hits ops API', () => {
    const res = guardPlatformApi(actor(ActorRole.CUSTOMER), 'ops_orders_read');
    expect(res!.status).toBe(403);
  });

  it('allows support_agent for support_queue only', () => {
    expect(guardPlatformApi(actor(ActorRole.SUPPORT_AGENT), 'support_queue')).toBeNull();
    expect(guardPlatformApi(actor(ActorRole.SUPPORT_AGENT), 'finance_payouts')!.status).toBe(403);
  });

  it('allows finance_manager for finance_payouts', () => {
    expect(guardPlatformApi(actor(ActorRole.FINANCE_MANAGER), 'finance_payouts')).toBeNull();
  });

  it('allows ops_admin for dispatch_write', () => {
    expect(guardPlatformApi(actor(ActorRole.OPS_ADMIN), 'dispatch_write')).toBeNull();
  });

  it('allows super_admin for platform_settings', () => {
    expect(guardPlatformApi(actor(ActorRole.SUPER_ADMIN), 'platform_settings')).toBeNull();
  });

  it('denies ops_manager from platform_settings', () => {
    expect(guardPlatformApi(actor(ActorRole.OPS_MANAGER), 'platform_settings')!.status).toBe(403);
  });

  it('allows ops_admin for audit_timeline_read', () => {
    expect(guardPlatformApi(actor(ActorRole.OPS_ADMIN), 'audit_timeline_read')).toBeNull();
  });

  it('denies support_agent from audit_timeline_read', () => {
    expect(guardPlatformApi(actor(ActorRole.SUPPORT_AGENT), 'audit_timeline_read')!.status).toBe(
      403
    );
  });

  it('denies finance_manager from ops_orders_read', () => {
    expect(guardPlatformApi(actor(ActorRole.FINANCE_MANAGER), 'ops_orders_read')!.status).toBe(
      403
    );
  });

  it('allows support_agent for ops_orders_read (read-only triage)', () => {
    expect(guardPlatformApi(actor(ActorRole.SUPPORT_AGENT), 'ops_orders_read')).toBeNull();
  });

  it('denies support_agent from ops_orders_write', () => {
    expect(guardPlatformApi(actor(ActorRole.SUPPORT_AGENT), 'ops_orders_write')!.status).toBe(403);
  });
});

describe('hasPlatformApiCapability', () => {
  it('matches guard allow-list', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.FINANCE_ADMIN), 'finance_refunds_sensitive')).toBe(true);
    expect(hasPlatformApiCapability(actor(ActorRole.OPS_AGENT), 'finance_refunds_sensitive')).toBe(false);
  });
});
