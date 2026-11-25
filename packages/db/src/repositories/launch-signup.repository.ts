import type { SupabaseClient } from '../client/types';

// ==========================================
// LAUNCH SIGN-UP REPOSITORY
// "Tell me when ordering opens" list. Service role only (see 00066).
// (launch_signups is not in the generated types yet. Run `pnpm db:generate`
//  after the migration is applied and the casts can go.)
// ==========================================

export interface LaunchSignup {
  id: string;
  email: string;
  source: 'home' | 'coming-soon';
  consent_text: string;
  consented_at: string;
  unsubscribed_at: string | null;
  created_at: string;
}

/**
 * Add an address to the list. Signing up twice is a no-op that keeps the
 * original consent record; signing up again after unsubscribing records a new
 * consent.
 */
export async function addLaunchSignup(
  client: SupabaseClient,
  input: Pick<LaunchSignup, 'email' | 'source' | 'consent_text'>
): Promise<void> {
  const table = () => (client as any).from('launch_signups');

  const { error } = await table().upsert(input, {
    onConflict: 'email',
    ignoreDuplicates: true,
  });
  if (error) throw error;

  const { error: resubscribeError } = await table()
    .update({
      unsubscribed_at: null,
      source: input.source,
      consent_text: input.consent_text,
      consented_at: new Date().toISOString(),
    })
    .eq('email', input.email)
    .not('unsubscribed_at', 'is', null);
  if (resubscribeError) throw resubscribeError;
}

const PAGE_SIZE = 1000;

/** Everyone who should be emailed, newest first. */
export async function listLaunchSignups(client: SupabaseClient): Promise<LaunchSignup[]> {
  const rows: LaunchSignup[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await (client as any)
      .from('launch_signups')
      .select('*')
      .is('unsubscribed_at', null)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data as LaunchSignup[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}
