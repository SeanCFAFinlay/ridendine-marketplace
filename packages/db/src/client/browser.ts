import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '../generated/database.types';

let browserClient: ReturnType<typeof createSupabaseBrowserClient<Database>> | null = null;

/**
 * Create a Supabase client for browser/client-side usage.
 * This client respects RLS policies and uses the anon key.
 *
 * NOTE: This function must only be called in browser context.
 * During SSR, it returns a mock client to prevent "location is not defined" errors.
 */
export function createBrowserClient() {
  // Return cached client if available
  if (browserClient) {
    return browserClient;
  }

  // During SSR, return null - components should handle this gracefully
  if (typeof window === 'undefined') {
    // Return a mock that won't cause errors during SSR
    // The real client will be created on the client side
    return null as unknown as ReturnType<typeof createSupabaseBrowserClient<Database>>;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  browserClient = createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
