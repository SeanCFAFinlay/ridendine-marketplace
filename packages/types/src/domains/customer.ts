// ==========================================
// CUSTOMER DOMAIN TYPES
// ==========================================

export interface Customer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string; // e.g., "Home", "Work"
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  lat: number | null;
  lng: number | null;
  delivery_instructions: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: string;
  customer_id: string;
  storefront_id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  special_instructions: string | null;
  selected_options: CartItemOption[];
  created_at: string;
  updated_at: string;
}

export interface CartItemOption {
  option_id: string;
  option_name: string;
  value_id: string;
  value_name: string;
  price_adjustment: number;
}

export interface Favorite {
  id: string;
  customer_id: string;
  storefront_id: string;
  created_at: string;
}

// Aggregate types for UI
export interface CartWithItems extends Cart {
  items: CartItemWithDetails[];
  subtotal: number;
  delivery_fee: number;
  total: number;
}

export interface CartItemWithDetails extends CartItem {
  menu_item: {
    id: string;
    name: string;
    image_url: string | null;
    is_available: boolean;
  };
}
