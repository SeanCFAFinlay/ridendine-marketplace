import type { SupabaseClient } from '@ridendine/db';

const DRIVER_APP_PLATFORM_ROLES = new Set(['super_admin']);

export async function getDriverAppPlatformRole(
  client: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('platform_users')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const role = typeof data?.role === 'string' ? data.role : null;
  return role && DRIVER_APP_PLATFORM_ROLES.has(role) ? role : null;
}
