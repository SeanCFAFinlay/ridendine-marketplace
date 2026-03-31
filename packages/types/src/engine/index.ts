// ==========================================
// RIDENDINE CENTRAL ENGINE TYPES
// ==========================================

// Actor roles for permission control
export const ActorRole = {
  CUSTOMER: 'customer',
  CHEF_USER: 'chef_user',
  CHEF_MANAGER: 'chef_manager',
  DRIVER: 'driver',
  OPS_AGENT: 'ops_agent',
  OPS_MANAGER: 'ops_manager',
  FINANCE_ADMIN: 'finance_admin',
  SUPER_ADMIN: 'super_admin',
  SYSTEM: 'system', // For automated actions
} as const;

export type ActorRole = (typeof ActorRole)[keyof typeof ActorRole];

// Extended Order Status with full lifecycle
export const EngineOrderStatus = {
  // Draft/Cart phase
  DRAFT: 'draft',
  CHECKOUT_PENDING: 'checkout_pending',

  // Payment phase
  PAYMENT_AUTHORIZED: 'payment_authorized',
  PAYMENT_FAILED: 'payment_failed',

  // Kitchen phase
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  PREPARING: 'preparing',
  READY: 'ready',

  // Dispatch phase
  DISPATCH_PENDING: 'dispatch_pending',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_EN_ROUTE_PICKUP: 'driver_en_route_pickup',

  // Delivery phase
  PICKED_UP: 'picked_up',
  DRIVER_EN_ROUTE_DROPOFF: 'driver_en_route_dropoff',
  DELIVERED: 'delivered',

  // Terminal states
  COMPLETED: 'completed',
  CANCEL_REQUESTED: 'cancel_requested',
  CANCELLED: 'cancelled',
  REFUND_PENDING: 'refund_pending',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  FAILED: 'failed',
  EXCEPTION: 'exception',
} as const;

export type EngineOrderStatus = (typeof EngineOrderStatus)[keyof typeof EngineOrderStatus];

// Reason codes for state transitions
export const OrderRejectReason = {
  KITCHEN_CLOSED: 'kitchen_closed',
  ITEM_UNAVAILABLE: 'item_unavailable',
  TOO_BUSY: 'too_busy',
  OUTSIDE_DELIVERY_ZONE: 'outside_delivery_zone',
  MINIMUM_NOT_MET: 'minimum_not_met',
  CHEF_UNAVAILABLE: 'chef_unavailable',
  OTHER: 'other',
} as const;

export type OrderRejectReason = (typeof OrderRejectReason)[keyof typeof OrderRejectReason];

export const OrderCancelReason = {
  CUSTOMER_REQUESTED: 'customer_requested',
  CHEF_UNAVAILABLE: 'chef_unavailable',
  PAYMENT_FAILED: 'payment_failed',
  NO_DRIVER_AVAILABLE: 'no_driver_available',
  DELIVERY_FAILED: 'delivery_failed',
  FRAUD_SUSPECTED: 'fraud_suspected',
  DUPLICATE_ORDER: 'duplicate_order',
  OPS_OVERRIDE: 'ops_override',
  SYSTEM_ERROR: 'system_error',
  OTHER: 'other',
} as const;

export type OrderCancelReason = (typeof OrderCancelReason)[keyof typeof OrderCancelReason];

export const RefundReason = {
  CUSTOMER_REQUESTED: 'customer_requested',
  ORDER_CANCELLED: 'order_cancelled',
  MISSING_ITEMS: 'missing_items',
  WRONG_ORDER: 'wrong_order',
  QUALITY_ISSUE: 'quality_issue',
  LATE_DELIVERY: 'late_delivery',
  NEVER_DELIVERED: 'never_delivered',
  DAMAGED_ORDER: 'damaged_order',
  FRAUDULENT: 'fraudulent',
  DUPLICATE_CHARGE: 'duplicate_charge',
  OPS_GOODWILL: 'ops_goodwill',
} as const;

export type RefundReason = (typeof RefundReason)[keyof typeof RefundReason];

// Exception/Incident types
export const ExceptionType = {
  // Kitchen exceptions
  CHEF_NO_RESPONSE: 'chef_no_response',
  CHEF_REJECTED_ORDER: 'chef_rejected_order',
  ITEM_SOLD_OUT_AFTER_ORDER: 'item_sold_out_after_order',
  PREP_DELAY: 'prep_delay',
  KITCHEN_CLOSED_UNEXPECTEDLY: 'kitchen_closed_unexpectedly',

  // Dispatch exceptions
  NO_DRIVER_AVAILABLE: 'no_driver_available',
  DRIVER_DECLINED: 'driver_declined',
  DRIVER_NO_RESPONSE: 'driver_no_response',
  ASSIGNMENT_TIMEOUT: 'assignment_timeout',

  // Delivery exceptions
  DRIVER_LATE_PICKUP: 'driver_late_pickup',
  DRIVER_LATE_DROPOFF: 'driver_late_dropoff',
  PICKUP_ISSUE: 'pickup_issue',
  WRONG_ADDRESS: 'wrong_address',
  CUSTOMER_UNREACHABLE: 'customer_unreachable',
  DAMAGED_ORDER: 'damaged_order',
  MISSING_ITEMS: 'missing_items',

  // Driver exceptions
  DRIVER_ISSUE: 'driver_issue',
  DRIVER_WENT_OFFLINE: 'driver_went_offline',

  // Customer exceptions
  CUSTOMER_DISPUTE: 'customer_dispute',
  REFUND_REQUEST: 'refund_request',
  COMPLAINT: 'complaint',

  // Financial exceptions
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_ISSUE: 'payment_issue',
  FRAUD_SUSPICION: 'fraud_suspicion',
  PAYOUT_REVIEW: 'payout_review',
  CHARGEBACK: 'chargeback',

  // System exceptions
  SYSTEM_ERROR: 'system_error',
  DATA_INCONSISTENCY: 'data_inconsistency',
} as const;

export type ExceptionType = (typeof ExceptionType)[keyof typeof ExceptionType];

export const ExceptionSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ExceptionSeverity = (typeof ExceptionSeverity)[keyof typeof ExceptionSeverity];

export const ExceptionStatus = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  PENDING_CUSTOMER: 'pending_customer',
  PENDING_CHEF: 'pending_chef',
  PENDING_DRIVER: 'pending_driver',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  ESCALATED: 'escalated',
} as const;

export type ExceptionStatus = (typeof ExceptionStatus)[keyof typeof ExceptionStatus];

// Domain Events
export const DomainEventType = {
  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_PAYMENT_AUTHORIZED: 'order.payment_authorized',
  ORDER_PAYMENT_CAPTURED: 'order.payment_captured',
  ORDER_PAYMENT_FAILED: 'order.payment_failed',
  ORDER_SUBMITTED: 'order.submitted',
  ORDER_ACCEPTED: 'order.accepted',
  ORDER_REJECTED: 'order.rejected',
  ORDER_PREP_STARTED: 'order.prep_started',
  ORDER_PREP_TIME_UPDATED: 'order.prep_time_updated',
  ORDER_READY: 'order.ready',
  ORDER_CANCEL_REQUESTED: 'order.cancel_requested',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  ORDER_REFUNDED: 'order.refunded',
  ORDER_PARTIALLY_REFUNDED: 'order.partially_refunded',

  // Payment events
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_FAILED: 'payment.failed',

  // Dispatch events
  DISPATCH_REQUESTED: 'dispatch.requested',
  DRIVER_OFFER_CREATED: 'driver.offer.created',
  DRIVER_OFFER_ACCEPTED: 'driver.offer.accepted',
  DRIVER_OFFER_DECLINED: 'driver.offer.declined',
  DRIVER_OFFER_EXPIRED: 'driver.offer.expired',
  DRIVER_ASSIGNED: 'driver.assigned',
  DRIVER_REASSIGNED: 'driver.reassigned',
  DRIVER_STATUS_CHANGED: 'driver_status_changed',
  DRIVER_LOCATION_UPDATED: 'driver_location_updated',

  // Delivery events
  DELIVERY_CREATED: 'delivery.created',
  DELIVERY_EN_ROUTE_PICKUP: 'delivery.en_route_pickup',
  DELIVERY_ARRIVED_PICKUP: 'delivery.arrived_pickup',
  DELIVERY_PICKED_UP: 'delivery.picked_up',
  DELIVERY_EN_ROUTE_DROPOFF: 'delivery.en_route_dropoff',
  DELIVERY_ARRIVED_DROPOFF: 'delivery.arrived_dropoff',
  DELIVERY_COMPLETED: 'delivery.completed',
  DELIVERY_FAILED: 'delivery.failed',

  // Financial events
  REFUND_REQUESTED: 'refund.requested',
  REFUND_APPROVED: 'refund.approved',
  REFUND_PROCESSED: 'refund.processed',
  PAYOUT_SCHEDULED: 'payout.scheduled',
  PAYOUT_PROCESSED: 'payout.processed',
  PAYOUT_HELD: 'payout.held',

  // Storefront events
  STOREFRONT_PUBLISHED: 'storefront.published',
  STOREFRONT_PAUSED: 'storefront.paused',
  STOREFRONT_UNPAUSED: 'storefront.unpaused',
  STOREFRONT_CLOSED: 'storefront.closed',
  MENU_ITEM_SOLD_OUT: 'menu.item.sold_out',
  MENU_ITEM_RESTOCKED: 'menu.item.restocked',
  MENU_UPDATED: 'menu.updated',

  // Exception events
  EXCEPTION_CREATED: 'exception.created',
  EXCEPTION_ESCALATED: 'exception.escalated',
  EXCEPTION_RESOLVED: 'exception.resolved',

  // SLA events
  SLA_WARNING: 'sla.warning',
  SLA_BREACHED: 'sla.breached',

  // Override events
  OPS_OVERRIDE_EXECUTED: 'ops.override.executed',
} as const;

export type DomainEventType = (typeof DomainEventType)[keyof typeof DomainEventType];

// Ledger entry types
export const LedgerEntryType = {
  // Customer charges
  CUSTOMER_CHARGE_AUTH: 'customer_charge_auth',
  CUSTOMER_CHARGE_CAPTURE: 'customer_charge_capture',
  CUSTOMER_CHARGE_VOID: 'customer_charge_void',
  CUSTOMER_REFUND: 'customer_refund',
  CUSTOMER_PARTIAL_REFUND: 'customer_partial_refund',

  // Platform fees
  PLATFORM_FEE: 'platform_fee',
  SERVICE_FEE: 'service_fee',
  DELIVERY_FEE: 'delivery_fee',

  // Payables
  CHEF_PAYABLE: 'chef_payable',
  DRIVER_PAYABLE: 'driver_payable',
  TIP_PAYABLE: 'tip_payable',

  // Adjustments
  PROMO_SUBSIDY: 'promo_subsidy',
  PAYOUT_HOLD: 'payout_hold',
  PAYOUT_RELEASE: 'payout_release',
  PAYOUT_ADJUSTMENT: 'payout_adjustment',

  // Tax
  TAX_COLLECTED: 'tax_collected',
  TAX_REMITTED: 'tax_remitted',
} as const;

export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];

// SLA Types
export const SLAType = {
  CHEF_RESPONSE: 'chef_response',
  PREP_TIME: 'prep_time',
  DISPATCH_ASSIGNMENT: 'dispatch_assignment',
  DRIVER_PICKUP: 'driver_pickup',
  DRIVER_DELIVERY: 'driver_delivery',
  SUPPORT_RESPONSE: 'support_response',
  REFUND_PROCESSING: 'refund_processing',
  PAYOUT_REVIEW: 'payout_review',
} as const;

export type SLAType = (typeof SLAType)[keyof typeof SLAType];

export const SLAStatus = {
  ACTIVE: 'active',
  WARNING: 'warning',
  BREACHED: 'breached',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type SLAStatus = (typeof SLAStatus)[keyof typeof SLAStatus];

// Storefront states
export const StorefrontState = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  PUBLISHED: 'published',
  PAUSED: 'paused',
  SUSPENDED: 'suspended',
  CLOSED: 'closed',
} as const;

export type StorefrontState = (typeof StorefrontState)[keyof typeof StorefrontState];

// Audit action types
export const AuditAction = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  STATUS_CHANGE: 'status_change',
  APPROVAL: 'approval',
  REJECTION: 'rejection',
  SUSPENSION: 'suspension',
  OVERRIDE: 'override',
  REFUND: 'refund',
  PAYOUT: 'payout',
  LOGIN: 'login',
  LOGOUT: 'logout',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

// State transition definition
export interface StateTransition<S extends string, A extends string> {
  from: S | S[];
  to: S;
  action: A;
  allowedActors: ActorRole[];
  preconditions?: string[];
  sideEffects?: string[];
  emittedEvents: DomainEventType[];
  slaType?: SLAType;
  auditRequired: boolean;
}

// Actor context for operations
export interface ActorContext {
  userId: string;
  role: ActorRole;
  entityId?: string; // Chef ID, Driver ID, etc.
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Operation result
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  events?: DomainEvent[];
  auditEntry?: AuditEntry;
}

// Domain Event
export interface DomainEvent {
  id: string;
  type: DomainEventType;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  actor: ActorContext;
  timestamp: string;
  version: number;
}

// Audit Entry
export interface AuditEntry {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  actor: ActorContext;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// Exception/Incident
export interface Exception {
  id: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  orderId?: string;
  customerId?: string;
  chefId?: string;
  driverId?: string;
  deliveryId?: string;
  title: string;
  description: string;
  recommendedActions?: string[];
  internalNotes?: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  linkedRefundId?: string;
  linkedPayoutAdjustmentId?: string;
  slaDeadline?: string;
  escalatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// SLA Timer
export interface SLATimer {
  id: string;
  type: SLAType;
  status: SLAStatus;
  entityType: string;
  entityId: string;
  startedAt: string;
  deadlineAt: string;
  warningAt?: string;
  completedAt?: string;
  breachedAt?: string;
  metadata?: Record<string, unknown>;
}

// Ledger Entry
export interface LedgerEntry {
  id: string;
  orderId: string;
  type: LedgerEntryType;
  amountCents: number;
  currency: string;
  description: string;
  entityType?: string;
  entityId?: string;
  stripeId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// Kitchen Queue Entry
export interface KitchenQueueEntry {
  id: string;
  storefrontId: string;
  orderId: string;
  position: number;
  estimatedPrepMinutes: number;
  actualPrepMinutes?: number;
  status: 'queued' | 'in_progress' | 'completed' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// Dispatch Assignment Attempt
export interface AssignmentAttempt {
  id: string;
  deliveryId: string;
  driverId: string;
  attemptNumber: number;
  offeredAt: string;
  expiresAt: string;
  respondedAt?: string;
  response: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  declineReason?: string;
  distanceMeters?: number;
  estimatedMinutes?: number;
}

// Override Log
export interface OpsOverrideLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  reason: string;
  actor: ActorContext;
  approvedBy?: string;
  createdAt: string;
}
