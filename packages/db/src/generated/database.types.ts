export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
          chef_id: string
          created_at: string
          id: string
          orders_count: number
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          chef_id: string
          created_at?: string
          id?: string
          orders_count?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          chef_id?: string
          created_at?: string
          id?: string
          orders_count?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chef_payouts_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef_profiles"
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
          user_id: string
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
          user_id: string
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
          user_id?: string
        }
        Relationships: []
      }
      chef_storefronts: {
        Row: {
          address: string | null
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
          slug: string
          storefront_state: string | null
          total_reviews: number
          updated_at: string
        }
        Insert: {
          address?: string | null
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
          slug: string
          storefront_state?: string | null
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
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
          street_address: string
          updated_at: string
        }
        Insert: {
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
          street_address: string
          updated_at?: string
        }
        Update: {
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
          street_address?: string
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          id: string
          last_assignment_at: string | null
          notes: string | null
          order_id: string
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_photo_url: string | null
          pickup_proof_url: string | null
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
          id?: string
          last_assignment_at?: string | null
          notes?: string | null
          order_id: string
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_photo_url?: string | null
          pickup_proof_url?: string | null
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
          id?: string
          last_assignment_at?: string | null
          notes?: string | null
          order_id?: string
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_photo_url?: string | null
          pickup_proof_url?: string | null
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
      driver_payouts: {
        Row: {
          amount: number
          created_at: string
          driver_id: string
          id: string
          payout_run_id: string | null
          period_end: string
          period_start: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          driver_id: string
          id?: string
          payout_run_id?: string | null
          period_end: string
          period_start: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          driver_id?: string
          id?: string
          payout_run_id?: string | null
          period_end?: string
          period_start?: string
          status?: string
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
          last_name: string
          phone: string
          profile_image_url: string | null
          rating: number | null
          status: string
          total_deliveries: number
          updated_at: string
          user_id: string
          vehicle_description: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          profile_image_url?: string | null
          rating?: number | null
          status?: string
          total_deliveries?: number
          updated_at?: string
          user_id: string
          vehicle_description?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          profile_image_url?: string | null
          rating?: number | null
          status?: string
          total_deliveries?: number
          updated_at?: string
          user_id?: string
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
          metadata: Json | null
          order_id: string
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
          metadata?: Json | null
          order_id: string
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
          metadata?: Json | null
          order_id?: string
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
          menu_item_name: string | null
          order_id: string
          quantity: number
          selected_options: Json | null
          special_instructions: string | null
          subtotal: number | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          menu_item_name?: string | null
          order_id: string
          quantity: number
          selected_options?: Json | null
          special_instructions?: string | null
          subtotal?: number | null
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          menu_item_name?: string | null
          order_id?: string
          quantity?: number
          selected_options?: Json | null
          special_instructions?: string | null
          subtotal?: number | null
          total_price?: number
          unit_price?: number
          updated_at?: string
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
          order_number: string
          payment_intent_id: string | null
          payment_status: string
          prep_started_at: string | null
          ready_at: string | null
          rejection_notes: string | null
          rejection_reason: string | null
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
          order_number: string
          payment_intent_id?: string | null
          payment_status?: string
          prep_started_at?: string | null
          ready_at?: string | null
          rejection_notes?: string | null
          rejection_reason?: string | null
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
          order_number?: string
          payment_intent_id?: string | null
          payment_status?: string
          prep_started_at?: string | null
          ready_at?: string | null
          rejection_notes?: string | null
          rejection_reason?: string | null
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
            foreignKeyName: "orders_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "chef_storefronts"
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
      platform_settings: {
        Row: {
          auto_assign_enabled: boolean
          base_delivery_fee_cents: number | null
          chef_response_sla_minutes: number | null
          created_at: string | null
          default_prep_time_minutes: number
          description: string | null
          dispatch_radius_km: number
          dispatch_timeout_minutes: number | null
          driver_payout_percent: number | null
          hst_rate: number
          id: string
          max_assignment_attempts: number
          max_delivery_distance_km: number
          max_delivery_radius_km: number
          min_order_amount: number
          offer_timeout_seconds: number
          platform_fee_percent: number
          refund_auto_review_threshold_cents: number
          refund_window_hours: number | null
          service_fee_percent: number
          setting_key: string | null
          setting_value: Json | null
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
          base_delivery_fee_cents?: number | null
          chef_response_sla_minutes?: number | null
          created_at?: string | null
          default_prep_time_minutes?: number
          description?: string | null
          dispatch_radius_km?: number
          dispatch_timeout_minutes?: number | null
          driver_payout_percent?: number | null
          hst_rate?: number
          id?: string
          max_assignment_attempts?: number
          max_delivery_distance_km?: number
          max_delivery_radius_km?: number
          min_order_amount?: number
          offer_timeout_seconds?: number
          platform_fee_percent?: number
          refund_auto_review_threshold_cents?: number
          refund_window_hours?: number | null
          service_fee_percent?: number
          setting_key?: string | null
          setting_value?: Json | null
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
          base_delivery_fee_cents?: number | null
          chef_response_sla_minutes?: number | null
          created_at?: string | null
          default_prep_time_minutes?: number
          description?: string | null
          dispatch_radius_km?: number
          dispatch_timeout_minutes?: number | null
          driver_payout_percent?: number | null
          hst_rate?: number
          id?: string
          max_assignment_attempts?: number
          max_delivery_distance_km?: number
          max_delivery_radius_km?: number
          min_order_amount?: number
          offer_timeout_seconds?: number
          platform_fee_percent?: number
          refund_auto_review_threshold_cents?: number
          refund_window_hours?: number | null
          service_fee_percent?: number
          setting_key?: string | null
          setting_value?: Json | null
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
          max_uses: number | null
          min_order_amount: number | null
          starts_at: string | null
          times_used: number
          updated_at: string
          usage_count: number
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
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
          max_uses?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          times_used?: number
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
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
          max_uses?: number | null
          min_order_amount?: number | null
          starts_at?: string | null
          times_used?: number
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
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
      get_customer_id: { Args: { user_id: string }; Returns: string }
      get_driver_id: { Args: { user_id: string }; Returns: string }
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
      is_ops_admin: { Args: { user_id: string }; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

