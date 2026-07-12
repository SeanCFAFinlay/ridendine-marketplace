export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notes: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          note: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          id?: string
          note: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          page_url: string | null
          properties: Json | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          page_url?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          page_url?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_partner_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          partner_id: string
          require_signature: boolean
          revoked_at: string | null
          scopes: Json
          signing_secret: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          partner_id: string
          require_signature?: boolean
          revoked_at?: string | null
          scopes?: Json
          signing_secret?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          partner_id?: string
          require_signature?: boolean
          revoked_at?: string | null
          scopes?: Json
          signing_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_partner_keys_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "api_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_partner_keys_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      api_partners: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          rate_limit_per_min: number
          slug: string
          test_mode: boolean
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rate_limit_per_min?: number
          slug: string
          test_mode?: boolean
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rate_limit_per_min?: number
          slug?: string
          test_mode?: boolean
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      assignment_attempts: {
        Row: {
          attempt_number: number
          created_at: string
          decline_reason: string | null
          delivery_id: string
          distance_meters: number | null
          driver_id: string
          estimated_minutes: number | null
          expires_at: string
          id: string
          offered_at: string
          responded_at: string | null
          response: string
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          decline_reason?: string | null
          delivery_id: string
          distance_meters?: number | null
          driver_id: string
          estimated_minutes?: number | null
          expires_at: string
          id?: string
          offered_at?: string
          responded_at?: string | null
          response?: string
        }
        Update: {
          attempt_number?: number
          created_at?: string
          decline_reason?: string | null
          delivery_id?: string
          distance_meters?: number | null
          driver_id?: string
          estimated_minutes?: number | null
          expires_at?: string
          id?: string
          offered_at?: string
          responded_at?: string | null
          response?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_attempts_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_attempts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          actor_type: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          reason: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          actor_type: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          reason?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          menu_item_id: string
          quantity: number
          selected_options: Json | null
          special_instructions: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          menu_item_id: string
          quantity?: number
          selected_options?: Json | null
          special_instructions?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          menu_item_id?: string
          quantity?: number
          selected_options?: Json | null
          special_instructions?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          storefront_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          storefront_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_idempotency_keys: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          idempotency_key: string
          last_error: string | null
          order_id: string | null
          payment_intent_id: string | null
          request_hash: string
          response_payload: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          order_id?: string | null
          payment_intent_id?: string | null
          request_hash: string
          response_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          order_id?: string | null
          payment_intent_id?: string | null
          request_hash?: string
          response_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_idempotency_keys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_idempotency_keys_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          storefront_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          storefront_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_availability_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_delivery_zones: {
        Row: {
          created_at: string
          delivery_fee: number
          estimated_delivery_max: number
          estimated_delivery_min: number
          id: string
          is_active: boolean
          min_order_for_free_delivery: number | null
          name: string
          polygon: unknown
          radius_km: number | null
          storefront_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          estimated_delivery_max?: number
          estimated_delivery_min?: number
          id?: string
          is_active?: boolean
          min_order_for_free_delivery?: number | null
          name: string
          polygon?: unknown
          radius_km?: number | null
          storefront_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          estimated_delivery_max?: number
          estimated_delivery_min?: number
          id?: string
          is_active?: boolean
          min_order_for_free_delivery?: number | null
          name?: string
          polygon?: unknown
          radius_km?: number | null
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_delivery_zones_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_documents: {
        Row: {
          chef_id: string
          created_at: string
          document_type: string
          document_url: string
          expires_at: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          document_type: string
          document_url: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          document_type?: string
          document_url?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_documents_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_kitchens: {
        Row: {
          address: string | null
          address_line1: string
          address_line2: string | null
          chef_id: string
          city: string
          country: string
          created_at: string
          id: string
          is_verified: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          postal_code: string
          state: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_line1: string
          address_line2?: string | null
          chef_id: string
          city: string
          country?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          postal_code: string
          state: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_line1?: string
          address_line2?: string | null
          chef_id?: string
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          postal_code?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_kitchens_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_payout_accounts: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          is_verified: boolean
          payout_enabled: boolean | null
          stripe_account_id: string | null
          stripe_account_status: string | null
          updated_at: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          is_verified?: boolean
          payout_enabled?: boolean | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          updated_at?: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          is_verified?: boolean
          payout_enabled?: boolean | null
          stripe_account_id?: string | null
          stripe_account_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_payout_accounts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: true
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_batch_id: string | null
          bank_reference: string | null
          chef_id: string
          created_at: string
          executed_at: string | null
          executed_by: string | null
          id: string
          orders_count: number
          paid_at: string | null
          payment_rail: string
          payout_run_id: string | null
          period_end: string
          period_start: string
          reconciliation_status: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_batch_id?: string | null
          bank_reference?: string | null
          chef_id: string
          created_at?: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          orders_count?: number
          paid_at?: string | null
          payment_rail?: string
          payout_run_id?: string | null
          period_end: string
          period_start: string
          reconciliation_status?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_batch_id?: string | null
          bank_reference?: string | null
          chef_id?: string
          created_at?: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          orders_count?: number
          paid_at?: string | null
          payment_rail?: string
          payout_run_id?: string | null
          period_end?: string
          period_start?: string
          reconciliation_status?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_payouts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_payouts_payout_run_id_fkey"
            columns: ["payout_run_id"]
            isOneToOne: false
            referencedRelation: "payout_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string
          id: string
          phone: string | null
          profile_image_url: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name: string
          id?: string
          phone?: string | null
          profile_image_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          profile_image_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chef_storefronts: {
        Row: {
          average_prep_minutes: number | null
          average_rating: number | null
          chef_id: string
          cover_image_url: string | null
          created_at: string
          cuisine_types: string[] | null
          current_queue_size: number | null
          description: string | null
          estimated_prep_time_max: number
          estimated_prep_time_min: number
          id: string
          is_active: boolean
          is_featured: boolean
          is_overloaded: boolean | null
          is_paused: boolean | null
          kitchen_id: string
          logo_url: string | null
          max_queue_size: number | null
          min_order_amount: number
          name: string
          paused_at: string | null
          paused_by: string | null
          paused_reason: string | null
          phone: string | null
          prep_time_buffer_minutes: number
          service_state: string
          service_state_reason: string | null
          slug: string
          storefront_state: string | null
          total_reviews: number
          updated_at: string
        }
        Insert: {
          average_prep_minutes?: number | null
          average_rating?: number | null
          chef_id: string
          cover_image_url?: string | null
          created_at?: string
          cuisine_types?: string[] | null
          current_queue_size?: number | null
          description?: string | null
          estimated_prep_time_max?: number
          estimated_prep_time_min?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_overloaded?: boolean | null
          is_paused?: boolean | null
          kitchen_id: string
          logo_url?: string | null
          max_queue_size?: number | null
          min_order_amount?: number
          name: string
          paused_at?: string | null
          paused_by?: string | null
          paused_reason?: string | null
          phone?: string | null
          prep_time_buffer_minutes?: number
          service_state?: string
          service_state_reason?: string | null
          slug: string
          storefront_state?: string | null
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          average_prep_minutes?: number | null
          average_rating?: number | null
          chef_id?: string
          cover_image_url?: string | null
          created_at?: string
          cuisine_types?: string[] | null
          current_queue_size?: number | null
          description?: string | null
          estimated_prep_time_max?: number
          estimated_prep_time_min?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_overloaded?: boolean | null
          is_paused?: boolean | null
          kitchen_id?: string
          logo_url?: string | null
          max_queue_size?: number | null
          min_order_amount?: number
          name?: string
          paused_at?: string | null
          paused_by?: string | null
          paused_reason?: string | null
          phone?: string | null
          prep_time_buffer_minutes?: number
          service_state?: string
          service_state_reason?: string | null
          slug?: string
          storefront_state?: string | null
          total_reviews?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_storefronts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chef_storefronts_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          customer_id: string
          delivery_instructions: string | null
          id: string
          is_default: boolean
          label: string
          lat: number | null
          lng: number | null
          postal_code: string
          state: string
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          customer_id: string
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean
          label: string
          lat?: number | null
          lng?: number | null
          postal_code: string
          state: string
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          customer_id?: string
          delivery_instructions?: string | null
          id?: string
          is_default?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          postal_code?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          profile_image_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          profile_image_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          profile_image_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_dropoff_at: string | null
          actual_pickup_at: string | null
          assignment_attempts_count: number | null
          created_at: string
          customer_signature_url: string | null
          delivery_fee: number
          delivery_notes: string | null
          distance_km: number | null
          driver_id: string | null
          driver_payout: number
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_photo_url: string | null
          dropoff_proof_url: string | null
          escalated_at: string | null
          escalated_to_ops: boolean | null
          estimated_dropoff_at: string | null
          estimated_pickup_at: string | null
          eta_dropoff_at: string | null
          eta_pickup_at: string | null
          id: string
          last_assignment_at: string | null
          notes: string | null
          order_id: string
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_photo_url: string | null
          pickup_proof_url: string | null
          route_progress_pct: number | null
          route_to_dropoff_meters: number | null
          route_to_dropoff_polyline: string | null
          route_to_dropoff_seconds: number | null
          route_to_pickup_meters: number | null
          route_to_pickup_polyline: string | null
          route_to_pickup_seconds: number | null
          routing_computed_at: string | null
          routing_provider: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_dropoff_at?: string | null
          actual_pickup_at?: string | null
          assignment_attempts_count?: number | null
          created_at?: string
          customer_signature_url?: string | null
          delivery_fee: number
          delivery_notes?: string | null
          distance_km?: number | null
          driver_id?: string | null
          driver_payout: number
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_photo_url?: string | null
          dropoff_proof_url?: string | null
          escalated_at?: string | null
          escalated_to_ops?: boolean | null
          estimated_dropoff_at?: string | null
          estimated_pickup_at?: string | null
          eta_dropoff_at?: string | null
          eta_pickup_at?: string | null
          id?: string
          last_assignment_at?: string | null
          notes?: string | null
          order_id: string
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_photo_url?: string | null
          pickup_proof_url?: string | null
          route_progress_pct?: number | null
          route_to_dropoff_meters?: number | null
          route_to_dropoff_polyline?: string | null
          route_to_dropoff_seconds?: number | null
          route_to_pickup_meters?: number | null
          route_to_pickup_polyline?: string | null
          route_to_pickup_seconds?: number | null
          routing_computed_at?: string | null
          routing_provider?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_dropoff_at?: string | null
          actual_pickup_at?: string | null
          assignment_attempts_count?: number | null
          created_at?: string
          customer_signature_url?: string | null
          delivery_fee?: number
          delivery_notes?: string | null
          distance_km?: number | null
          driver_id?: string | null
          driver_payout?: number
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_photo_url?: string | null
          dropoff_proof_url?: string | null
          escalated_at?: string | null
          escalated_to_ops?: boolean | null
          estimated_dropoff_at?: string | null
          estimated_pickup_at?: string | null
          eta_dropoff_at?: string | null
          eta_pickup_at?: string | null
          id?: string
          last_assignment_at?: string | null
          notes?: string | null
          order_id?: string
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_photo_url?: string | null
          pickup_proof_url?: string | null
          route_progress_pct?: number | null
          route_to_dropoff_meters?: number | null
          route_to_dropoff_polyline?: string | null
          route_to_dropoff_seconds?: number | null
          route_to_pickup_meters?: number | null
          route_to_pickup_polyline?: string | null
          route_to_pickup_seconds?: number | null
          routing_computed_at?: string | null
          routing_provider?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          created_at: string
          delivery_id: string
          driver_id: string
          expires_at: string
          id: string
          offered_at: string
          rejection_reason: string | null
          responded_at: string | null
          response: string | null
        }
        Insert: {
          created_at?: string
          delivery_id: string
          driver_id: string
          expires_at: string
          id?: string
          offered_at?: string
          rejection_reason?: string | null
          responded_at?: string | null
          response?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string
          driver_id?: string
          expires_at?: string
          id?: string
          offered_at?: string
          rejection_reason?: string | null
          responded_at?: string | null
          response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          delivery_id: string
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          delivery_id: string
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          delivery_id?: string
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tracking_events: {
        Row: {
          accuracy: number | null
          delivery_id: string
          driver_id: string
          id: string
          lat: number
          lng: number
          recorded_at: string
        }
        Insert: {
          accuracy?: number | null
          delivery_id: string
          driver_id: string
          id?: string
          lat: number
          lng: number
          recorded_at?: string
        }
        Update: {
          accuracy?: number | null
          delivery_id?: string
          driver_id?: string
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tracking_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_tracking_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_events: {
        Row: {
          actor_entity_id: string | null
          actor_role: string
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          payload: Json
          published: boolean
          published_at: string | null
          version: number
        }
        Insert: {
          actor_entity_id?: string | null
          actor_role: string
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          payload?: Json
          published?: boolean
          published_at?: string | null
          version?: number
        }
        Update: {
          actor_entity_id?: string | null
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          payload?: Json
          published?: boolean
          published_at?: string | null
          version?: number
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          created_at: string
          document_type: string
          document_url: string
          driver_id: string
          expires_at: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url: string
          driver_id: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string
          driver_id?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_earnings: {
        Row: {
          base_amount: number
          bonus_amount: number
          created_at: string
          delivery_id: string
          driver_id: string
          id: string
          shift_id: string | null
          tip_amount: number
          total_amount: number
        }
        Insert: {
          base_amount: number
          bonus_amount?: number
          created_at?: string
          delivery_id: string
          driver_id: string
          id?: string
          shift_id?: string | null
          tip_amount?: number
          total_amount: number
        }
        Update: {
          base_amount?: number
          bonus_amount?: number
          created_at?: string
          delivery_id?: string
          driver_id?: string
          id?: string
          shift_id?: string | null
          tip_amount?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "driver_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          accuracy: number | null
          driver_id: string
          heading: number | null
          id: string
          lat: number
          lng: number
          recorded_at: string
          shift_id: string | null
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          driver_id: string
          heading?: number | null
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          shift_id?: string | null
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          driver_id?: string
          heading?: number | null
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          shift_id?: string | null
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_locations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "driver_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_notification_preferences: {
        Row: {
          created_at: string
          driver_id: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          preferences?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_notification_preferences_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payout_accounts: {
        Row: {
          charges_enabled: boolean
          created_at: string
          driver_id: string
          id: string
          onboarding_completed_at: string | null
          payouts_enabled: boolean
          status: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          created_at?: string
          driver_id: string
          id?: string
          onboarding_completed_at?: string | null
          payouts_enabled?: boolean
          status?: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          created_at?: string
          driver_id?: string
          id?: string
          onboarding_completed_at?: string | null
          payouts_enabled?: boolean
          status?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_payout_accounts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_batch_id: string | null
          bank_reference: string | null
          created_at: string
          driver_id: string
          executed_at: string | null
          executed_by: string | null
          id: string
          paid_at: string | null
          payment_rail: string
          payout_run_id: string | null
          period_end: string
          period_start: string
          reconciliation_status: string
          status: string
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_batch_id?: string | null
          bank_reference?: string | null
          created_at?: string
          driver_id: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          paid_at?: string | null
          payment_rail?: string
          payout_run_id?: string | null
          period_end: string
          period_start: string
          reconciliation_status?: string
          status?: string
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_batch_id?: string | null
          bank_reference?: string | null
          created_at?: string
          driver_id?: string
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          paid_at?: string | null
          payment_rail?: string
          payout_run_id?: string | null
          period_end?: string
          period_start?: string
          reconciliation_status?: string
          status?: string
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_payouts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_presence: {
        Row: {
          current_lat: number | null
          current_lng: number | null
          current_shift_id: string | null
          driver_id: string
          id: string
          last_location_at: string | null
          last_location_lat: number | null
          last_location_lng: number | null
          last_location_update: string | null
          last_updated_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          current_lat?: number | null
          current_lng?: number | null
          current_shift_id?: string | null
          driver_id: string
          id?: string
          last_location_at?: string | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_update?: string | null
          last_updated_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          current_lat?: number | null
          current_lng?: number | null
          current_shift_id?: string | null
          driver_id?: string
          id?: string
          last_location_at?: string | null
          last_location_lat?: number | null
          last_location_lng?: number | null
          last_location_update?: string | null
          last_updated_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_presence_current_shift_id_fkey"
            columns: ["current_shift_id"]
            isOneToOne: false
            referencedRelation: "driver_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_presence_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_shifts: {
        Row: {
          created_at: string
          driver_id: string
          ended_at: string | null
          id: string
          started_at: string
          total_deliveries: number
          total_distance_km: number | null
          total_earnings: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          ended_at?: string | null
          id?: string
          started_at?: string
          total_deliveries?: number
          total_distance_km?: number | null
          total_earnings?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          total_deliveries?: number
          total_distance_km?: number | null
          total_earnings?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_shifts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicles: {
        Row: {
          color: string | null
          created_at: string
          driver_id: string
          id: string
          is_active: boolean
          license_plate: string | null
          make: string | null
          model: string | null
          updated_at: string
          vehicle_type: string
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          driver_id: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          make?: string | null
          model?: string | null
          updated_at?: string
          vehicle_type: string
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          is_active?: boolean
          license_plate?: string | null
          make?: string | null
          model?: string | null
          updated_at?: string
          vehicle_type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          instant_payouts_enabled: boolean
          last_name: string
          payout_blocked: boolean
          phone: string
          profile_image_url: string | null
          rating: number | null
          status: string
          stripe_connect_account_id: string | null
          total_deliveries: number
          updated_at: string
          user_id: string | null
          vehicle_description: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          instant_payouts_enabled?: boolean
          last_name: string
          payout_blocked?: boolean
          phone: string
          profile_image_url?: string | null
          rating?: number | null
          status?: string
          stripe_connect_account_id?: string | null
          total_deliveries?: number
          updated_at?: string
          user_id?: string | null
          vehicle_description?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          instant_payouts_enabled?: boolean
          last_name?: string
          payout_blocked?: boolean
          phone?: string
          profile_image_url?: string | null
          rating?: number | null
          status?: string
          stripe_connect_account_id?: string | null
          total_deliveries?: number
          updated_at?: string
          user_id?: string | null
          vehicle_description?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          storefront_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          storefront_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          storefront_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      instant_payout_requests: {
        Row: {
          amount_cents: number
          driver_id: string
          executed_at: string | null
          failure_reason: string | null
          fee_cents: number
          id: string
          requested_at: string
          status: string
          stripe_payout_id: string | null
        }
        Insert: {
          amount_cents: number
          driver_id: string
          executed_at?: string | null
          failure_reason?: string | null
          fee_cents: number
          id?: string
          requested_at?: string
          status?: string
          stripe_payout_id?: string | null
        }
        Update: {
          amount_cents?: number
          driver_id?: string
          executed_at?: string | null
          failure_reason?: string | null
          fee_cents?: number
          id?: string
          requested_at?: string
          status?: string
          stripe_payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instant_payout_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_alerts: {
        Row: {
          alert_type: string
          created_at: string
          detail: Json
          id: string
          inventory_item_id: string
          kitchen_id: string
          resolved_at: string | null
          status: string
          storefront_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          detail?: Json
          id?: string
          inventory_item_id: string
          kitchen_id: string
          resolved_at?: string | null
          status?: string
          storefront_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          detail?: Json
          id?: string
          inventory_item_id?: string
          kitchen_id?: string
          resolved_at?: string | null
          status?: string
          storefront_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alerts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_alerts_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_count_lines: {
        Row: {
          count_id: string
          counted_quantity: number
          created_at: string
          id: string
          inventory_item_id: string
          system_quantity: number | null
          variance: number | null
        }
        Insert: {
          count_id: string
          counted_quantity: number
          created_at?: string
          id?: string
          inventory_item_id: string
          system_quantity?: number | null
          variance?: number | null
        }
        Update: {
          count_id?: string
          counted_quantity?: number
          created_at?: string
          id?: string
          inventory_item_id?: string
          system_quantity?: number | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_count_lines_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "inventory_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_count_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_counts: {
        Row: {
          completed_at: string | null
          counted_by: string | null
          created_at: string
          id: string
          kitchen_id: string
          note: string | null
          status: string
          storefront_id: string | null
        }
        Insert: {
          completed_at?: string | null
          counted_by?: string | null
          created_at?: string
          id?: string
          kitchen_id: string
          note?: string | null
          status?: string
          storefront_id?: string | null
        }
        Update: {
          completed_at?: string | null
          counted_by?: string | null
          created_at?: string
          id?: string
          kitchen_id?: string
          note?: string | null
          status?: string
          storefront_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_counts_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_counts_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          cost_per_unit: number
          created_at: string
          current_quantity: number
          expiry_date: string | null
          id: string
          is_active: boolean
          kitchen_id: string
          lot_code: string | null
          name: string
          par_quantity: number | null
          preferred_supplier_id: string | null
          reorder_point: number | null
          storage_location_id: string | null
          storefront_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          kitchen_id: string
          lot_code?: string | null
          name: string
          par_quantity?: number | null
          preferred_supplier_id?: string | null
          reorder_point?: number | null
          storage_location_id?: string | null
          storefront_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          kitchen_id?: string
          lot_code?: string | null
          name?: string
          par_quantity?: number | null
          preferred_supplier_id?: string | null
          reorder_point?: number | null
          storage_location_id?: string | null
          storefront_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          kitchen_id: string
          metadata: Json
          movement_type: string
          note: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          storefront_id: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          kitchen_id: string
          metadata?: Json
          movement_type: string
          note?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          storefront_id?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          kitchen_id?: string
          metadata?: Json
          movement_type?: string
          note?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          storefront_id?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_movements_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_waste_events: {
        Row: {
          cost_value: number | null
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          kitchen_id: string
          quantity: number
          reason: string | null
          storefront_id: string | null
        }
        Insert: {
          cost_value?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          kitchen_id: string
          quantity: number
          reason?: string | null
          storefront_id?: string | null
        }
        Update: {
          cost_value?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          kitchen_id?: string
          quantity?: number
          reason?: string | null
          storefront_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_waste_events_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_waste_events_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_waste_events_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_daily_summaries: {
        Row: {
          avg_prep_minutes: number | null
          closed_at: string
          closed_by: string | null
          created_at: string
          food_cost: number | null
          gross_sales: number
          id: string
          labor_cost: number | null
          late_tickets: number
          metadata: Json
          net_sales: number
          notes: string | null
          orders_completed: number
          packaging_cost: number | null
          prime_cost: number | null
          refund_loss: number | null
          reopened_at: string | null
          sold_out_items: Json
          storefront_id: string
          summary_date: string
          top_sellers: Json
          updated_at: string
          waste_value: number | null
        }
        Insert: {
          avg_prep_minutes?: number | null
          closed_at?: string
          closed_by?: string | null
          created_at?: string
          food_cost?: number | null
          gross_sales?: number
          id?: string
          labor_cost?: number | null
          late_tickets?: number
          metadata?: Json
          net_sales?: number
          notes?: string | null
          orders_completed?: number
          packaging_cost?: number | null
          prime_cost?: number | null
          refund_loss?: number | null
          reopened_at?: string | null
          sold_out_items?: Json
          storefront_id: string
          summary_date: string
          top_sellers?: Json
          updated_at?: string
          waste_value?: number | null
        }
        Update: {
          avg_prep_minutes?: number | null
          closed_at?: string
          closed_by?: string | null
          created_at?: string
          food_cost?: number | null
          gross_sales?: number
          id?: string
          labor_cost?: number | null
          late_tickets?: number
          metadata?: Json
          net_sales?: number
          notes?: string | null
          orders_completed?: number
          packaging_cost?: number | null
          prime_cost?: number | null
          refund_loss?: number | null
          reopened_at?: string | null
          sold_out_items?: Json
          storefront_id?: string
          summary_date?: string
          top_sellers?: Json
          updated_at?: string
          waste_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_daily_summaries_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_queue_entries: {
        Row: {
          actual_prep_minutes: number | null
          completed_at: string | null
          created_at: string
          estimated_prep_minutes: number
          id: string
          order_id: string
          position: number
          started_at: string | null
          status: string
          storefront_id: string
          updated_at: string
        }
        Insert: {
          actual_prep_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          estimated_prep_minutes?: number
          id?: string
          order_id: string
          position: number
          started_at?: string | null
          status?: string
          storefront_id: string
          updated_at?: string
        }
        Update: {
          actual_prep_minutes?: number | null
          completed_at?: string | null
          created_at?: string
          estimated_prep_minutes?: number
          id?: string
          order_id?: string
          position?: number
          started_at?: string | null
          status?: string
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_queue_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_queue_entries_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_shifts: {
        Row: {
          created_at: string
          id: string
          kitchen_id: string
          notes: string | null
          role: string | null
          scheduled_end: string
          scheduled_start: string
          staff_id: string
          station_id: string | null
          storefront_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kitchen_id: string
          notes?: string | null
          role?: string | null
          scheduled_end: string
          scheduled_start: string
          staff_id: string
          station_id?: string | null
          storefront_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kitchen_id?: string
          notes?: string | null
          role?: string | null
          scheduled_end?: string
          scheduled_start?: string
          staff_id?: string
          station_id?: string | null
          storefront_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_shifts_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "kitchen_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_shifts_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_shifts_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_staff: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          is_active: boolean
          kitchen_id: string
          name: string
          role: string | null
          station_id: string | null
          storefront_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          kitchen_id: string
          name: string
          role?: string | null
          station_id?: string | null
          storefront_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          kitchen_id?: string
          name?: string
          role?: string | null
          station_id?: string | null
          storefront_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_staff_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_staff_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_staff_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_station_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          id: string
          kitchen_id: string
          released_at: string | null
          shift_id: string | null
          staff_id: string
          station_id: string
          storefront_id: string | null
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          id?: string
          kitchen_id: string
          released_at?: string | null
          shift_id?: string | null
          staff_id: string
          station_id: string
          storefront_id?: string | null
        }
        Update: {
          assigned_at?: string
          created_at?: string
          id?: string
          kitchen_id?: string
          released_at?: string | null
          shift_id?: string | null
          staff_id?: string
          station_id?: string
          storefront_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_station_assignments_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_station_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "kitchen_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_station_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "kitchen_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_station_assignments_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_station_assignments_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_stations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kitchen_id: string
          name: string
          sort_order: number
          storefront_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kitchen_id: string
          name: string
          sort_order?: number
          storefront_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kitchen_id?: string
          name?: string
          sort_order?: number
          storefront_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_stations_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_stations_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_ticket_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          detail: Json
          event_type: string
          from_status: string | null
          id: string
          storefront_id: string
          ticket_id: string
          to_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          event_type: string
          from_status?: string | null
          id?: string
          storefront_id: string
          ticket_id: string
          to_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          event_type?: string
          from_status?: string | null
          id?: string
          storefront_id?: string
          ticket_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_ticket_events_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "kitchen_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_ticket_items: {
        Row: {
          allergen_flags: string[]
          completed_at: string | null
          created_at: string
          id: string
          menu_item_id: string | null
          modifiers_snapshot: Json
          order_item_id: string | null
          quantity: number
          special_instructions: string | null
          started_at: string | null
          station_id: string | null
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          allergen_flags?: string[]
          completed_at?: string | null
          created_at?: string
          id?: string
          menu_item_id?: string | null
          modifiers_snapshot?: Json
          order_item_id?: string | null
          quantity?: number
          special_instructions?: string | null
          started_at?: string | null
          station_id?: string | null
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          allergen_flags?: string[]
          completed_at?: string | null
          created_at?: string
          id?: string
          menu_item_id?: string | null
          modifiers_snapshot?: Json
          order_item_id?: string | null
          quantity?: number
          special_instructions?: string | null
          started_at?: string | null
          station_id?: string | null
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_ticket_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_ticket_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_ticket_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_ticket_items_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "kitchen_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_tickets: {
        Row: {
          created_at: string
          id: string
          kitchen_status: string
          metadata: Json
          notes: string | null
          order_id: string
          packed_at: string | null
          packing_started_at: string | null
          priority: number
          problem_reason: string | null
          queue_entry_id: string | null
          ready_at: string | null
          started_at: string | null
          station_id: string | null
          storefront_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kitchen_status?: string
          metadata?: Json
          notes?: string | null
          order_id: string
          packed_at?: string | null
          packing_started_at?: string | null
          priority?: number
          problem_reason?: string | null
          queue_entry_id?: string | null
          ready_at?: string | null
          started_at?: string | null
          station_id?: string | null
          storefront_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kitchen_status?: string
          metadata?: Json
          notes?: string | null
          order_id?: string
          packed_at?: string | null
          packing_started_at?: string | null
          priority?: number
          problem_reason?: string | null
          queue_entry_id?: string | null
          ready_at?: string | null
          started_at?: string | null
          station_id?: string | null
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_tickets_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "kitchen_queue_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_tickets_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_tickets_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          kitchen_id: string
          storefront_id: string
          target_id: string | null
          target_type: string | null
          time_entry_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          kitchen_id: string
          storefront_id: string
          target_id?: string | null
          target_type?: string | null
          time_entry_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kitchen_id?: string
          storefront_id?: string
          target_id?: string | null
          target_type?: string | null
          time_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labor_allocations_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_allocations_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_allocations_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_cost_snapshots: {
        Row: {
          created_at: string
          id: string
          kitchen_id: string
          labor_cost: number
          labor_hours: number
          snapshot_date: string
          staff_count: number
          storefront_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kitchen_id: string
          labor_cost?: number
          labor_hours?: number
          snapshot_date: string
          staff_count?: number
          storefront_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kitchen_id?: string
          labor_cost?: number
          labor_hours?: number
          snapshot_date?: string
          staff_count?: number
          storefront_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_cost_snapshots_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labor_cost_snapshots_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          entry_type: string
          id: string
          idempotency_key: string | null
          metadata: Json | null
          order_id: string | null
          stripe_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          entry_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          order_id?: string | null
          stripe_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          order_id?: string | null
          stripe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          lifetime_points: number
          points_balance: number
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          lifetime_points?: number
          points_balance?: number
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          lifetime_points?: number
          points_balance?: number
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          loyalty_account_id: string
          order_id: string | null
          points: number
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          loyalty_account_id: string
          order_id?: string | null
          points: number
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          loyalty_account_id?: string
          order_id?: string | null
          points?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_loyalty_account_id_fkey"
            columns: ["loyalty_account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          storefront_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          storefront_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          is_available: boolean
          menu_item_id: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          is_available?: boolean
          menu_item_id: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_available?: boolean
          menu_item_id?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_availability_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_option_values: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          name: string
          option_id: string
          price_adjustment: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          name: string
          option_id: string
          price_adjustment?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          name?: string
          option_id?: string
          price_adjustment?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_option_values_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "menu_item_options"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_options: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          max_selections: number
          menu_item_id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number
          menu_item_id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number
          menu_item_id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_options_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_packaging: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          packaging_item_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          packaging_item_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          packaging_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_packaging_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_packaging_packaging_item_id_fkey"
            columns: ["packaging_item_id"]
            isOneToOne: false
            referencedRelation: "packaging_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_recipe_versions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          menu_item_id: string
          recipe_version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_item_id: string
          recipe_version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_item_id?: string
          recipe_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_recipe_versions_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_recipe_versions_recipe_version_id_fkey"
            columns: ["recipe_version_id"]
            isOneToOne: false
            referencedRelation: "recipe_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          daily_limit: number | null
          daily_sold: number | null
          description: string | null
          dietary_tags: string[] | null
          id: string
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          is_sold_out: boolean | null
          name: string
          prep_time_minutes: number | null
          price: number
          restock_at: string | null
          sold_out_at: string | null
          sort_order: number
          storefront_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          daily_limit?: number | null
          daily_sold?: number | null
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_sold_out?: boolean | null
          name: string
          prep_time_minutes?: number | null
          price: number
          restock_at?: string | null
          sold_out_at?: string | null
          sort_order?: number
          storefront_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          daily_limit?: number | null
          daily_sold?: number | null
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          is_sold_out?: boolean | null
          name?: string
          prep_time_minutes?: number | null
          price?: number
          restock_at?: string | null
          sold_out_at?: string | null
          sort_order?: number
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ops_override_logs: {
        Row: {
          action: string
          actor_role: string
          actor_user_id: string
          after_state: Json
          approved_by: string | null
          before_state: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string
        }
        Insert: {
          action: string
          actor_role: string
          actor_user_id: string
          after_state: Json
          approved_by?: string | null
          before_state: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason: string
        }
        Update: {
          action?: string
          actor_role?: string
          actor_user_id?: string
          after_state?: Json
          approved_by?: string | null
          before_state?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      ops_processor_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          idempotency_key: string
          processor_name: string
          result: Json
          started_at: string
          status: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          processor_name: string
          result?: Json
          started_at?: string
          status: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          processor_name?: string
          result?: Json
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      order_exceptions: {
        Row: {
          assigned_to: string | null
          chef_id: string | null
          created_at: string
          customer_id: string | null
          delivery_id: string | null
          description: string | null
          driver_id: string | null
          escalated_at: string | null
          exception_type: string
          id: string
          internal_notes: string | null
          linked_payout_adjustment_id: string | null
          linked_refund_id: string | null
          order_id: string | null
          recommended_actions: Json | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          sla_deadline: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          chef_id?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_id?: string | null
          description?: string | null
          driver_id?: string | null
          escalated_at?: string | null
          exception_type: string
          id?: string
          internal_notes?: string | null
          linked_payout_adjustment_id?: string | null
          linked_refund_id?: string | null
          order_id?: string | null
          recommended_actions?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          sla_deadline?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          chef_id?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_id?: string | null
          description?: string | null
          driver_id?: string | null
          escalated_at?: string | null
          exception_type?: string
          id?: string
          internal_notes?: string | null
          linked_payout_adjustment_id?: string | null
          linked_refund_id?: string | null
          order_id?: string | null
          recommended_actions?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          sla_deadline?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_exceptions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_exceptions_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_exceptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_exceptions_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_exceptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_exceptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_modifiers: {
        Row: {
          created_at: string
          id: string
          option_name: string
          order_item_id: string
          price_adjustment: number
          value_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_name: string
          order_item_id: string
          price_adjustment?: number
          value_name: string
        }
        Update: {
          created_at?: string
          id?: string
          option_name?: string
          order_item_id?: string
          price_adjustment?: number
          value_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_item_modifiers_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          menu_item_name: string
          order_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          menu_item_name: string
          order_id: string
          quantity: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          menu_item_name?: string
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_pack_checks: {
        Row: {
          allergy_label_applied: boolean
          bag_count: number
          checked_items: Json
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          order_id: string
          photo_url: string | null
          sauces_included: boolean
          sealed: boolean
          storefront_id: string
          ticket_id: string | null
          updated_at: string
          utensils_included: boolean
        }
        Insert: {
          allergy_label_applied?: boolean
          bag_count?: number
          checked_items?: Json
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          order_id: string
          photo_url?: string | null
          sauces_included?: boolean
          sealed?: boolean
          storefront_id: string
          ticket_id?: string | null
          updated_at?: string
          utensils_included?: boolean
        }
        Update: {
          allergy_label_applied?: boolean
          bag_count?: number
          checked_items?: Json
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          order_id?: string
          photo_url?: string | null
          sauces_included?: boolean
          sealed?: boolean
          storefront_id?: string
          ticket_id?: string | null
          updated_at?: string
          utensils_included?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "order_pack_checks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pack_checks_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_pack_checks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "kitchen_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string | null
          notes: string | null
          order_id: string
          previous_status: string | null
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          order_id: string
          previous_status?: string | null
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          notes?: string | null
          order_id?: string
          previous_status?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_prep_minutes: number | null
          actual_ready_at: string | null
          cancellation_notes: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          delivery_address_id: string
          delivery_fee: number
          engine_status: string | null
          estimated_prep_minutes: number | null
          estimated_ready_at: string | null
          exception_count: number | null
          id: string
          is_test: boolean
          order_number: string
          partner_id: string | null
          payment_intent_id: string | null
          payment_status: string
          prep_started_at: string | null
          promo_code_id: string | null
          public_stage: string
          ready_at: string | null
          rejection_notes: string | null
          rejection_reason: string | null
          scheduled_for: string | null
          service_fee: number
          special_instructions: string | null
          status: string
          storefront_id: string
          subtotal: number
          tax: number
          tip: number
          total: number
          updated_at: string
        }
        Insert: {
          actual_prep_minutes?: number | null
          actual_ready_at?: string | null
          cancellation_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          delivery_address_id: string
          delivery_fee?: number
          engine_status?: string | null
          estimated_prep_minutes?: number | null
          estimated_ready_at?: string | null
          exception_count?: number | null
          id?: string
          is_test?: boolean
          order_number: string
          partner_id?: string | null
          payment_intent_id?: string | null
          payment_status?: string
          prep_started_at?: string | null
          promo_code_id?: string | null
          public_stage: string
          ready_at?: string | null
          rejection_notes?: string | null
          rejection_reason?: string | null
          scheduled_for?: string | null
          service_fee?: number
          special_instructions?: string | null
          status?: string
          storefront_id: string
          subtotal: number
          tax?: number
          tip?: number
          total: number
          updated_at?: string
        }
        Update: {
          actual_prep_minutes?: number | null
          actual_ready_at?: string | null
          cancellation_notes?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          delivery_address_id?: string
          delivery_fee?: number
          engine_status?: string | null
          estimated_prep_minutes?: number | null
          estimated_ready_at?: string | null
          exception_count?: number | null
          id?: string
          is_test?: boolean
          order_number?: string
          partner_id?: string | null
          payment_intent_id?: string | null
          payment_status?: string
          prep_started_at?: string | null
          promo_code_id?: string | null
          public_stage?: string
          ready_at?: string | null
          rejection_notes?: string | null
          rejection_reason?: string | null
          scheduled_for?: string | null
          service_fee?: number
          special_instructions?: string | null
          status?: string
          storefront_id?: string
          subtotal?: number
          tax?: number
          tip?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "api_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      packaging_items: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          storefront_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          storefront_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          storefront_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packaging_items_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          domain_event_id: string
          event_type: string
          id: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          order_id: string | null
          partner_id: string
          payload: Json
          response_code: number | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          domain_event_id: string
          event_type: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          order_id?: string | null
          partner_id: string
          payload?: Json
          response_code?: number | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          domain_event_id?: string
          event_type?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          order_id?: string | null
          partner_id?: string
          payload?: Json
          response_code?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_webhook_deliveries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "api_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_webhook_deliveries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partner_api_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_periods: {
        Row: {
          created_at: string
          ends_on: string
          exported_at: string | null
          id: string
          kitchen_id: string
          locked_at: string | null
          locked_by: string | null
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          exported_at?: string | null
          id?: string
          kitchen_id: string
          locked_at?: string | null
          locked_by?: string | null
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          exported_at?: string | null
          id?: string
          kitchen_id?: string
          locked_at?: string | null
          locked_by?: string | null
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_periods_kitchen_id_fkey"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_adjustments: {
        Row: {
          adjustment_type: string
          amount_cents: number
          applied_to_payout_id: string | null
          created_at: string
          created_by: string
          id: string
          order_id: string | null
          payee_id: string
          payee_type: string
          reason: string
          refund_case_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          amount_cents: number
          applied_to_payout_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          order_id?: string | null
          payee_id: string
          payee_type: string
          reason: string
          refund_case_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          amount_cents?: number
          applied_to_payout_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          order_id?: string | null
          payee_id?: string
          payee_type?: string
          reason?: string
          refund_case_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_adjustments_refund_case_id_fkey"
            columns: ["refund_case_id"]
            isOneToOne: false
            referencedRelation: "refund_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          failed_payouts: number
          id: string
          initiated_by: string
          period_end: string
          period_start: string
          run_type: string
          status: string
          successful_payouts: number
          total_amount: number
          total_recipients: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          failed_payouts?: number
          id?: string
          initiated_by: string
          period_end: string
          period_start: string
          run_type: string
          status?: string
          successful_payouts?: number
          total_amount?: number
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          failed_payouts?: number
          id?: string
          initiated_by?: string
          period_end?: string
          period_start?: string
          run_type?: string
          status?: string
          successful_payouts?: number
          total_amount?: number
          total_recipients?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_accounts: {
        Row: {
          account_type: string
          balance_cents: number
          currency: string
          id: string
          lifetime_earned_cents: number
          owner_id: string
          pending_payout_cents: number
          updated_at: string
        }
        Insert: {
          account_type: string
          balance_cents?: number
          currency?: string
          id?: string
          lifetime_earned_cents?: number
          owner_id: string
          pending_payout_cents?: number
          updated_at?: string
        }
        Update: {
          account_type?: string
          balance_cents?: number
          currency?: string
          id?: string
          lifetime_earned_cents?: number
          owner_id?: string
          pending_payout_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          auto_assign_enabled: boolean
          base_delivery_fee_cents: number
          chef_response_sla_minutes: number
          created_at: string
          default_prep_time_minutes: number
          description: string | null
          dispatch_radius_km: number
          dispatch_timeout_minutes: number
          driver_payout_percent: number
          hst_rate: number
          id: string
          max_assignment_attempts: number
          max_delivery_distance_km: number
          max_delivery_radius_km: number
          min_order_amount: number | null
          offer_timeout_seconds: number
          platform_fee_percent: number
          refund_auto_review_threshold_cents: number
          refund_window_hours: number
          service_fee_percent: number
          setting_key: string
          setting_value: Json
          storefront_auto_pause_enabled: boolean
          storefront_pause_on_sla_breach: boolean
          storefront_throttle_order_limit: number
          storefront_throttle_window_minutes: number
          support_sla_breach_minutes: number
          support_sla_warning_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_assign_enabled?: boolean
          base_delivery_fee_cents?: number
          chef_response_sla_minutes?: number
          created_at?: string
          default_prep_time_minutes?: number
          description?: string | null
          dispatch_radius_km?: number
          dispatch_timeout_minutes?: number
          driver_payout_percent?: number
          hst_rate?: number
          id?: string
          max_assignment_attempts?: number
          max_delivery_distance_km?: number
          max_delivery_radius_km?: number
          min_order_amount?: number | null
          offer_timeout_seconds?: number
          platform_fee_percent?: number
          refund_auto_review_threshold_cents?: number
          refund_window_hours?: number
          service_fee_percent?: number
          setting_key: string
          setting_value?: Json
          storefront_auto_pause_enabled?: boolean
          storefront_pause_on_sla_breach?: boolean
          storefront_throttle_order_limit?: number
          storefront_throttle_window_minutes?: number
          support_sla_breach_minutes?: number
          support_sla_warning_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_assign_enabled?: boolean
          base_delivery_fee_cents?: number
          chef_response_sla_minutes?: number
          created_at?: string
          default_prep_time_minutes?: number
          description?: string | null
          dispatch_radius_km?: number
          dispatch_timeout_minutes?: number
          driver_payout_percent?: number
          hst_rate?: number
          id?: string
          max_assignment_attempts?: number
          max_delivery_distance_km?: number
          max_delivery_radius_km?: number
          min_order_amount?: number | null
          offer_timeout_seconds?: number
          platform_fee_percent?: number
          refund_auto_review_threshold_cents?: number
          refund_window_hours?: number
          service_fee_percent?: number
          setting_key?: string
          setting_value?: Json
          storefront_auto_pause_enabled?: boolean
          storefront_pause_on_sla_breach?: boolean
          storefront_throttle_order_limit?: number
          storefront_throttle_window_minutes?: number
          support_sla_breach_minutes?: number
          support_sla_warning_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prep_task_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          detail: Json
          event_type: string
          from_status: string | null
          id: string
          kitchen_id: string
          prep_task_id: string
          storefront_id: string | null
          to_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          event_type: string
          from_status?: string | null
          id?: string
          kitchen_id: string
          prep_task_id: string
          storefront_id?: string | null
          to_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          detail?: Json
          event_type?: string
          from_status?: string | null
          id?: string
          kitchen_id?: string
          prep_task_id?: string
          storefront_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prep_task_events_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_task_events_prep_task_id_fkey"
            columns: ["prep_task_id"]
            isOneToOne: false
            referencedRelation: "prep_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_task_events_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      prep_tasks: {
        Row: {
          assigned_to: string | null
          completed_quantity: number
          created_at: string
          created_by: string | null
          id: string
          kitchen_id: string
          menu_item_id: string | null
          notes: string | null
          plan_date: string
          station_id: string | null
          status: string
          storefront_id: string | null
          target_quantity: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_quantity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kitchen_id: string
          menu_item_id?: string | null
          notes?: string | null
          plan_date: string
          station_id?: string | null
          status?: string
          storefront_id?: string | null
          target_quantity?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_quantity?: number
          created_at?: string
          created_by?: string | null
          id?: string
          kitchen_id?: string
          menu_item_id?: string | null
          notes?: string | null
          plan_date?: string
          station_id?: string | null
          status?: string
          storefront_id?: string | null
          target_quantity?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prep_tasks_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_tasks_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_tasks_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prep_tasks_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batch_inputs: {
        Row: {
          batch_id: string
          consumed: boolean
          created_at: string
          id: string
          inventory_item_id: string | null
          quantity: number
          unit: string | null
        }
        Insert: {
          batch_id: string
          consumed?: boolean
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          quantity?: number
          unit?: string | null
        }
        Update: {
          batch_id?: string
          consumed?: boolean
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_batch_inputs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batch_inputs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batch_outputs: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          inventory_item_id: string | null
          menu_item_id: string | null
          quantity: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          menu_item_id?: string | null
          quantity?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          menu_item_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batch_outputs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batch_outputs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batch_outputs_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          actual_yield: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kitchen_id: string
          menu_item_id: string | null
          name: string
          notes: string | null
          plan_date: string | null
          planned_yield: number | null
          recipe_version_id: string | null
          started_at: string | null
          status: string
          storefront_id: string | null
          updated_at: string
          waste_quantity: number
        }
        Insert: {
          actual_yield?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kitchen_id: string
          menu_item_id?: string | null
          name: string
          notes?: string | null
          plan_date?: string | null
          planned_yield?: number | null
          recipe_version_id?: string | null
          started_at?: string | null
          status?: string
          storefront_id?: string | null
          updated_at?: string
          waste_quantity?: number
        }
        Update: {
          actual_yield?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kitchen_id?: string
          menu_item_id?: string | null
          name?: string
          notes?: string | null
          plan_date?: string | null
          planned_yield?: number | null
          recipe_version_id?: string | null
          started_at?: string | null
          status?: string
          storefront_id?: string | null
          updated_at?: string
          waste_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_recipe_version_id_fkey"
            columns: ["recipe_version_id"]
            isOneToOne: false
            referencedRelation: "recipe_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_usages: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          order_id: string | null
          promo_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          order_id?: string | null
          promo_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          order_id?: string | null
          promo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usages_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_amount: number | null
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          description: string | null
          id: string
          inventory_item_id: string | null
          pack_size: number
          purchase_order_id: string
          quantity: number
          received_quantity: number
          supplier_item_id: string | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          pack_size?: number
          purchase_order_id: string
          quantity?: number
          received_quantity?: number
          supplier_item_id?: string | null
          unit_cost?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          pack_size?: number
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          supplier_item_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_supplier_item_id_fkey"
            columns: ["supplier_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_items"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_at: string | null
          id: string
          kitchen_id: string
          notes: string | null
          received_at: string | null
          reference: string | null
          status: string
          storefront_id: string | null
          submitted_at: string | null
          supplier_id: string | null
          total_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          kitchen_id: string
          notes?: string | null
          received_at?: string | null
          reference?: string | null
          status?: string
          storefront_id?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          kitchen_id?: string
          notes?: string | null
          received_at?: string | null
          reference?: string | null
          status?: string
          storefront_id?: string | null
          submitted_at?: string | null
          supplier_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receiving_batches: {
        Row: {
          created_at: string
          id: string
          kitchen_id: string
          note: string | null
          purchase_order_id: string | null
          received_by: string | null
          storefront_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kitchen_id: string
          note?: string | null
          purchase_order_id?: string | null
          received_by?: string | null
          storefront_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kitchen_id?: string
          note?: string | null
          purchase_order_id?: string | null
          received_by?: string | null
          storefront_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receiving_batches_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_batches_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_batches_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_cost_snapshots: {
        Row: {
          created_at: string
          food_cost_pct: number | null
          id: string
          ingredient_cost: number
          menu_item_id: string | null
          packaging_cost: number
          recipe_version_id: string
          sell_price: number | null
          snapshot_reason: string | null
          total_cost: number
        }
        Insert: {
          created_at?: string
          food_cost_pct?: number | null
          id?: string
          ingredient_cost: number
          menu_item_id?: string | null
          packaging_cost?: number
          recipe_version_id: string
          sell_price?: number | null
          snapshot_reason?: string | null
          total_cost: number
        }
        Update: {
          created_at?: string
          food_cost_pct?: number | null
          id?: string
          ingredient_cost?: number
          menu_item_id?: string | null
          packaging_cost?: number
          recipe_version_id?: string
          sell_price?: number | null
          snapshot_reason?: string | null
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_cost_snapshots_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_cost_snapshots_recipe_version_id_fkey"
            columns: ["recipe_version_id"]
            isOneToOne: false
            referencedRelation: "recipe_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          inventory_item_id: string | null
          name: string
          quantity: number
          recipe_version_id: string
          sort_order: number
          unit: string
          waste_factor: number
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          name: string
          quantity?: number
          recipe_version_id: string
          sort_order?: number
          unit?: string
          waste_factor?: number
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          name?: string
          quantity?: number
          recipe_version_id?: string
          sort_order?: number
          unit?: string
          waste_factor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_inventory_item_fk"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_version_id_fkey"
            columns: ["recipe_version_id"]
            isOneToOne: false
            referencedRelation: "recipe_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          instruction: string
          phase: string
          recipe_version_id: string
          station: string | null
          step_number: number
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          instruction: string
          phase?: string
          recipe_version_id: string
          station?: string | null
          step_number: number
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          instruction?: string
          phase?: string
          recipe_version_id?: string
          station?: string | null
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_version_id_fkey"
            columns: ["recipe_version_id"]
            isOneToOne: false
            referencedRelation: "recipe_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_versions: {
        Row: {
          batch_yield: number
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          portion_size: string | null
          recipe_id: string
          updated_at: string
          version: number
          waste_factor: number
        }
        Insert: {
          batch_yield?: number
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          portion_size?: string | null
          recipe_id: string
          updated_at?: string
          version?: number
          waste_factor?: number
        }
        Update: {
          batch_yield?: number
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          portion_size?: string | null
          recipe_id?: string
          updated_at?: string
          version?: number
          waste_factor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_versions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          menu_item_id: string | null
          name: string
          storefront_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_item_id?: string | null
          name: string
          storefront_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          menu_item_id?: string | null
          name?: string
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          reward_cents: number
          user_id: string
          user_type: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_cents?: number
          user_id: string
          user_type: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_cents?: number
          user_id?: string
          user_type?: string
          uses_count?: number
        }
        Relationships: []
      }
      referral_signups: {
        Row: {
          created_at: string
          first_order_id: string | null
          id: string
          referral_code_id: string
          referred_user_id: string
          referred_user_type: string
          reward_paid: boolean
          status: string
        }
        Insert: {
          created_at?: string
          first_order_id?: string | null
          id?: string
          referral_code_id: string
          referred_user_id: string
          referred_user_type: string
          reward_paid?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          first_order_id?: string | null
          id?: string
          referral_code_id?: string
          referred_user_id?: string
          referred_user_type?: string
          reward_paid?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_signups_first_order_id_fkey"
            columns: ["first_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_signups_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_cases: {
        Row: {
          approved_amount_cents: number | null
          created_at: string
          exception_id: string | null
          id: string
          order_id: string
          processed_at: string | null
          refund_notes: string | null
          refund_reason: string
          requested_amount_cents: number
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          stripe_refund_id: string | null
          updated_at: string
        }
        Insert: {
          approved_amount_cents?: number | null
          created_at?: string
          exception_id?: string | null
          id?: string
          order_id: string
          processed_at?: string | null
          refund_notes?: string | null
          refund_reason: string
          requested_amount_cents: number
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_amount_cents?: number | null
          created_at?: string
          exception_id?: string | null
          id?: string
          order_id?: string
          processed_at?: string | null
          refund_notes?: string | null
          refund_reason?: string
          requested_amount_cents?: number
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_cases_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "order_exceptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          chef_responded_at: string | null
          chef_response: string | null
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          is_visible: boolean
          order_id: string
          rating: number
          storefront_id: string
          updated_at: string
        }
        Insert: {
          chef_responded_at?: string | null
          chef_response?: string | null
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_visible?: boolean
          order_id: string
          rating: number
          storefront_id: string
          updated_at?: string
        }
        Update: {
          chef_responded_at?: string | null
          chef_response?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_visible?: boolean
          order_id?: string
          rating?: number
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      service_areas: {
        Row: {
          created_at: string
          dispatch_radius_km: number | null
          id: string
          is_active: boolean
          max_offer_attempts: number | null
          name: string
          offer_ttl_seconds: number | null
          polygon: unknown
          surge_multiplier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatch_radius_km?: number | null
          id?: string
          is_active?: boolean
          max_offer_attempts?: number | null
          name: string
          offer_ttl_seconds?: number | null
          polygon: unknown
          surge_multiplier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatch_radius_km?: number | null
          id?: string
          is_active?: boolean
          max_offer_attempts?: number | null
          name?: string
          offer_ttl_seconds?: number | null
          polygon?: unknown
          surge_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      sla_timers: {
        Row: {
          breached_at: string | null
          completed_at: string | null
          created_at: string
          deadline_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          sla_type: string
          started_at: string
          status: string
          updated_at: string
          warning_at: string | null
        }
        Insert: {
          breached_at?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_at: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          sla_type: string
          started_at?: string
          status?: string
          updated_at?: string
          warning_at?: string | null
        }
        Update: {
          breached_at?: string | null
          completed_at?: string | null
          created_at?: string
          deadline_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          sla_type?: string
          started_at?: string
          status?: string
          updated_at?: string
          warning_at?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      storage_locations: {
        Row: {
          created_at: string
          id: string
          kitchen_id: string
          name: string
          storefront_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kitchen_id: string
          name: string
          storefront_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kitchen_id?: string
          name?: string
          storefront_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_locations_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_state_changes: {
        Row: {
          changed_by: string | null
          changed_by_role: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_state: string
          previous_state: string | null
          reason: string | null
          storefront_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_state: string
          previous_state?: string | null
          reason?: string | null
          storefront_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_state?: string
          previous_state?: string | null
          reason?: string | null
          storefront_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_state_changes_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events_processed: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          livemode: boolean
          payload_hash: string | null
          processed_at: string
          processing_status: string
          related_order_id: string | null
          related_payment_id: string | null
          stripe_amount_cents: number | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          livemode?: boolean
          payload_hash?: string | null
          processed_at?: string
          processing_status?: string
          related_order_id?: string | null
          related_payment_id?: string | null
          stripe_amount_cents?: number | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          livemode?: boolean
          payload_hash?: string | null
          processed_at?: string
          processing_status?: string
          related_order_id?: string | null
          related_payment_id?: string | null
          stripe_amount_cents?: number | null
          stripe_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_processed_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_reconciliation: {
        Row: {
          created_at: string
          id: string
          ledger_entry_ids: string[]
          notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          stripe_event_id: string
          variance_cents: number
          variance_flagged: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          ledger_entry_ids?: string[]
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          stripe_event_id: string
          variance_cents?: number
          variance_flagged?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          ledger_entry_ids?: string[]
          notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          stripe_event_id?: string
          variance_cents?: number
          variance_flagged?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "stripe_reconciliation_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_reconciliation_stripe_event_id_fkey"
            columns: ["stripe_event_id"]
            isOneToOne: true
            referencedRelation: "stripe_events_processed"
            referencedColumns: ["stripe_event_id"]
          },
        ]
      }
      supplier_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          is_active: boolean
          kitchen_id: string
          name: string
          pack_size: number
          pack_unit: string | null
          storefront_id: string | null
          supplier_id: string
          supplier_sku: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          is_active?: boolean
          kitchen_id: string
          name: string
          pack_size?: number
          pack_unit?: string | null
          storefront_id?: string | null
          supplier_id: string
          supplier_sku?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          is_active?: boolean
          kitchen_id?: string
          name?: string
          pack_size?: number
          pack_unit?: string | null
          storefront_id?: string | null
          supplier_id?: string
          supplier_sku?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_history: {
        Row: {
          created_at: string
          effective_at: string
          id: string
          kitchen_id: string
          pack_size: number | null
          source: string
          storefront_id: string | null
          supplier_item_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          effective_at?: string
          id?: string
          kitchen_id: string
          pack_size?: number | null
          source?: string
          storefront_id?: string | null
          supplier_item_id: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          effective_at?: string
          id?: string
          kitchen_id?: string
          pack_size?: number | null
          source?: string
          storefront_id?: string | null
          supplier_item_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_history_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_supplier_item_id_fkey"
            columns: ["supplier_item_id"]
            isOneToOne: false
            referencedRelation: "supplier_items"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          kitchen_id: string
          name: string
          notes: string | null
          phone: string | null
          storefront_id: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          kitchen_id: string
          name: string
          notes?: string | null
          phone?: string | null
          storefront_id?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          kitchen_id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          storefront_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          chef_id: string | null
          created_at: string
          customer_id: string | null
          description: string
          driver_id: string | null
          id: string
          order_id: string | null
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          chef_id?: string | null
          created_at?: string
          customer_id?: string | null
          description: string
          driver_id?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          chef_id?: string | null
          created_at?: string
          customer_id?: string | null
          description?: string
          driver_id?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_resolved: boolean
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          metadata: Json | null
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_resolved?: boolean
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          title: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_resolved?: boolean
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          hourly_rate: number
          id: string
          kitchen_id: string
          shift_id: string | null
          staff_id: string
          storefront_id: string | null
          updated_at: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          hourly_rate?: number
          id?: string
          kitchen_id: string
          shift_id?: string | null
          staff_id: string
          storefront_id?: string | null
          updated_at?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          hourly_rate?: number
          id?: string
          kitchen_id?: string
          shift_id?: string | null
          staff_id?: string
          storefront_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_kitchen_fk"
            columns: ["kitchen_id"]
            isOneToOne: false
            referencedRelation: "chef_kitchens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "kitchen_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "kitchen_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      order_status_events: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string | null
          new_status: string | null
          notes: string | null
          order_id: string | null
          previous_status: string | null
          status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string | null
          new_status?: string | null
          notes?: string | null
          order_id?: string | null
          previous_status?: string | null
          status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string | null
          new_status?: string | null
          notes?: string | null
          order_id?: string | null
          previous_status?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_api_stats: {
        Row: {
          id: string | null
          is_active: boolean | null
          key_last_used_at: string | null
          last_order_at: string | null
          name: string | null
          orders: number | null
          rate_limit_per_min: number | null
          revenue: number | null
          slug: string | null
          test_mode: boolean | null
          webhooks_delivered: number | null
          webhooks_failing: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      decrement_queue_size: {
        Args: { storefront_id: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_available_drivers_near: {
        Args: { pickup_lat: number; pickup_lng: number; radius_km?: number }
        Returns: {
          distance_km: number
          driver_id: string
          first_name: string
          last_name: string
          rating: number
          total_deliveries: number
          user_id: string
        }[]
      }
      get_chef_id: { Args: { user_id: string }; Returns: string }
      get_chef_liability_summaries: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          id: string
          name: string
        }[]
      }
      get_customer_id: { Args: { user_id: string }; Returns: string }
      get_driver_id: { Args: { user_id: string }; Returns: string }
      get_driver_liability_summaries: {
        Args: { p_limit?: number }
        Returns: {
          amount: number
          id: string
          name: string
        }[]
      }
      get_financial_summary: {
        Args: { end_date: string; start_date: string }
        Returns: {
          metric_name: string
          metric_value: number
        }[]
      }
      get_ops_dashboard_stats: {
        Args: never
        Returns: {
          stat_name: string
          stat_value: number
        }[]
      }
      get_order_timeline: {
        Args: { p_order_id: string }
        Returns: {
          actor_id: string
          event_data: Json
          event_time: string
          event_type: string
        }[]
      }
      get_orders_needing_dispatch: {
        Args: never
        Returns: {
          order_id: string
          order_number: string
          ready_at: string
          storefront_id: string
          total: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      increment_order_exception_count: {
        Args: { order_id: string }
        Returns: undefined
      }
      increment_promo_usage: { Args: { promo_id: string }; Returns: undefined }
      increment_queue_size: {
        Args: { storefront_id: string }
        Returns: undefined
      }
      is_chef_of_storefront: { Args: { sf_id: string }; Returns: boolean }
      is_finance_staff: { Args: { uid: string }; Returns: boolean }
      is_operator_of_kitchen: { Args: { k_id: string }; Returns: boolean }
      is_ops_admin: { Args: { user_id: string }; Returns: boolean }
      is_platform_staff: { Args: { uid: string }; Returns: boolean }
      is_support_staff: { Args: { uid: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      orders_public_stage_from_engine: {
        Args: { p_engine: string }
        Returns: string
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
