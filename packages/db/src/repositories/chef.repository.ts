import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type ChefProfile = Tables<'chef_profiles'>;

export async function getChefByUserId(
  client: SupabaseClient,
  userId: string
): Promise<ChefProfile | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getChefById(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createChefProfile(
  client: SupabaseClient,
  profile: Omit<ChefProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<ChefProfile> {
  const { data, error } = await client
    .from('chef_profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChefProfile(
  client: SupabaseClient,
  id: string,
  updates: Partial<ChefProfile>
): Promise<ChefProfile> {
  const { data, error } = await client
    .from('chef_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingChefApprovals(
  client: SupabaseClient
): Promise<ChefProfile[]> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function approveChef(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile> {
  return updateChefProfile(client, id, { status: 'approved' });
}

export async function rejectChef(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile> {
  return updateChefProfile(client, id, { status: 'rejected' });
}
