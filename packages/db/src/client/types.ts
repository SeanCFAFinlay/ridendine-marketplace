import type { SupabaseClient as BaseSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../generated/database.types';

export type SupabaseClient = BaseSupabaseClient<Database>;
