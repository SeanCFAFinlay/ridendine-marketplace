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
  DELIVERY_OFFER: 'delivery_offer',
  CHEF_APPROVED: 'chef_approved',
  DRIVER_APPROVED: 'driver_approved',
  REVIEW_RECEIVED: 'review_received',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
