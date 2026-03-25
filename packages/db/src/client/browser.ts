import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '../generated/database.types';

let browserClient: ReturnType<typeof createSupabaseBrowserClient<Database>> | null = null;

export type BrowserClient = ReturnType<typeof createSupabaseBrowserClient<Database>>;

export function createBrowserClient(): BrowserClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables - real-time features disabled');
    return null;
  }

  browserClient = createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
