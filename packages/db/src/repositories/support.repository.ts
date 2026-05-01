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

/**
 * Support agents: tickets assigned to them plus **unassigned open** pool (triage).
 * Does not include tickets assigned to other agents.
 */
export async function listSupportTicketsForSupportAgent(
  client: SupabaseClient,
  agentUserId: string
): Promise<OpsSupportTicketListItem[]> {
  const [assignedRes, poolRes] = await Promise.all([
    client
      .from('support_tickets')
      .select('*')
      .eq('assigned_to', agentUserId)
      .order('created_at', { ascending: false }),
    client
      .from('support_tickets')
      .select('*')
      .is('assigned_to', null)
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
  ]);

  if (assignedRes.error) throw assignedRes.error;
  if (poolRes.error) throw poolRes.error;

  const merged = new Map<string, OpsSupportTicketListItem>();
  for (const row of [...(assignedRes.data ?? []), ...(poolRes.data ?? [])]) {
    merged.set(row.id, row as OpsSupportTicketListItem);
  }
  return [...merged.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function listCustomerSupportTickets(
  client: SupabaseClient,
  customerId: string
): Promise<SupportTicket[]> {
  const { data, error } = await client
    .from('support_tickets')
    .select('id, subject, description, status, priority, order_id, created_at, updated_at, resolved_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

export async function getSupportTicketForCustomer(
  client: SupabaseClient,
  ticketId: string,
  customerId: string
): Promise<SupportTicket | null> {
  const { data, error } = await client
    .from('support_tickets')
    .select('id, subject, description, status, priority, order_id, created_at, updated_at, resolved_at')
    .eq('id', ticketId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as SupportTicket | null;
}

export type GetOpsSupportQueueOptions = {
  /** When set (support_agent), queue is scoped to assignee + open pool only. */
  supportAgentUserId?: string | null;
};

export async function getOpsSupportQueue(
  client: SupabaseClient,
  options?: GetOpsSupportQueueOptions
): Promise<{
  tickets: OpsSupportTicketListItem[];
  summary: OpsSupportQueueSummary;
}> {
  const tickets = options?.supportAgentUserId
    ? await listSupportTicketsForSupportAgent(client, options.supportAgentUserId)
    : await listOpsSupportTickets(client);
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
