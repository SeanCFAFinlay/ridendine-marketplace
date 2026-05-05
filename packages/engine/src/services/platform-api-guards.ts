// ==========================================
// OPS-ADMIN API — server-side platform capability matrix
// Fail closed; never trust client-supplied roles.
// ==========================================

import type { ActorContext } from '@ridendine/types';
import { ActorRole } from '@ridendine/types';
import type { PlatformCapability } from '@ridendine/types';
import { errorResponse } from '../client-helpers';

type AR = (typeof ActorRole)[keyof typeof ActorRole];

const SUPER: readonly AR[] = [ActorRole.SUPER_ADMIN];

const FINANCE: readonly AR[] = [
  ActorRole.FINANCE_ADMIN,
  ActorRole.FINANCE_MANAGER,
  ActorRole.SUPER_ADMIN,
];

/** Line ops: agent through super (excludes support-only / finance-only). */
const OPS_LINE: readonly AR[] = [
  ActorRole.OPS_AGENT,
  ActorRole.OPS_ADMIN,
  ActorRole.OPS_MANAGER,
  ActorRole.SUPER_ADMIN,
];

/** Governance / escalations (no front-line agent). */
const OPS_GOVERNANCE: readonly AR[] = [
  ActorRole.OPS_ADMIN,
  ActorRole.OPS_MANAGER,
  ActorRole.SUPER_ADMIN,
];

/** Dispatch & driver intervention. */
const DISPATCH_OPS: readonly AR[] = OPS_LINE;

/** Read-heavy ops surfaces (orders list, deliveries read, exceptions read). */
const OPS_READ: readonly AR[] = [
  ...OPS_LINE,
  /** Support triage: read-only order/delivery context (writes stay on support_queue / ops_write). */
  ActorRole.SUPPORT_AGENT,
];

/** Dashboard + analytics (ops + finance oversight). */
const ANALYTICS_READ: readonly AR[] = [
  ActorRole.OPS_AGENT,
  ActorRole.OPS_ADMIN,
  ActorRole.OPS_MANAGER,
  ActorRole.FINANCE_ADMIN,
  ActorRole.FINANCE_MANAGER,
  ActorRole.SUPER_ADMIN,
];

/** Dashboard POST actions that mutate ops state (not finance-only). */
const DASHBOARD_ACTIONS: readonly AR[] = OPS_LINE;

/** Support queue / tickets. */
const SUPPORT_QUEUE: readonly AR[] = [
  ActorRole.SUPPORT_AGENT,
  ActorRole.OPS_AGENT,
  ActorRole.OPS_ADMIN,
  ActorRole.OPS_MANAGER,
  ActorRole.SUPER_ADMIN,
];

/** Announcements & customer notify. */
const OPS_COMMS: readonly AR[] = OPS_GOVERNANCE;

/** Promos — managers + finance + super. */
const PROMO_ROLES: readonly AR[] = [
  ActorRole.OPS_ADMIN,
  ActorRole.OPS_MANAGER,
  ActorRole.FINANCE_ADMIN,
  ActorRole.FINANCE_MANAGER,
  ActorRole.SUPER_ADMIN,
];

/** Ops line + finance (refund case creation / triage). */
const OPS_AND_FINANCE: readonly AR[] = [
  ActorRole.OPS_AGENT,
  ActorRole.OPS_ADMIN,
  ActorRole.OPS_MANAGER,
  ActorRole.FINANCE_ADMIN,
  ActorRole.FINANCE_MANAGER,
  ActorRole.SUPER_ADMIN,
];

/** @deprecated Use PlatformCapability from @ridendine/types instead. */
export type PlatformApiCapability = PlatformCapability;

const CAPABILITY_ROLES: Record<PlatformCapability, readonly AR[]> = {
  platform_settings: SUPER,
  finance_refunds_read: FINANCE,
  finance_refunds_sensitive: FINANCE,
  finance_refunds_request: OPS_AND_FINANCE,
  finance_payouts: FINANCE,
  finance_engine: FINANCE,
  finance_export_ledger: FINANCE,
  ops_export_operational: OPS_READ,
  ops_orders_read: OPS_READ,
  /** Mutations (PATCH order state, etc.) — ops line only; not support triage. */
  ops_orders_write: OPS_LINE,
  ops_entity_read: OPS_READ,
  order_override: OPS_GOVERNANCE,
  /** Order audit trail + activity log / audit API (not platform_settings). */
  audit_timeline_read: OPS_GOVERNANCE,
  dispatch_read: DISPATCH_OPS,
  dispatch_write: DISPATCH_OPS,
  exceptions_read: OPS_READ,
  exceptions_write: OPS_LINE,
  dashboard_read: ANALYTICS_READ,
  dashboard_actions: DASHBOARD_ACTIONS,
  analytics_read: ANALYTICS_READ,
  support_queue: SUPPORT_QUEUE,
  announcements: OPS_COMMS,
  promos: PROMO_ROLES,
  team_list: OPS_GOVERNANCE,
  team_manage: SUPER,
  customers_read: OPS_READ,
  customers_write: OPS_GOVERNANCE,
  chefs_governance: OPS_GOVERNANCE,
  drivers_governance: OPS_GOVERNANCE,
  deliveries_read: OPS_READ,
  deliveries_write: DISPATCH_OPS,
  engine_rules: OPS_GOVERNANCE,
  engine_maintenance: OPS_GOVERNANCE,
  storefront_ops: OPS_GOVERNANCE,
  engine_health: [...OPS_READ, ...FINANCE, ActorRole.SUPPORT_AGENT],
};

function hasAnyRole(actor: ActorContext, allowed: readonly AR[]): boolean {
  return allowed.includes(actor.role);
}

/** True when actor is authenticated and satisfies the capability (no side effects). */
export function hasPlatformApiCapability(
  actor: ActorContext | null,
  capability: PlatformCapability
): boolean {
  if (!actor) return false;
  return hasAnyRole(actor, CAPABILITY_ROLES[capability]);
}

/**
 * Returns an error Response if the actor is missing or unauthorized; otherwise null.
 */
export function guardPlatformApi(
  actor: ActorContext | null,
  capability: PlatformCapability
): Response | null {
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }
  const allowed = CAPABILITY_ROLES[capability];
  if (!hasAnyRole(actor, allowed)) {
    return errorResponse('FORBIDDEN', 'Insufficient platform role for this action', 403);
  }
  return null;
}
