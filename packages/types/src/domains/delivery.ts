// ==========================================
// DELIVERY DOMAIN TYPES
// ==========================================

import type { DeliveryStatus } from '../enums';

export interface Delivery {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: DeliveryStatus;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  estimated_pickup_at: string | null;
  actual_pickup_at: string | null;
  estimated_dropoff_at: string | null;
  actual_dropoff_at: string | null;
  distance_km: number | null;
  delivery_fee: number;
  driver_payout: number;
  pickup_photo_url: string | null;
  dropoff_photo_url: string | null;
  customer_signature_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAssignment {
  id: string;
  delivery_id: string;
  driver_id: string;
  offered_at: string;
  expires_at: string;
  responded_at: string | null;
  response: 'accepted' | 'rejected' | 'expired' | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface DeliveryEvent {
  id: string;
  delivery_id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  actor_type: 'system' | 'driver' | 'customer' | 'chef' | 'ops';
  actor_id: string | null;
  created_at: string;
}

export interface DeliveryTrackingEvent {
  id: string;
  delivery_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  recorded_at: string;
}

// Aggregate types for UI
export interface DeliveryWithDetails extends Delivery {
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_phone: string | null;
    items_summary: string;
  };
  storefront: {
    id: string;
    name: string;
    phone: string | null;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    vehicle: string | null;
  } | null;
  events: DeliveryEvent[];
}

export interface DeliveryOffer {
  id: string;
  delivery_id: string;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number | null;
  estimated_earnings: number;
  expires_at: string;
  storefront_name: string;
  items_count: number;
}
