// ==========================================
// ORDER & DELIVERY STATE MACHINES
// Single source of truth for allowed transitions.
// No transition may happen unless validated here.
// ==========================================

import {
  EngineOrderStatus,
  EngineDeliveryStatus,
  CanonicalOrderStatus,
  CanonicalDeliveryStatus,
  CanonicalPaymentStatus,
  CanonicalPayoutStatus,
} from '@ridendine/types';

// Re-export canonical statuses for convenience
export {
  CanonicalOrderStatus as ORDER_STATUSES,
  CanonicalDeliveryStatus as DELIVERY_STATUSES,
  CanonicalPaymentStatus as PAYMENT_STATUSES,
  CanonicalPayoutStatus as PAYOUT_STATUSES,
};

// ==========================================
// ORDER TRANSITION MAP
// ==========================================

// Map of from-status -> Set of allowed to-statuses
const ORDER_TRANSITION_MAP: Record<string, Set<string>> = {
  // Cart -> Payment
  [EngineOrderStatus.DRAFT]: new Set([EngineOrderStatus.CHECKOUT_PENDING]),
  [EngineOrderStatus.CHECKOUT_PENDING]: new Set([
    EngineOrderStatus.PAYMENT_AUTHORIZED,
    EngineOrderStatus.PAYMENT_FAILED,
  ]),

  // Payment -> Kitchen
  [EngineOrderStatus.PAYMENT_AUTHORIZED]: new Set([
    EngineOrderStatus.PENDING,
    EngineOrderStatus.CANCELLED,
  ]),
  [EngineOrderStatus.PAYMENT_FAILED]: new Set([
    EngineOrderStatus.FAILED,
    EngineOrderStatus.CANCELLED,
  ]),

  // Kitchen
  [EngineOrderStatus.PENDING]: new Set([
    EngineOrderStatus.ACCEPTED,
    EngineOrderStatus.REJECTED,
    EngineOrderStatus.CANCELLED,
  ]),
  [EngineOrderStatus.ACCEPTED]: new Set([
    EngineOrderStatus.PREPARING,
    EngineOrderStatus.CANCELLED,
    EngineOrderStatus.CANCEL_REQUESTED,
  ]),
  [EngineOrderStatus.REJECTED]: new Set([
    EngineOrderStatus.CANCELLED,
    EngineOrderStatus.FAILED,
  ]),
  [EngineOrderStatus.PREPARING]: new Set([
    EngineOrderStatus.READY,
    EngineOrderStatus.CANCELLED,
    EngineOrderStatus.EXCEPTION,
  ]),
  [EngineOrderStatus.READY]: new Set([
    EngineOrderStatus.DISPATCH_PENDING,
    EngineOrderStatus.CANCELLED,
  ]),

  // Dispatch
  [EngineOrderStatus.DISPATCH_PENDING]: new Set([
    EngineOrderStatus.DRIVER_OFFERED,
    EngineOrderStatus.DRIVER_ASSIGNED,
    EngineOrderStatus.CANCELLED,
    EngineOrderStatus.FAILED,
    EngineOrderStatus.EXCEPTION,
  ]),
  [EngineOrderStatus.DRIVER_OFFERED]: new Set([
    EngineOrderStatus.DRIVER_ASSIGNED,
    EngineOrderStatus.DISPATCH_PENDING, // driver declined, back to pending
    EngineOrderStatus.CANCELLED,
  ]),
  [EngineOrderStatus.DRIVER_ASSIGNED]: new Set([
    EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP,
    EngineOrderStatus.DISPATCH_PENDING, // driver reassigned
    EngineOrderStatus.CANCELLED,
    EngineOrderStatus.EXCEPTION,
  ]),

  // Pickup & Delivery
  [EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP]: new Set([
    EngineOrderStatus.PICKED_UP,
    EngineOrderStatus.CANCELLED,
    EngineOrderStatus.EXCEPTION,
  ]),
  [EngineOrderStatus.PICKED_UP]: new Set([
    EngineOrderStatus.DRIVER_EN_ROUTE_DROPOFF,
    EngineOrderStatus.DRIVER_EN_ROUTE_CUSTOMER,
    EngineOrderStatus.EXCEPTION,
  ]),
  [EngineOrderStatus.DRIVER_EN_ROUTE_DROPOFF]: new Set([
    EngineOrderStatus.DELIVERED,
    EngineOrderStatus.EXCEPTION,
  ]),
  [EngineOrderStatus.DRIVER_EN_ROUTE_CUSTOMER]: new Set([
    EngineOrderStatus.DELIVERED,
    EngineOrderStatus.EXCEPTION,
  ]),

  // Completion
  [EngineOrderStatus.DELIVERED]: new Set([
    EngineOrderStatus.COMPLETED,
  ]),

  // Terminal -> Refund (only allowed terminal transitions)
  [EngineOrderStatus.COMPLETED]: new Set([
    EngineOrderStatus.REFUND_PENDING,
    EngineOrderStatus.REFUNDED,
    EngineOrderStatus.PARTIALLY_REFUNDED,
  ]),
  [EngineOrderStatus.CANCELLED]: new Set([
    EngineOrderStatus.REFUNDED,
  ]),
  [EngineOrderStatus.REFUND_PENDING]: new Set([
    EngineOrderStatus.REFUNDED,
    EngineOrderStatus.PARTIALLY_REFUNDED,
  ]),

  // Cancel request
  [EngineOrderStatus.CANCEL_REQUESTED]: new Set([
    EngineOrderStatus.CANCELLED,
    EngineOrderStatus.ACCEPTED, // cancel denied, back to accepted
  ]),

  // Exception can be resolved
  [EngineOrderStatus.EXCEPTION]: new Set([
    EngineOrderStatus.CANCELLED,
    EngineOrderStatus.FAILED,
    // Ops can resolve back to a valid state via override
  ]),
};

// Terminal statuses that cannot transition (except specified above)
export const TERMINAL_ORDER_STATUSES = new Set<string>([
  EngineOrderStatus.COMPLETED,
  EngineOrderStatus.CANCELLED,
  EngineOrderStatus.REFUNDED,
  EngineOrderStatus.PARTIALLY_REFUNDED,
  EngineOrderStatus.FAILED,
]);

// ==========================================
// DELIVERY TRANSITION MAP
// ==========================================

const DELIVERY_TRANSITION_MAP: Record<string, Set<string>> = {
  [EngineDeliveryStatus.UNASSIGNED]: new Set([
    EngineDeliveryStatus.OFFERED,
    EngineDeliveryStatus.ACCEPTED, // manual assign skips offer
    EngineDeliveryStatus.CANCELLED,
  ]),
  [EngineDeliveryStatus.OFFERED]: new Set([
    EngineDeliveryStatus.ACCEPTED,
    EngineDeliveryStatus.UNASSIGNED, // declined/expired, back to unassigned
    EngineDeliveryStatus.CANCELLED,
  ]),
  [EngineDeliveryStatus.ACCEPTED]: new Set([
    EngineDeliveryStatus.EN_ROUTE_TO_PICKUP,
    EngineDeliveryStatus.UNASSIGNED, // reassigned
    EngineDeliveryStatus.CANCELLED,
  ]),
  [EngineDeliveryStatus.EN_ROUTE_TO_PICKUP]: new Set([
    EngineDeliveryStatus.ARRIVED_AT_PICKUP,
    EngineDeliveryStatus.PICKED_UP, // skip arrived if auto
    EngineDeliveryStatus.CANCELLED,
    EngineDeliveryStatus.FAILED,
  ]),
  [EngineDeliveryStatus.ARRIVED_AT_PICKUP]: new Set([
    EngineDeliveryStatus.PICKED_UP,
    EngineDeliveryStatus.CANCELLED,
    EngineDeliveryStatus.FAILED,
  ]),
  [EngineDeliveryStatus.PICKED_UP]: new Set([
    EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER,
    EngineDeliveryStatus.FAILED,
  ]),
  [EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER]: new Set([
    EngineDeliveryStatus.ARRIVED_AT_CUSTOMER,
    EngineDeliveryStatus.DELIVERED, // skip arrived if auto
    EngineDeliveryStatus.FAILED,
  ]),
  [EngineDeliveryStatus.ARRIVED_AT_CUSTOMER]: new Set([
    EngineDeliveryStatus.DELIVERED,
    EngineDeliveryStatus.FAILED,
  ]),
};

export const TERMINAL_DELIVERY_STATUSES = new Set<string>([
  EngineDeliveryStatus.DELIVERED,
  EngineDeliveryStatus.FAILED,
  EngineDeliveryStatus.CANCELLED,
]);

// ==========================================
// ALLOWED TRANSITIONS (flat arrays for export)
// ==========================================

export const ALLOWED_ORDER_TRANSITIONS: Array<{ from: string; to: string }> = [];
for (const [from, toSet] of Object.entries(ORDER_TRANSITION_MAP)) {
  for (const to of toSet) {
    ALLOWED_ORDER_TRANSITIONS.push({ from, to });
  }
}

export const ALLOWED_DELIVERY_TRANSITIONS: Array<{ from: string; to: string }> = [];
for (const [from, toSet] of Object.entries(DELIVERY_TRANSITION_MAP)) {
  for (const to of toSet) {
    ALLOWED_DELIVERY_TRANSITIONS.push({ from, to });
  }
}

// ==========================================
// VALIDATION FUNCTIONS
// ==========================================

export function isValidOrderTransition(from: string, to: string): boolean {
  const allowed = ORDER_TRANSITION_MAP[from];
  return allowed ? allowed.has(to) : false;
}

export function isValidDeliveryTransition(from: string, to: string): boolean {
  const allowed = DELIVERY_TRANSITION_MAP[from];
  return allowed ? allowed.has(to) : false;
}

export class InvalidTransitionError extends Error {
  public readonly from: string;
  public readonly to: string;
  public readonly entityType: string;

  constructor(entityType: string, from: string, to: string) {
    super(`Invalid ${entityType} transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
    this.entityType = entityType;
    this.from = from;
    this.to = to;
  }
}

export function assertValidOrderTransition(from: string, to: string): void {
  if (!isValidOrderTransition(from, to)) {
    throw new InvalidTransitionError('order', from, to);
  }
}

export function assertValidDeliveryTransition(from: string, to: string): void {
  if (!isValidDeliveryTransition(from, to)) {
    throw new InvalidTransitionError('delivery', from, to);
  }
}

export function isTerminalOrderStatus(status: string): boolean {
  return TERMINAL_ORDER_STATUSES.has(status);
}

export function isTerminalDeliveryStatus(status: string): boolean {
  return TERMINAL_DELIVERY_STATUSES.has(status);
}

// ==========================================
// LEGACY STATUS MAPPING
// Maps engine statuses to legacy DB statuses for backward compatibility
// ==========================================

export const ENGINE_TO_LEGACY_ORDER_STATUS: Record<string, string> = {
  [EngineOrderStatus.DRAFT]: 'pending',
  [EngineOrderStatus.CHECKOUT_PENDING]: 'pending',
  [EngineOrderStatus.PAYMENT_AUTHORIZED]: 'pending',
  [EngineOrderStatus.PAYMENT_FAILED]: 'cancelled',
  [EngineOrderStatus.PENDING]: 'pending',
  [EngineOrderStatus.ACCEPTED]: 'accepted',
  [EngineOrderStatus.REJECTED]: 'rejected',
  [EngineOrderStatus.PREPARING]: 'preparing',
  [EngineOrderStatus.READY]: 'ready_for_pickup',
  [EngineOrderStatus.DISPATCH_PENDING]: 'ready_for_pickup',
  [EngineOrderStatus.DRIVER_OFFERED]: 'ready_for_pickup',
  [EngineOrderStatus.DRIVER_ASSIGNED]: 'ready_for_pickup',
  [EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP]: 'picked_up',
  [EngineOrderStatus.PICKED_UP]: 'picked_up',
  [EngineOrderStatus.DRIVER_EN_ROUTE_DROPOFF]: 'in_transit',
  [EngineOrderStatus.DRIVER_EN_ROUTE_CUSTOMER]: 'in_transit',
  [EngineOrderStatus.DELIVERED]: 'delivered',
  [EngineOrderStatus.COMPLETED]: 'completed',
  [EngineOrderStatus.CANCEL_REQUESTED]: 'pending',
  [EngineOrderStatus.CANCELLED]: 'cancelled',
  [EngineOrderStatus.REFUND_PENDING]: 'completed',
  [EngineOrderStatus.REFUNDED]: 'refunded',
  [EngineOrderStatus.PARTIALLY_REFUNDED]: 'refunded',
  [EngineOrderStatus.FAILED]: 'cancelled',
  [EngineOrderStatus.EXCEPTION]: 'pending',
};

export const ENGINE_TO_LEGACY_DELIVERY_STATUS: Record<string, string> = {
  [EngineDeliveryStatus.UNASSIGNED]: 'pending',
  [EngineDeliveryStatus.OFFERED]: 'pending',
  [EngineDeliveryStatus.ACCEPTED]: 'assigned',
  [EngineDeliveryStatus.EN_ROUTE_TO_PICKUP]: 'en_route_to_pickup',
  [EngineDeliveryStatus.ARRIVED_AT_PICKUP]: 'arrived_at_pickup',
  [EngineDeliveryStatus.PICKED_UP]: 'picked_up',
  [EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER]: 'en_route_to_dropoff',
  [EngineDeliveryStatus.ARRIVED_AT_CUSTOMER]: 'arrived_at_dropoff',
  [EngineDeliveryStatus.DELIVERED]: 'delivered',
  [EngineDeliveryStatus.FAILED]: 'failed',
  [EngineDeliveryStatus.CANCELLED]: 'cancelled',
};
