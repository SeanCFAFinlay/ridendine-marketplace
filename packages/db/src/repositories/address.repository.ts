import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type CustomerAddress = Tables<'customer_addresses'>;

export async function getAddressesByCustomer(
  client: SupabaseClient,
  customerId: string
): Promise<CustomerAddress[]> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAddressById(
  client: SupabaseClient,
  id: string
): Promise<CustomerAddress | null> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createAddress(
  client: SupabaseClient,
  address: Omit<CustomerAddress, 'id' | 'created_at' | 'updated_at'>
): Promise<CustomerAddress> {
  const { data, error } = await client
    .from('customer_addresses')
    .insert(address)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAddress(
  client: SupabaseClient,
  id: string,
  updates: Partial<CustomerAddress>
): Promise<CustomerAddress> {
  const { data, error } = await client
    .from('customer_addresses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAddress(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client
    .from('customer_addresses')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function setDefaultAddress(
  client: SupabaseClient,
  customerId: string,
  addressId: string
): Promise<void> {
  await client
    .from('customer_addresses')
    .update({ is_default: false })
    .eq('customer_id', customerId);

  await client
    .from('customer_addresses')
    .update({ is_default: true })
    .eq('id', addressId);
}
