// ==========================================
// CHEF DOMAIN TYPES
// ==========================================

import type { ChefStatus, DocumentType, DocumentStatus } from '../enums';

export interface ChefProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  profile_image_url: string | null;
  phone: string | null;
  status: ChefStatus;
  created_at: string;
  updated_at: string;
}

export interface ChefKitchen {
  id: string;
  chef_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  lat: number | null;
  lng: number | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChefStorefront {
  id: string;
  chef_id: string;
  kitchen_id: string;
  slug: string;
  name: string;
  description: string | null;
  cuisine_types: string[];
  cover_image_url: string | null;
  logo_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  average_rating: number | null;
  total_reviews: number;
  min_order_amount: number;
  estimated_prep_time_min: number;
  estimated_prep_time_max: number;
  created_at: string;
  updated_at: string;
}

export interface ChefDocument {
  id: string;
  chef_id: string;
  document_type: DocumentType;
  document_url: string;
  status: DocumentStatus;
  expires_at: string | null;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChefPayoutAccount {
  id: string;
  chef_id: string;
  stripe_account_id: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type BankPayoutStatus =
  | 'scheduled'
  | 'approved'
  | 'exported'
  | 'bank_submitted'
  | 'paid'
  | 'failed'
  | 'reconciled';

export interface ChefPayout {
  id: string;
  chef_id: string;
  payout_run_id: string | null;
  amount: number;
  status: BankPayoutStatus;
  payment_rail: 'bank';
  bank_batch_id: string | null;
  bank_reference: string | null;
  reconciliation_status: 'pending' | 'reconciled' | 'disputed';
  stripe_transfer_id: string | null;
  period_start: string;
  period_end: string;
  orders_count: number;
  approved_by: string | null;
  approved_at: string | null;
  executed_by: string | null;
  executed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChefAvailability {
  id: string;
  storefront_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChefDeliveryZone {
  id: string;
  storefront_id: string;
  name: string;
  radius_km: number | null;
  polygon: unknown | null; // GeoJSON for complex zones
  delivery_fee: number;
  min_order_for_free_delivery: number | null;
  estimated_delivery_min: number;
  estimated_delivery_max: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Menu types (part of chef domain)
export interface MenuCategory {
  id: string;
  storefront_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  storefront_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  dietary_tags: string[];
  prep_time_minutes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemOption {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemOptionValue {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItemAvailability {
  id: string;
  menu_item_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

// Aggregate types for UI
export interface ChefStorefrontWithDetails extends ChefStorefront {
  chef: ChefProfile;
  kitchen: ChefKitchen;
  categories: MenuCategoryWithItems[];
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItemWithOptions[];
}

export interface MenuItemWithOptions extends MenuItem {
  options: MenuItemOptionWithValues[];
}

export interface MenuItemOptionWithValues extends MenuItemOption {
  values: MenuItemOptionValue[];
}
