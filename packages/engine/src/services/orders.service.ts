// ==========================================
// ORDER SERVICE - Centralized Order Logic
// ==========================================

import type { SupabaseClient } from '@ridendine/db';
import {
  SERVICE_FEE_PERCENT,
  HST_RATE,
  BASE_DELIVERY_FEE,
  DRIVER_PAYOUT_PERCENT,
  ORDER_STATUS,
  VALID_ORDER_TRANSITIONS,
  ORDER_STATUS_LABELS,
  type OrderStatusType,
} from '../constants';

// Types
export interface OrderBreakdown {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
}

export interface CreateOrderInput {
  customerId: string;
  storefrontId: string;
  deliveryAddressId: string;
  cartItems: Array<{
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    specialInstructions?: string;
    selectedOptions?: unknown[];
  }>;
  tip?: number;
  promoCode?: string;
  specialInstructions?: string;
}

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  status: OrderStatusType;
  paymentStatus: string;
  breakdown: OrderBreakdown;
  storefrontName?: string;
  customerName?: string;
  createdAt: string;
}

// Generate order number
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RD-${timestamp}-${random}`;
}

// Calculate order totals
export function calculateOrderTotals(
  subtotal: number,
  tip: number = 0,
  discount: number = 0
): OrderBreakdown {
  const deliveryFee = BASE_DELIVERY_FEE;
  const serviceFee = Math.round(subtotal * (SERVICE_FEE_PERCENT / 100));
  const taxableAmount = subtotal + serviceFee;
  const tax = Math.round(taxableAmount * (HST_RATE / 100));
  const total = subtotal + deliveryFee + serviceFee + tax + tip - discount;

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    tax,
    tip,
    discount,
    total,
  };
}

// Calculate cart subtotal (items are stored in cents)
export function calculateCartSubtotal(
  items: Array<{ unit_price: number; quantity: number }>
): number {
  return items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
}

// Calculate driver payout
export function calculateDriverPayout(deliveryFee: number): number {
  return Math.round(deliveryFee * (DRIVER_PAYOUT_PERCENT / 100));
}

// Validate status transition
export function canTransitionTo(
  currentStatus: OrderStatusType,
  newStatus: OrderStatusType
): boolean {
  const validTransitions = VALID_ORDER_TRANSITIONS[currentStatus];
  return validTransitions?.includes(newStatus) ?? false;
}

// Get status label
export function getStatusLabel(status: OrderStatusType): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

// Format status for display
export function formatOrderStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Check if order is in a terminal state
export function isTerminalStatus(status: OrderStatusType): boolean {
  return ['completed', 'cancelled', 'rejected', 'refunded'].includes(status);
}

// Check if order can be cancelled
export function canBeCancelled(status: OrderStatusType): boolean {
  return !['delivered', 'completed', 'cancelled', 'rejected', 'refunded'].includes(
    status
  );
}

// Get orders for admin dashboard
export async function getOrdersForDashboard(
  client: SupabaseClient,
  options: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  let query = client
    .from('orders')
    .select(
      `
      *,
      chef_storefronts (name),
      customers (first_name, last_name, email)
    `
    )
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 20) - 1
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

// Update order status with validation
export async function updateOrderStatus(
  client: SupabaseClient,
  orderId: string,
  newStatus: OrderStatusType,
  changedBy?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // Get current order
  const { data: order, error: fetchError } = await client
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, error: 'Order not found' };
  }

  const currentStatus = order.status as OrderStatusType;

  // Validate transition
  if (!canTransitionTo(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  // Update order
  const updates: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === ORDER_STATUS.READY_FOR_PICKUP) {
    updates.actual_ready_at = new Date().toISOString();
  }

  const { error: updateError } = await client
    .from('orders')
    .update(updates)
    .eq('id', orderId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Log status change
  try {
    await client.from('order_status_history').insert({
      order_id: orderId,
      status: newStatus,
      changed_by: changedBy || null,
      notes: notes || null,
    });
  } catch {
    // Non-fatal - continue even if logging fails
  }

  return { success: true };
}

// Get order statistics for dashboard
export async function getOrderStats(client: SupabaseClient) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalResult, todayResult, monthRevenueResult] = await Promise.all([
    client.from('orders').select('*', { count: 'exact', head: true }),
    client
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    client
      .from('orders')
      .select('total')
      .gte('created_at', monthAgo.toISOString())
      .eq('payment_status', 'completed'),
  ]);

  const monthRevenue = (monthRevenueResult.data || []).reduce(
    (sum: number, o: { total: number }) => sum + (o.total || 0),
    0
  );

  return {
    totalOrders: totalResult.count ?? 0,
    todayOrders: todayResult.count ?? 0,
    monthRevenue,
    platformFee: monthRevenue * 0.15,
  };
}
