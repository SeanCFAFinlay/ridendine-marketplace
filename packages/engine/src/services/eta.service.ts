import type { SupabaseClient } from '@supabase/supabase-js';
import { EtaService, OsrmProvider } from '@ridendine/routing';

/**
 * Thin factory: wires public OSRM + shared Supabase client into {@link EtaService}.
 * Routing logic stays in `@ridendine/routing`.
 */
export function createEtaService(client: SupabaseClient): EtaService {
  return new EtaService(new OsrmProvider(), client);
}
