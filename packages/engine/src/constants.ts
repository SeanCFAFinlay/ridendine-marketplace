// ==========================================
// PLATFORM CONSTANTS
// ==========================================

// Fee Configuration (in percentages)
export const PLATFORM_FEE_PERCENT = 15;
// NOTE: SERVICE_FEE_PERCENT and HST_RATE are kept as compile-time defaults.
// At runtime, prefer TaxConfigService.getTaxRates() which reads from platform_settings
// and falls back to these values if the DB is unavailable.
export const SERVICE_FEE_PERCENT = 8;
export const HST_RATE = 13;

// Delivery Configuration (in cents)
export const BASE_DELIVERY_FEE = 500; // $5.00
export const DRIVER_PAYOUT_PERCENT = 80; // Driver gets 80% of delivery fee

// Order Status Flow
export const ORDER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatusType = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatusType = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// Delivery Status Flow
export const DELIVERY_STATUS = {
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

export type DeliveryStatusType = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

// Status display labels
export const ORDER_STATUS_LABELS: Record<OrderStatusType, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// Status colors for UI
export const ORDER_STATUS_COLORS: Record<OrderStatusType, string> = {
  pending: 'yellow',
  accepted: 'blue',
  rejected: 'red',
  preparing: 'purple',
  ready_for_pickup: 'indigo',
  picked_up: 'cyan',
  in_transit: 'cyan',
  delivered: 'green',
  completed: 'green',
  cancelled: 'red',
  refunded: 'gray',
};

// Valid status transitions
export const VALID_ORDER_TRANSITIONS: Record<OrderStatusType, OrderStatusType[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  rejected: [],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

// ==========================================
// GEO CONSTANTS
// ==========================================

/**
 * Default service region center (Hamilton, ON, Canada)
 * Used as fallback center for all map views
 */
export const DEFAULT_SERVICE_REGION_CENTER: [number, number] = [43.2557, -79.8711];
export const DEFAULT_MAP_ZOOM = 12;
