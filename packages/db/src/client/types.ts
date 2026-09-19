import type { SupabaseClient as SupabaseJsClient } from '@supabase/supabase-js';
import type { Database } from '../database.merged';

/** Fully typed supabase-js client over the merged Database schema. */
type TypedSupabaseClient = SupabaseJsClient<Database>;

/**
 * The canonical Supabase client type for this codebase.
 *
 * Both @supabase/supabase-js (`createClient`) and @supabase/ssr
 * (`createServerClient` / `createBrowserClient`) clients satisfy this type,
 * so repositories and consumers get fully typed `from()` / `rpc()` calls
 * against the merged Database schema. Keep this as a structural Omit wrapper so
 * Supabase SSR/browser client specializations remain assignable without adding
 * relation-specific `any` overloads.
 */
export type SupabaseClient = Omit<TypedSupabaseClient, 'from'> & {
  from: TypedSupabaseClient['from'];
};
