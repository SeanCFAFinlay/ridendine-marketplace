import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type MenuItem = Tables<'menu_items'>;

export async function getMenuItemsByStorefront(
  client: SupabaseClient,
  storefrontId: string
): Promise<MenuItem[]> {
  const { data, error } = await client
    .from('menu_items')
    .select('*')
    .eq('storefront_id', storefrontId)
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getMenuItemById(
  client: SupabaseClient,
  id: string
): Promise<MenuItem | null> {
  const { data, error } = await client
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createMenuItem(
  client: SupabaseClient,
  item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>
): Promise<MenuItem> {
  const { data, error } = await client
    .from('menu_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMenuItem(
  client: SupabaseClient,
  id: string,
  updates: Partial<MenuItem>
): Promise<MenuItem> {
  const { data, error } = await client
    .from('menu_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMenuItem(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getFeaturedMenuItems(
  client: SupabaseClient,
  storefrontId: string
): Promise<MenuItem[]> {
  const { data, error } = await client
    .from('menu_items')
    .select('*')
    .eq('storefront_id', storefrontId)
    .eq('is_featured', true)
    .eq('is_available', true)
    .limit(6);

  if (error) throw error;
  return data;
}
