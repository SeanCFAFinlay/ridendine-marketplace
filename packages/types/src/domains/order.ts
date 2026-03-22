// ==========================================
// ORDER DOMAIN TYPES
// ==========================================

import type { OrderStatus, PaymentStatus } from '../enums';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  storefront_id: string;
  delivery_address_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  tip: number;
  total: number;
  payment_status: PaymentStatus;
  payment_intent_id: string | null;
  special_instructions: string | null;
  estimated_ready_at: string | null;
  actual_ready_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string | null;
  created_at: string;
}

export interface OrderItemModifier {
  id: string;
  order_item_id: string;
  option_name: string;
  value_name: string;
  price_adjustment: number;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  storefront_id: string;
  rating: number; // 1-5
  comment: string | null;
  chef_response: string | null;
  chef_responded_at: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  order_id: string | null;
  customer_id: string | null;
  chef_id: string | null;
  driver_id: string | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

// Aggregate types for UI
export interface OrderWithDetails extends Order {
  items: OrderItemWithModifiers[];
  storefront: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  delivery_address: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
  };
  delivery: {
    id: string;
    status: string;
    driver_name: string | null;
    driver_phone: string | null;
  } | null;
  status_history: OrderStatusHistory[];
}

export interface OrderItemWithModifiers extends OrderItem {
  modifiers: OrderItemModifier[];
}
