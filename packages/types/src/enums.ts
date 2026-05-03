// ==========================================
// RIDENDINE ENUMS
// ==========================================

export const OrderStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// Canonical order statuses (full engine lifecycle)
export const CanonicalOrderStatus = {
  CART: 'cart',
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_AUTHORIZED: 'payment_authorized',
  PENDING_CHEF_ACCEPTANCE: 'pending_chef_acceptance',
  CHEF_ACCEPTED: 'chef_accepted',
  CHEF_REJECTED: 'chef_rejected',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  DRIVER_ASSIGNMENT_PENDING: 'driver_assignment_pending',
  DRIVER_OFFERED: 'driver_offered',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_EN_ROUTE_TO_PICKUP: 'driver_en_route_to_pickup',
  PICKED_UP: 'picked_up',
  DRIVER_EN_ROUTE_TO_CUSTOMER: 'driver_en_route_to_customer',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  FAILED: 'failed',
} as const;

export type CanonicalOrderStatus = (typeof CanonicalOrderStatus)[keyof typeof CanonicalOrderStatus];

export const DeliveryStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  EN_ROUTE_TO_PICKUP: 'en_route_to_pickup',
  ARRIVED_AT_PICKUP: 'arrived_at_pickup',
  PICKED_UP: 'picked_up',
  EN_ROUTE_TO_DROPOFF: 'en_route_to_dropoff',
  ARRIVED_AT_DROPOFF: 'arrived_at_dropoff',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

// Canonical delivery statuses (full engine lifecycle)
export const CanonicalDeliveryStatus = {
  UNASSIGNED: 'unassigned',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  EN_ROUTE_TO_PICKUP: 'en_route_to_pickup',
  ARRIVED_AT_PICKUP: 'arrived_at_pickup',
  PICKED_UP: 'picked_up',
  EN_ROUTE_TO_CUSTOMER: 'en_route_to_customer',
  ARRIVED_AT_CUSTOMER: 'arrived_at_customer',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type CanonicalDeliveryStatus = (typeof CanonicalDeliveryStatus)[keyof typeof CanonicalDeliveryStatus];

export const ChefStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;

export type ChefStatus = (typeof ChefStatus)[keyof typeof ChefStatus];

export const DriverStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;

export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus];

export const DriverPresenceStatus = {
  OFFLINE: 'offline',
  ONLINE: 'online',
  BUSY: 'busy',
} as const;

export type DriverPresenceStatus = (typeof DriverPresenceStatus)[keyof typeof DriverPresenceStatus];

export const PaymentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

// Canonical payment statuses (full engine lifecycle)
export const CanonicalPaymentStatus = {
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUND_REQUESTED: 'refund_requested',
  REFUNDED: 'refunded',
} as const;

export type CanonicalPaymentStatus = (typeof CanonicalPaymentStatus)[keyof typeof CanonicalPaymentStatus];

// Canonical payout statuses
export const CanonicalPayoutStatus = {
  NOT_ELIGIBLE: 'not_eligible',
  ELIGIBLE: 'eligible',
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  HELD: 'held',
} as const;

export type CanonicalPayoutStatus = (typeof CanonicalPayoutStatus)[keyof typeof CanonicalPayoutStatus];

// Canonical actor types for transition auditing
export const ActorType = {
  CUSTOMER: 'customer',
  CHEF: 'chef',
  DRIVER: 'driver',
  OPS: 'ops',
  SYSTEM: 'system',
} as const;

export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const DocumentType = {
  FOOD_HANDLER_CERTIFICATE: 'food_handler_certificate',
  KITCHEN_INSPECTION: 'kitchen_inspection',
  BUSINESS_LICENSE: 'business_license',
  INSURANCE: 'insurance',
  DRIVERS_LICENSE: 'drivers_license',
  VEHICLE_REGISTRATION: 'vehicle_registration',
  VEHICLE_INSURANCE: 'vehicle_insurance',
} as const;

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];

export const DocumentStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const NotificationType = {
  ORDER_PLACED: 'order_placed',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_REJECTED: 'order_rejected',
  ORDER_READY: 'order_ready',
  ORDER_PICKED_UP: 'order_picked_up',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  REFUND_PROCESSED: 'refund_processed',
  DELIVERY_OFFER: 'delivery_offer',
  CHEF_APPROVED: 'chef_approved',
  DRIVER_APPROVED: 'driver_approved',
  REVIEW_RECEIVED: 'review_received',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** instant_payout_requests.status (Phase 0 schema; Phase 5 executes payouts) */
export const InstantPayoutStatus = {
  PENDING: 'pending',
  EXECUTING: 'executing',
  EXECUTED: 'executed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type InstantPayoutStatus = (typeof InstantPayoutStatus)[keyof typeof InstantPayoutStatus];
