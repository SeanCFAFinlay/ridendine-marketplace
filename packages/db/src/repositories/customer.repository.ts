import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Customer = Tables<'customers'>;
export interface OpsCustomerListItem extends Customer {
  orders: { count: number }[] | null;
}

export async function getCustomerByUserId(
  client: SupabaseClient,
  userId: string
): Promise<Customer | null> {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getCustomerById(
  client: SupabaseClient,
  id: string
): Promise<Customer | null> {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createCustomer(
  client: SupabaseClient,
  customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
): Promise<Customer> {
  const { data, error } = await client
    .from('customers')
    .insert(customer)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(
  client: SupabaseClient,
  id: string,
  updates: Partial<Customer>
): Promise<Customer> {
  const { data, error } = await client
    .from('customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listOpsCustomers(
  client: SupabaseClient
): Promise<OpsCustomerListItem[]> {
  const { data, error } = await client
    .from('customers')
    .select('*, orders(count)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OpsCustomerListItem[];
}

export async function getOrCreateCustomer(
  client: SupabaseClient,
  userId: string,
  defaults: { firstName: string; lastName: string; email: string }
): Promise<Customer> {
  const existing = await getCustomerByUserId(client, userId);
  if (existing) return existing;

  return createCustomer(client, {
    user_id: userId,
    first_name: defaults.firstName,
    last_name: defaults.lastName,
    email: defaults.email,
    phone: null,
    profile_image_url: null,
  });
}
