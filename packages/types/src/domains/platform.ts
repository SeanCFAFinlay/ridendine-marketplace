// ==========================================
// PLATFORM / OPS DOMAIN TYPES
// ==========================================

import type { NotificationType } from '../enums';

export interface PlatformUser {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: 'ops_admin' | 'super_admin' | 'support';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminNote {
  id: string;
  entity_type: 'chef' | 'customer' | 'driver' | 'order' | 'delivery';
  entity_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_type: 'user' | 'system' | 'admin';
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PayoutRun {
  id: string;
  run_type: 'chef' | 'driver';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  period_start: string;
  period_end: string;
  total_amount: number;
  total_recipients: number;
  successful_payouts: number;
  failed_payouts: number;
  initiated_by: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Dashboard aggregate types
export interface PlatformStats {
  total_chefs: number;
  pending_chef_approvals: number;
  total_drivers: number;
  active_drivers: number;
  total_orders_today: number;
  total_revenue_today: number;
  active_deliveries: number;
  open_support_tickets: number;
}

export interface ChefApprovalRequest {
  chef: {
    id: string;
    display_name: string;
    email: string;
    phone: string | null;
    created_at: string;
  };
  kitchen: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  documents: Array<{
    type: string;
    status: string;
    url: string;
  }>;
  storefront: {
    name: string;
    cuisine_types: string[];
  } | null;
}
