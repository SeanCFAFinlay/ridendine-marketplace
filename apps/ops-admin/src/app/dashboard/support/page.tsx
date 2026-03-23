'use client';

import { Card, Badge } from '@ridendine/ui';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
};

function getStatusVariant(
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'resolved':
    case 'closed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'open':
      return 'warning';
    default:
      return 'default';
  }
}

function getPriorityVariant(
  priority: string
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const response = await fetch('/api/support');
      const result = await response.json();
      setTickets(result.data || []);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id: string) {
    try {
      await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved', resolved_at: new Date().toISOString() }),
      });
      fetchTickets();
    } catch (error) {
      console.error('Failed to resolve ticket:', error);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Support Tickets</h1>
        <p className="mt-2 text-gray-400">Manage customer support requests</p>
      </div>

      <Card className="border-gray-800 bg-[#16213e]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="pb-4 pl-6 font-medium">Subject</th>
                <th className="pb-4 font-medium">Status</th>
                <th className="pb-4 font-medium">Priority</th>
                <th className="pb-4 font-medium">Created</th>
                <th className="pb-4 pr-6 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-800/50">
                  <td className="py-4 pl-6">
                    <div className="font-medium text-white">{ticket.subject}</div>
                    <div className="mt-1 text-xs text-gray-400 line-clamp-1">
                      {ticket.description}
                    </div>
                  </td>
                  <td className="py-4">
                    <Badge variant={getStatusVariant(ticket.status)}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <Badge variant={getPriorityVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </td>
                  <td className="py-4 text-gray-400">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 pr-6">
                    {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                      <button
                        onClick={() => handleResolve(ticket.id)}
                        className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && (
            <div className="py-12 text-center text-gray-400">No support tickets</div>
          )}
        </div>
      </Card>
    </div>
    </DashboardLayout>
  );
}
