import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type SupportTicket = Tables<'support_tickets'>;

export async function getAllSupportTickets(
  client: SupabaseClient
): Promise<SupportTicket[]> {
  const { data, error } = await client
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getSupportTicketById(
  client: SupabaseClient,
  id: string
): Promise<SupportTicket | null> {
  const { data, error } = await client
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createSupportTicket(
  client: SupabaseClient,
  ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>
): Promise<SupportTicket> {
  const { data, error } = await client
    .from('support_tickets')
    .insert(ticket)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSupportTicket(
  client: SupabaseClient,
  id: string,
  updates: Partial<SupportTicket>
): Promise<SupportTicket> {
  const { data, error } = await client
    .from('support_tickets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
