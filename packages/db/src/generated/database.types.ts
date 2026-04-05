// ==========================================
// GENERATED SUPABASE TYPES — REPAIRED
// Aligned to actual schema after 00010_contract_drift_repair migration
// Run `pnpm db:generate` to regenerate from live DB
// ==========================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chef_profiles: {
        Row: {
          id: string
          user_id: string | null
          display_name: string
          bio: string | null
          profile_image_url: string | null
          phone: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          display_name: string
          bio?: string | null
          profile_image_url?: string | null
          phone?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          display_name?: string
          bio?: string | null
          profile_image_url?: string | null
          phone?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chef_storefronts: {
        Row: {
          id: string
          chef_id: string
          kitchen_id: string
          slug: string
          name: string
          description: string | null
          cuisine_types: string[]
          cover_image_url: string | null
          logo_url: string | null
          phone: string | null
          is_active: boolean
          is_featured: boolean
          average_rating: number | null
          total_reviews: number
          min_order_amount: number
          estimated_prep_time_min: number
          estimated_prep_time_max: number
          storefront_state: string | null
          is_paused: boolean | null
          paused_reason: string | null
          paused_at: string | null
          paused_by: string | null
          current_queue_size: number | null
          max_queue_size: number | null
          is_overloaded: boolean | null
          average_prep_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chef_id: string
          kitchen_id: string
          slug: string
          name: string
          description?: string | null
          cuisine_types?: string[]
          cover_image_url?: string | null
          logo_url?: string | null
          phone?: string | null
          is_active?: boolean
          is_featured?: boolean
          average_rating?: number | null
          total_reviews?: number
          min_order_amount?: number
          estimated_prep_time_min?: number
          estimated_prep_time_max?: number
          storefront_state?: string | null
          is_paused?: boolean | null
          current_queue_size?: number | null
          max_queue_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chef_id?: string
          kitchen_id?: string
          slug?: string
          name?: string
          description?: string | null
          cuisine_types?: string[]
          cover_image_url?: string | null
          logo_url?: string | null
          phone?: string | null
          is_active?: boolean
          is_featured?: boolean
          average_rating?: number | null
          total_reviews?: number
          min_order_amount?: number
          estimated_prep_time_min?: number
          estimated_prep_time_max?: number
          storefront_state?: string | null
          is_paused?: boolean | null
          current_queue_size?: number | null
          max_queue_size?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chef_kitchens: {
        Row: {
          id: string
          chef_id: string
          name: string
          address: string | null
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          postal_code: string
          country: string
          lat: number | null
          lng: number | null
          phone: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chef_id: string
          name: string
          address?: string | null
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          postal_code: string
          country?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chef_id?: string
          name?: string
          address?: string | null
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          postal_code?: string
          country?: string
          lat?: number | null
          lng?: number | null
          phone?: string | null
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          id: string
          category_id: string
          storefront_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          is_sold_out: boolean | null
          dietary_tags: string[]
          prep_time_minutes: number | null
          sort_order: number
          daily_limit: number | null
          daily_sold: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          storefront_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_sold_out?: boolean | null
          dietary_tags?: string[]
          prep_time_minutes?: number | null
          sort_order?: number
          daily_limit?: number | null
          daily_sold?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          storefront_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_sold_out?: boolean | null
          dietary_tags?: string[]
          prep_time_minutes?: number | null
          sort_order?: number
          daily_limit?: number | null
          daily_sold?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string
          storefront_id: string
          delivery_address_id: string
          status: string
          engine_status: string | null
          subtotal: number
          delivery_fee: number
          service_fee: number
          tax: number
          tip: number
          total: number
          payment_status: string
          payment_intent_id: string | null
          special_instructions: string | null
          estimated_ready_at: string | null
          actual_ready_at: string | null
          rejection_reason: string | null
          rejection_notes: string | null
          cancellation_reason: string | null
          cancellation_notes: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          estimated_prep_minutes: number | null
          actual_prep_minutes: number | null
          prep_started_at: string | null
          ready_at: string | null
          completed_at: string | null
          exception_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          customer_id: string
          storefront_id: string
          delivery_address_id: string
          status?: string
          engine_status?: string | null
          subtotal: number
          delivery_fee: number
          service_fee: number
          tax: number
          tip?: number
          total: number
          payment_status?: string
          payment_intent_id?: string | null
          special_instructions?: string | null
          estimated_ready_at?: string | null
          actual_ready_at?: string | null
          estimated_prep_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_id?: string
          storefront_id?: string
          delivery_address_id?: string
          status?: string
          engine_status?: string | null
          subtotal?: number
          delivery_fee?: number
          service_fee?: number
          tax?: number
          tip?: number
          total?: number
          payment_status?: string
          payment_intent_id?: string | null
          special_instructions?: string | null
          estimated_ready_at?: string | null
          actual_ready_at?: string | null
          rejection_reason?: string | null
          rejection_notes?: string | null
          cancellation_reason?: string | null
          cancellation_notes?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          estimated_prep_minutes?: number | null
          actual_prep_minutes?: number | null
          prep_started_at?: string | null
          ready_at?: string | null
          completed_at?: string | null
          exception_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          id: string
          order_id: string
          status: string
          previous_status: string | null
          new_status: string | null
          notes: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          status?: string
          previous_status?: string | null
          new_status?: string | null
          notes?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          status?: string
          previous_status?: string | null
          new_status?: string | null
          notes?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          phone: string
          email: string
          profile_image_url: string | null
          status: string
          rating: number | null
          total_deliveries: number
          vehicle_type: string | null
          vehicle_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          phone: string
          email: string
          profile_image_url?: string | null
          status?: string
          rating?: number | null
          total_deliveries?: number
          vehicle_type?: string | null
          vehicle_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          phone?: string
          email?: string
          profile_image_url?: string | null
          status?: string
          rating?: number | null
          total_deliveries?: number
          vehicle_type?: string | null
          vehicle_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_presence: {
        Row: {
          id: string
          driver_id: string
          status: string
          current_lat: number | null
          current_lng: number | null
          last_location_lat: number | null
          last_location_lng: number | null
          last_location_update: string | null
          last_location_at: string | null
          last_updated_at: string | null
          current_shift_id: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          driver_id: string
          status?: string
          current_lat?: number | null
          current_lng?: number | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_update?: string | null
          last_location_at?: string | null
          last_updated_at?: string | null
          current_shift_id?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          status?: string
          current_lat?: number | null
          current_lng?: number | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_update?: string | null
          last_location_at?: string | null
          last_updated_at?: string | null
          current_shift_id?: string | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          id: string
          order_id: string
          driver_id: string | null
          status: string
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_pickup_at: string | null
          actual_pickup_at: string | null
          estimated_dropoff_at: string | null
          actual_dropoff_at: string | null
          distance_km: number | null
          delivery_fee: number
          driver_payout: number
          pickup_photo_url: string | null
          pickup_proof_url: string | null
          dropoff_photo_url: string | null
          dropoff_proof_url: string | null
          customer_signature_url: string | null
          notes: string | null
          delivery_notes: string | null
          assignment_attempts_count: number | null
          last_assignment_at: string | null
          escalated_to_ops: boolean | null
          escalated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          driver_id?: string | null
          status?: string
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_pickup_at?: string | null
          actual_pickup_at?: string | null
          estimated_dropoff_at?: string | null
          actual_dropoff_at?: string | null
          distance_km?: number | null
          delivery_fee: number
          driver_payout: number
          pickup_photo_url?: string | null
          dropoff_photo_url?: string | null
          customer_signature_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          driver_id?: string | null
          status?: string
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_pickup_at?: string | null
          actual_pickup_at?: string | null
          estimated_dropoff_at?: string | null
          actual_dropoff_at?: string | null
          distance_km?: number | null
          delivery_fee?: number
          driver_payout?: number
          pickup_photo_url?: string | null
          pickup_proof_url?: string | null
          dropoff_photo_url?: string | null
          dropoff_proof_url?: string | null
          customer_signature_url?: string | null
          notes?: string | null
          delivery_notes?: string | null
          assignment_attempts_count?: number | null
          escalated_to_ops?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          message: string | null
          data: Json | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string
          message?: string | null
          data?: Json | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          message?: string | null
          data?: Json | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          description: string | null
          discount_type: string
          discount_value: number
          min_order_amount: number | null
          max_discount: number | null
          usage_limit: number | null
          usage_count: number
          max_uses: number | null
          times_used: number
          starts_at: string | null
          expires_at: string | null
          valid_from: string | null
          valid_until: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          description?: string | null
          discount_type: string
          discount_value: number
          min_order_amount?: number | null
          max_discount?: number | null
          usage_limit?: number | null
          usage_count?: number
          max_uses?: number | null
          times_used?: number
          starts_at?: string | null
          expires_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          min_order_amount?: number | null
          max_discount?: number | null
          usage_limit?: number | null
          usage_count?: number
          max_uses?: number | null
          times_used?: number
          starts_at?: string | null
          expires_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_users: {
        Row: {
          id: string
          user_id: string
          email: string
          name: string
          role: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          name: string
          role: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          name?: string
          role?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          phone: string | null
          email: string
          profile_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          phone?: string | null
          email: string
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          email?: string
          profile_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          id: string
          customer_id: string
          label: string
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          postal_code: string
          country: string
          lat: number | null
          lng: number | null
          delivery_instructions: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          label: string
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          postal_code: string
          country?: string
          lat?: number | null
          lng?: number | null
          delivery_instructions?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          label?: string
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          postal_code?: string
          country?: string
          lat?: number | null
          lng?: number | null
          delivery_instructions?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      get_ops_dashboard_stats: {
        Args: {}
        Returns: { stat_name: string; stat_value: number }[]
      }
      get_order_timeline: {
        Args: { p_order_id: string }
        Returns: { event_time: string; event_type: string; event_data: Json; actor_id: string | null }[]
      }
      get_financial_summary: {
        Args: { start_date: string; end_date: string }
        Returns: { metric_name: string; metric_value: number }[]
      }
      get_available_drivers_near: {
        Args: { pickup_lat: number; pickup_lng: number; radius_km?: number }
        Returns: { driver_id: string; user_id: string; first_name: string; last_name: string; distance_km: number; rating: number | null; total_deliveries: number }[]
      }
      get_orders_needing_dispatch: {
        Args: {}
        Returns: { order_id: string; order_number: string; storefront_id: string; total: number; ready_at: string | null }[]
      }
      increment_queue_size: {
        Args: { storefront_id: string }
        Returns: undefined
      }
      decrement_queue_size: {
        Args: { storefront_id: string }
        Returns: undefined
      }
      increment_order_exception_count: {
        Args: { order_id: string }
        Returns: undefined
      }
      increment_promo_usage: {
        Args: { promo_id: string }
        Returns: undefined
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
