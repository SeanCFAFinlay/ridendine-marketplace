/* eslint-disable @typescript-eslint/no-explicit-any */

// Flexible type that accepts both @supabase/supabase-js and @supabase/ssr clients
export type SupabaseClient = {
  from: (table: string) => any;
  auth: any;
  rpc: (fn: string, params?: any) => any;
};
