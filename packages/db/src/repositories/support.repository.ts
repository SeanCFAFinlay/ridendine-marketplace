import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type SupportTicket = Tables<'support_tickets'>;
export type OpsSupportTicketListItem = SupportTicket;
export interface OpsSupportQueueSummary {
  openCount: number;
  inProgressCount: number;
  urgentCount: number;
  unassignedCount: number;
  resolvedTodayCount: number;
}

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

export async function listOpsSupportTickets(
  client: SupabaseClient
): Promise<OpsSupportTicketListItem[]> {
  const { data, error } = await client
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as OpsSupportTicketListItem[];
}

export async function getOpsSupportQueue(
  client: SupabaseClient
): Promise<{
  tickets: OpsSupportTicketListItem[];
  summary: OpsSupportQueueSummary;
}> {
  const tickets = await listOpsSupportTickets(client);
  const today = new Date().toISOString().slice(0, 10);

  return {
    tickets,
    summary: {
      openCount: tickets.filter((ticket) => ticket.status === 'open').length,
      inProgressCount: tickets.filter((ticket) => ticket.status === 'in_progress').length,
      urgentCount: tickets.filter((ticket) => ticket.priority === 'urgent').length,
      unassignedCount: tickets.filter((ticket) => !ticket.assigned_to).length,
      resolvedTodayCount: tickets.filter(
        (ticket) => ticket.resolved_at?.slice(0, 10) === today
      ).length,
    },
  };
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
