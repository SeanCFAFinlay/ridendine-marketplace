import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { Database } from '../generated/database.types';

/**
 * Create a Supabase client for server-side usage (API routes, server components).
 * Requires cookies to be passed for session management.
 * This client respects RLS policies.
 */
export function createServerClient(
  cookieStore: {
    get: (name: string) => { value: string } | undefined;
    set: (name: string, value: string, options?: object) => void;
    delete: (name: string) => void;
  }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: object) {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Handle server component context where cookies can't be set
        }
      },
      remove(name: string, options: object) {
        try {
          cookieStore.set(name, '', options);
        } catch {
          // Handle server component context
        }
      },
    },
  });
}
