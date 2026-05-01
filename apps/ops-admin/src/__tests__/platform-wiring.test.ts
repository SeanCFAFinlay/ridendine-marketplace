import { ActorRole } from '@ridendine/types';
import { hasPlatformApiCapability } from '@ridendine/engine/server';

function actor(role: (typeof ActorRole)[keyof typeof ActorRole]) {
  return { userId: 'test-user', role, entityId: 'e1' };
}

/**
 * Mirrors API `guardPlatformApi` allow/deny without constructing `Response`
 * (Jest jsdom does not define global `Response` for engine `errorResponse`).
 */
describe('ops-admin platform API wiring (Phase 10)', () => {
  it('denies unauthenticated actor for finance export', () => {
    expect(hasPlatformApiCapability(null, 'finance_export_ledger')).toBe(false);
  });

  it('denies customer role for ops orders read', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.CUSTOMER), 'ops_orders_read')).toBe(false);
  });

  it('denies chef role for ops orders read', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.CHEF), 'ops_orders_read')).toBe(false);
  });

  it('denies driver role for ops orders read', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.DRIVER), 'ops_orders_read')).toBe(false);
  });

  it('allows finance_manager for finance_export_ledger', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.FINANCE_MANAGER), 'finance_export_ledger')).toBe(
      true
    );
  });

  it('denies finance_manager from ops_orders_read', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.FINANCE_MANAGER), 'ops_orders_read')).toBe(
      false
    );
  });

  it('denies finance_manager from support_queue (Phase 12)', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.FINANCE_MANAGER), 'support_queue')).toBe(
      false
    );
  });

  it('allows support_agent for ops_orders_read (read-only)', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.SUPPORT_AGENT), 'ops_orders_read')).toBe(true);
  });

  it('denies support_agent from ops_orders_write', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.SUPPORT_AGENT), 'ops_orders_write')).toBe(
      false
    );
  });

  it('denies support_agent from order_override', () => {
    expect(hasPlatformApiCapability(actor(ActorRole.SUPPORT_AGENT), 'order_override')).toBe(false);
  });
});
