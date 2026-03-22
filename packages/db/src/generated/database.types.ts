// ==========================================
// GENERATED SUPABASE TYPES
// This file will be overwritten by `pnpm db:generate`
// Manual edits will be lost
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
          user_id: string
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
          user_id: string
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
          user_id?: string
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
          is_active: boolean
          is_featured: boolean
          average_rating: number | null
          total_reviews: number
          min_order_amount: number
          estimated_prep_time_min: number
          estimated_prep_time_max: number
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
          is_active?: boolean
          is_featured?: boolean
          average_rating?: number | null
          total_reviews?: number
          min_order_amount?: number
          estimated_prep_time_min?: number
          estimated_prep_time_max?: number
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
          is_active?: boolean
          is_featured?: boolean
          average_rating?: number | null
          total_reviews?: number
          min_order_amount?: number
          estimated_prep_time_min?: number
          estimated_prep_time_max?: number
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
          dietary_tags: string[]
          prep_time_minutes: number | null
          sort_order: number
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
          dietary_tags?: string[]
          prep_time_minutes?: number | null
          sort_order?: number
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
          dietary_tags?: string[]
          prep_time_minutes?: number | null
          sort_order?: number
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
          created_at?: string
          updated_at?: string
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
          dropoff_photo_url: string | null
          customer_signature_url: string | null
          notes: string | null
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
          dropoff_photo_url?: string | null
          customer_signature_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
