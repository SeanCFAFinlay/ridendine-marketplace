import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Driver = Tables<'drivers'>;
export interface OpsDriverListItem extends Driver {
  driver_presence: {
    status: 'offline' | 'online' | 'busy';
    updated_at: string;
  } | null;
}

export async function getDriverByUserId(
  client: SupabaseClient,
  userId: string
): Promise<Driver | null> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getDriverById(
  client: SupabaseClient,
  id: string
): Promise<Driver | null> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createDriver(
  client: SupabaseClient,
  driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>
): Promise<Driver> {
  const { data, error } = await client
    .from('drivers')
    .insert(driver)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDriver(
  client: SupabaseClient,
  id: string,
  updates: Partial<Driver>
): Promise<Driver> {
  const { data, error } = await client
    .from('drivers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getApprovedDrivers(
  client: SupabaseClient
): Promise<Driver[]> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('status', 'approved');

  if (error) throw error;
  return data;
}

export async function listOpsDrivers(
  client: SupabaseClient,
  options: { status?: string } = {}
): Promise<OpsDriverListItem[]> {
  let query = client
    .from('drivers')
    .select(`
      *,
      driver_presence (
        status,
        updated_at
      )
    `)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as unknown as OpsDriverListItem[];
}

export async function getPendingDriverApprovals(
  client: SupabaseClient
): Promise<Driver[]> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function approveDriver(
  client: SupabaseClient,
  id: string
): Promise<Driver> {
  return updateDriver(client, id, { status: 'approved' });
}

export async function rejectDriver(
  client: SupabaseClient,
  id: string
): Promise<Driver> {
  return updateDriver(client, id, { status: 'rejected' });
}
