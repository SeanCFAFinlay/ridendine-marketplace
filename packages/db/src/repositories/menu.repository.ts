import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type MenuItem = Tables<'menu_items'>;
export type MenuCategory = Tables<'menu_categories'>;

export interface MenuCategorySummary extends MenuCategory {
  items: MenuItem[];
}

export interface MenuItemWithCategory extends MenuItem {
  menu_categories?: Pick<MenuCategory, 'id' | 'name' | 'sort_order'> | null;
}

export async function getMenuItemsByStorefront(
  client: SupabaseClient,
  storefrontId: string,
  options: {
    includeUnavailable?: boolean;
  } = {}
): Promise<MenuItemWithCategory[]> {
  let query = client
    .from('menu_items')
    .select(`
      *,
      menu_categories (
        id,
        name,
        sort_order
      )
    `)
    .eq('storefront_id', storefrontId)
    .order('sort_order', { ascending: true });

  if (!options.includeUnavailable) {
    query = query.eq('is_available', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as unknown as MenuItemWithCategory[];
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

export async function getMenuCategoriesByStorefront(
  client: SupabaseClient,
  storefrontId: string
): Promise<MenuCategory[]> {
  const { data, error } = await client
    .from('menu_categories')
    .select('*')
    .eq('storefront_id', storefrontId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createMenuCategory(
  client: SupabaseClient,
  category: Omit<MenuCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<MenuCategory> {
  const { data, error } = await client
    .from('menu_categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getStorefrontMenu(
  client: SupabaseClient,
  storefrontId: string,
  options: {
    includeUnavailable?: boolean;
  } = {}
): Promise<MenuCategorySummary[]> {
  const [categories, items] = await Promise.all([
    getMenuCategoriesByStorefront(client, storefrontId),
    getMenuItemsByStorefront(client, storefrontId, options),
  ]);

  return categories.map((category) => ({
    ...category,
    items: items
      .filter((item) => item.category_id === category.id)
      .map(({ menu_categories: _menuCategory, ...item }) => item),
  }));
}
