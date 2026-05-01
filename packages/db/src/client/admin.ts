import { createClient } from '@supabase/supabase-js';
import type { Database } from '../generated/database.types';

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Create a Supabase admin client that bypasses RLS.
 * Only use this for admin operations where RLS should not apply.
 * NEVER expose this client to the browser.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient() must only run on the server');
  }

  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin environment variables');
  }

  adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
