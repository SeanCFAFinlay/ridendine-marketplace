import { createAdminClient } from '@ridendine/db';

const DRIVER_APP_PLATFORM_ROLES = new Set(['super_admin']);

export async function getDriverAppPlatformRole(userId: string): Promise<string | null> {
  const adminClient = createAdminClient() as any;
  const { data, error } = await adminClient
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
