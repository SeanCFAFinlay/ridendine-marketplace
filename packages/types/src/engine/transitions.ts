// ==========================================
// ORDER STATE TRANSITION MATRIX
// ==========================================

import {
  EngineOrderStatus,
  ActorRole,
  DomainEventType,
  SLAType,
  StateTransition,
} from './index';

type OrderAction =
  | 'create_order'
  | 'authorize_payment'
  | 'capture_payment'
  | 'submit_order'
  | 'accept_order'
  | 'reject_order'
  | 'start_preparing'
  | 'update_prep_time'
  | 'mark_ready'
  | 'request_dispatch'
  | 'assign_driver'
  | 'driver_accept'
  | 'driver_decline'
  | 'start_pickup_route'
  | 'confirm_pickup'
  | 'start_dropoff_route'
  | 'confirm_delivery'
  | 'complete_order'
  | 'request_cancel'
  | 'cancel_order'
  | 'request_refund'
  | 'process_refund'
  | 'mark_failed'
  | 'mark_exception'
  | 'ops_override';

export const ORDER_TRANSITIONS: StateTransition<EngineOrderStatus, OrderAction>[] = [
  // === CREATION & PAYMENT ===
  {
    from: [],
    to: EngineOrderStatus.DRAFT,
    action: 'create_order',
    allowedActors: [ActorRole.CUSTOMER, ActorRole.SYSTEM],
    emittedEvents: [DomainEventType.ORDER_CREATED],
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.DRAFT, EngineOrderStatus.CHECKOUT_PENDING],
    to: EngineOrderStatus.PAYMENT_AUTHORIZED,
    action: 'authorize_payment',
    allowedActors: [ActorRole.SYSTEM],
    preconditions: ['valid_payment_method', 'cart_not_empty', 'delivery_address_valid'],
    emittedEvents: [DomainEventType.ORDER_PAYMENT_AUTHORIZED],
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.DRAFT, EngineOrderStatus.CHECKOUT_PENDING],
    to: EngineOrderStatus.PAYMENT_FAILED,
    action: 'authorize_payment',
    allowedActors: [ActorRole.SYSTEM],
    emittedEvents: [DomainEventType.ORDER_PAYMENT_FAILED],
    auditRequired: true,
  },

  // === SUBMISSION TO KITCHEN ===
  {
    from: [EngineOrderStatus.PAYMENT_AUTHORIZED],
    to: EngineOrderStatus.PENDING,
    action: 'submit_order',
    allowedActors: [ActorRole.SYSTEM],
    sideEffects: ['notify_chef', 'start_chef_response_sla'],
    emittedEvents: [DomainEventType.ORDER_SUBMITTED],
    slaType: SLAType.CHEF_RESPONSE,
    auditRequired: true,
  },

  // === CHEF ACCEPTANCE/REJECTION ===
  {
    from: [EngineOrderStatus.PENDING],
    to: EngineOrderStatus.ACCEPTED,
    action: 'accept_order',
    allowedActors: [ActorRole.CHEF_USER, ActorRole.CHEF_MANAGER, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER, ActorRole.SUPER_ADMIN],
    sideEffects: ['notify_customer', 'complete_chef_response_sla', 'add_to_kitchen_queue'],
    emittedEvents: [DomainEventType.ORDER_ACCEPTED],
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.PENDING],
    to: EngineOrderStatus.REJECTED,
    action: 'reject_order',
    allowedActors: [ActorRole.CHEF_USER, ActorRole.CHEF_MANAGER, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER, ActorRole.SUPER_ADMIN],
    preconditions: ['rejection_reason_provided'],
    sideEffects: ['notify_customer', 'void_payment_auth', 'complete_chef_response_sla'],
    emittedEvents: [DomainEventType.ORDER_REJECTED],
    auditRequired: true,
  },

  // === PREPARATION ===
  {
    from: [EngineOrderStatus.ACCEPTED],
    to: EngineOrderStatus.PREPARING,
    action: 'start_preparing',
    allowedActors: [ActorRole.CHEF_USER, ActorRole.CHEF_MANAGER, ActorRole.SYSTEM],
    sideEffects: ['notify_customer', 'start_prep_sla'],
    emittedEvents: [DomainEventType.ORDER_PREP_STARTED],
    slaType: SLAType.PREP_TIME,
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.PREPARING],
    to: EngineOrderStatus.PREPARING,
    action: 'update_prep_time',
    allowedActors: [ActorRole.CHEF_USER, ActorRole.CHEF_MANAGER],
    sideEffects: ['notify_customer', 'update_prep_sla'],
    emittedEvents: [DomainEventType.ORDER_PREP_TIME_UPDATED],
    auditRequired: false,
  },
  {
    from: [EngineOrderStatus.PREPARING],
    to: EngineOrderStatus.READY,
    action: 'mark_ready',
    allowedActors: [ActorRole.CHEF_USER, ActorRole.CHEF_MANAGER, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER],
    sideEffects: ['notify_customer', 'complete_prep_sla', 'request_dispatch'],
    emittedEvents: [DomainEventType.ORDER_READY],
    auditRequired: true,
  },

  // === DISPATCH ===
  {
    from: [EngineOrderStatus.READY],
    to: EngineOrderStatus.DISPATCH_PENDING,
    action: 'request_dispatch',
    allowedActors: [ActorRole.SYSTEM, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER],
    sideEffects: ['find_eligible_drivers', 'start_dispatch_sla'],
    emittedEvents: [DomainEventType.DISPATCH_REQUESTED],
    slaType: SLAType.DISPATCH_ASSIGNMENT,
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.DISPATCH_PENDING],
    to: EngineOrderStatus.DRIVER_ASSIGNED,
    action: 'assign_driver',
    allowedActors: [ActorRole.SYSTEM, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER],
    sideEffects: ['notify_driver', 'notify_customer', 'complete_dispatch_sla'],
    emittedEvents: [DomainEventType.DRIVER_ASSIGNED],
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.DRIVER_ASSIGNED],
    to: EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP,
    action: 'start_pickup_route',
    allowedActors: [ActorRole.DRIVER, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER],
    sideEffects: ['start_pickup_tracking', 'start_pickup_sla'],
    emittedEvents: [DomainEventType.DELIVERY_EN_ROUTE_PICKUP],
    slaType: SLAType.DRIVER_PICKUP,
    auditRequired: true,
  },

  // === PICKUP & DELIVERY ===
  {
    from: [EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP],
    to: EngineOrderStatus.PICKED_UP,
    action: 'confirm_pickup',
    allowedActors: [ActorRole.DRIVER, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER],
    preconditions: ['at_pickup_location'],
    sideEffects: ['notify_customer', 'capture_payment', 'complete_pickup_sla'],
    emittedEvents: [DomainEventType.DELIVERY_PICKED_UP, DomainEventType.ORDER_PAYMENT_CAPTURED],
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.PICKED_UP],
    to: EngineOrderStatus.DRIVER_EN_ROUTE_DROPOFF,
    action: 'start_dropoff_route',
    allowedActors: [ActorRole.DRIVER, ActorRole.SYSTEM],
    sideEffects: ['start_delivery_tracking', 'start_delivery_sla'],
    emittedEvents: [DomainEventType.DELIVERY_EN_ROUTE_DROPOFF],
    slaType: SLAType.DRIVER_DELIVERY,
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.DRIVER_EN_ROUTE_DROPOFF],
    to: EngineOrderStatus.DELIVERED,
    action: 'confirm_delivery',
    allowedActors: [ActorRole.DRIVER, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER],
    preconditions: ['at_delivery_location'],
    sideEffects: ['notify_customer', 'notify_chef', 'complete_delivery_sla', 'record_proof'],
    emittedEvents: [DomainEventType.DELIVERY_COMPLETED],
    auditRequired: true,
  },

  // === COMPLETION ===
  {
    from: [EngineOrderStatus.DELIVERED],
    to: EngineOrderStatus.COMPLETED,
    action: 'complete_order',
    allowedActors: [ActorRole.SYSTEM, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER],
    sideEffects: ['create_chef_payout', 'create_driver_payout', 'request_review'],
    emittedEvents: [DomainEventType.ORDER_COMPLETED, DomainEventType.PAYOUT_SCHEDULED],
    auditRequired: true,
  },

  // === CANCELLATION ===
  {
    from: [EngineOrderStatus.PENDING, EngineOrderStatus.ACCEPTED],
    to: EngineOrderStatus.CANCEL_REQUESTED,
    action: 'request_cancel',
    allowedActors: [ActorRole.CUSTOMER],
    sideEffects: ['notify_chef', 'notify_ops'],
    emittedEvents: [DomainEventType.ORDER_CANCEL_REQUESTED],
    auditRequired: true,
  },
  {
    from: [
      EngineOrderStatus.DRAFT,
      EngineOrderStatus.CHECKOUT_PENDING,
      EngineOrderStatus.PAYMENT_AUTHORIZED,
      EngineOrderStatus.PAYMENT_FAILED,
      EngineOrderStatus.PENDING,
      EngineOrderStatus.CANCEL_REQUESTED,
    ],
    to: EngineOrderStatus.CANCELLED,
    action: 'cancel_order',
    allowedActors: [ActorRole.CUSTOMER, ActorRole.CHEF_USER, ActorRole.CHEF_MANAGER, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER, ActorRole.SUPER_ADMIN],
    preconditions: ['cancellation_reason_provided'],
    sideEffects: ['void_payment_if_authed', 'notify_all_parties', 'remove_from_kitchen_queue'],
    emittedEvents: [DomainEventType.ORDER_CANCELLED],
    auditRequired: true,
  },

  // === REFUNDS ===
  {
    from: [EngineOrderStatus.COMPLETED],
    to: EngineOrderStatus.REFUND_PENDING,
    action: 'request_refund',
    allowedActors: [ActorRole.CUSTOMER, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER, ActorRole.SUPER_ADMIN],
    preconditions: ['refund_reason_provided', 'within_refund_window'],
    sideEffects: ['create_exception', 'notify_ops'],
    emittedEvents: [DomainEventType.REFUND_REQUESTED],
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.REFUND_PENDING],
    to: EngineOrderStatus.REFUNDED,
    action: 'process_refund',
    allowedActors: [ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER, ActorRole.FINANCE_ADMIN, ActorRole.SUPER_ADMIN],
    preconditions: ['refund_approved', 'sufficient_balance'],
    sideEffects: ['process_stripe_refund', 'adjust_payouts', 'notify_customer'],
    emittedEvents: [DomainEventType.REFUND_PROCESSED],
    auditRequired: true,
  },
  {
    from: [EngineOrderStatus.REFUND_PENDING],
    to: EngineOrderStatus.PARTIALLY_REFUNDED,
    action: 'process_refund',
    allowedActors: [ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER, ActorRole.FINANCE_ADMIN, ActorRole.SUPER_ADMIN],
    preconditions: ['partial_refund_approved'],
    sideEffects: ['process_stripe_partial_refund', 'adjust_payouts', 'notify_customer'],
    emittedEvents: [DomainEventType.REFUND_PROCESSED],
    auditRequired: true,
  },

  // === FAILURE & EXCEPTION ===
  {
    from: [
      EngineOrderStatus.PAYMENT_FAILED,
      EngineOrderStatus.REJECTED,
      EngineOrderStatus.DISPATCH_PENDING,
    ],
    to: EngineOrderStatus.FAILED,
    action: 'mark_failed',
    allowedActors: [ActorRole.SYSTEM, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER],
    sideEffects: ['create_exception', 'notify_customer', 'void_payment_if_authed'],
    emittedEvents: [DomainEventType.EXCEPTION_CREATED],
    auditRequired: true,
  },
  {
    from: [
      EngineOrderStatus.ACCEPTED,
      EngineOrderStatus.PREPARING,
      EngineOrderStatus.READY,
      EngineOrderStatus.DISPATCH_PENDING,
      EngineOrderStatus.DRIVER_ASSIGNED,
      EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP,
      EngineOrderStatus.PICKED_UP,
      EngineOrderStatus.DRIVER_EN_ROUTE_DROPOFF,
    ],
    to: EngineOrderStatus.EXCEPTION,
    action: 'mark_exception',
    allowedActors: [ActorRole.SYSTEM, ActorRole.OPS_AGENT, ActorRole.OPS_MANAGER, ActorRole.SUPER_ADMIN],
    preconditions: ['exception_reason_provided'],
    sideEffects: ['create_exception', 'notify_ops', 'escalate_if_critical'],
    emittedEvents: [DomainEventType.EXCEPTION_CREATED],
    auditRequired: true,
  },

  // === OPS OVERRIDE (can force any transition) ===
  {
    from: Object.values(EngineOrderStatus),
    to: EngineOrderStatus.COMPLETED,
    action: 'ops_override',
    allowedActors: [ActorRole.OPS_MANAGER, ActorRole.SUPER_ADMIN],
    preconditions: ['override_reason_provided', 'override_approved'],
    sideEffects: ['log_override', 'notify_affected_parties'],
    emittedEvents: [DomainEventType.OPS_OVERRIDE_EXECUTED],
    auditRequired: true,
  },
  {
    from: Object.values(EngineOrderStatus),
    to: EngineOrderStatus.CANCELLED,
    action: 'ops_override',
    allowedActors: [ActorRole.OPS_MANAGER, ActorRole.SUPER_ADMIN],
    preconditions: ['override_reason_provided'],
    sideEffects: ['log_override', 'void_payment_if_authed', 'notify_affected_parties'],
    emittedEvents: [DomainEventType.OPS_OVERRIDE_EXECUTED, DomainEventType.ORDER_CANCELLED],
    auditRequired: true,
  },
];

// Helper to check if transition is valid
export function isValidTransition(
  currentStatus: EngineOrderStatus,
  targetStatus: EngineOrderStatus,
  action: OrderAction,
  actorRole: ActorRole
): { valid: boolean; transition?: StateTransition<EngineOrderStatus, OrderAction>; error?: string } {
  const transition = ORDER_TRANSITIONS.find(
    (t) =>
      t.to === targetStatus &&
      t.action === action &&
      (Array.isArray(t.from) ? t.from.includes(currentStatus) || t.from.length === 0 : t.from === currentStatus)
  );

  if (!transition) {
    return {
      valid: false,
      error: `No transition defined from ${currentStatus} to ${targetStatus} via ${action}`,
    };
  }

  if (!transition.allowedActors.includes(actorRole)) {
    return {
      valid: false,
      error: `Actor role ${actorRole} is not allowed to perform ${action}`,
    };
  }

  return { valid: true, transition };
}

// Get allowed actions for current state and role
export function getAllowedActions(
  currentStatus: EngineOrderStatus,
  actorRole: ActorRole
): { action: OrderAction; targetStatus: EngineOrderStatus }[] {
  return ORDER_TRANSITIONS.filter(
    (t) =>
      (Array.isArray(t.from) ? t.from.includes(currentStatus) : t.from === currentStatus) &&
      t.allowedActors.includes(actorRole)
  ).map((t) => ({
    action: t.action as OrderAction,
    targetStatus: t.to,
  }));
}

// SLA configuration in minutes
export const SLA_DURATIONS: Record<SLAType, { warning: number; breach: number }> = {
  [SLAType.CHEF_RESPONSE]: { warning: 3, breach: 5 },
  [SLAType.PREP_TIME]: { warning: 25, breach: 45 },
  [SLAType.DISPATCH_ASSIGNMENT]: { warning: 5, breach: 10 },
  [SLAType.DRIVER_PICKUP]: { warning: 15, breach: 25 },
  [SLAType.DRIVER_DELIVERY]: { warning: 20, breach: 35 },
  [SLAType.SUPPORT_RESPONSE]: { warning: 30, breach: 60 },
  [SLAType.REFUND_PROCESSING]: { warning: 60 * 24, breach: 60 * 48 }, // 24h warning, 48h breach
  [SLAType.PAYOUT_REVIEW]: { warning: 60 * 24 * 3, breach: 60 * 24 * 7 }, // 3 days warning, 7 days breach
};
