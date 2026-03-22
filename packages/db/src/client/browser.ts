import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '../generated/database.types';

let browserClient: ReturnType<typeof createSupabaseBrowserClient<Database>> | null = null;

/**
 * Create a Supabase client for browser/client-side usage.
 * This client respects RLS policies and uses the anon key.
 */
export function createBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  browserClient = createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
