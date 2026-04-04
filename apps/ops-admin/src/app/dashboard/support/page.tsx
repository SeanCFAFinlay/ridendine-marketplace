'use client';

import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  order_id: string | null;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
};

type SupportSummary = {
  openCount: number;
  inProgressCount: number;
  urgentCount: number;
  unassignedCount: number;
  resolvedTodayCount: number;
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

const emptySummary: SupportSummary = {
  openCount: 0,
  inProgressCount: 0,
  urgentCount: 0,
  unassignedCount: 0,
  resolvedTodayCount: 0,
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [summary, setSummary] = useState<SupportSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const response = await fetch('/api/support');
      const result = await response.json();
      const queue = result.data ?? { tickets: [], summary: emptySummary };
      setTickets(queue.tickets ?? []);
      setSummary(queue.summary ?? emptySummary);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: string, action: 'start_review' | 'resolve') {
    setUpdatingId(id);
    try {
      await fetch(`/api/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await fetchTickets();
    } catch (error) {
      console.error('Failed to update support ticket:', error);
    } finally {
      setUpdatingId(null);
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
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-white">Support Queue</h1>
          <p className="mt-2 text-gray-400">
            Ops-managed support workflow using the current support ticket model.
            Richer exception escalation rules still live separately under the
            engine’s order exception workflows.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-gray-800 bg-[#16213e] p-4">
            <p className="text-sm text-gray-400">Open</p>
            <p className="mt-2 text-2xl font-bold text-white">{summary.openCount}</p>
          </Card>
          <Card className="border-gray-800 bg-[#16213e] p-4">
            <p className="text-sm text-gray-400">In Progress</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {summary.inProgressCount}
            </p>
          </Card>
          <Card className="border-gray-800 bg-[#16213e] p-4">
            <p className="text-sm text-gray-400">Urgent</p>
            <p className="mt-2 text-2xl font-bold text-red-300">
              {summary.urgentCount}
            </p>
          </Card>
          <Card className="border-gray-800 bg-[#16213e] p-4">
            <p className="text-sm text-gray-400">Unassigned</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">
              {summary.unassignedCount}
            </p>
          </Card>
          <Card className="border-gray-800 bg-[#16213e] p-4">
            <p className="text-sm text-gray-400">Resolved Today</p>
            <p className="mt-2 text-2xl font-bold text-emerald-300">
              {summary.resolvedTodayCount}
            </p>
          </Card>
        </div>

        <Card className="border-gray-800 bg-[#16213e]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                  <th className="pb-4 pl-6 font-medium">Ticket</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Priority</th>
                  <th className="pb-4 font-medium">Ownership</th>
                  <th className="pb-4 font-medium">Context</th>
                  <th className="pb-4 pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-800/50 align-top">
                    <td className="py-4 pl-6">
                      <div className="font-medium text-white">{ticket.subject}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-gray-400">
                        {ticket.description}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Created {new Date(ticket.created_at).toLocaleString()}
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
                    <td className="py-4 text-gray-300">
                      <div>{ticket.assigned_to ? 'Assigned' : 'Unassigned'}</div>
                      {ticket.assigned_to && (
                        <div className="mt-1 font-mono text-xs text-gray-500">
                          {ticket.assigned_to}
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-gray-300">
                      <div>{ticket.category || 'General support'}</div>
                      {ticket.order_id ? (
                        <Link
                          href={`/dashboard/orders/${ticket.order_id}`}
                          className="mt-1 inline-block text-[#E85D26] hover:underline"
                        >
                          Linked order &rarr;
                        </Link>
                      ) : (
                        <div className="mt-1 text-xs text-gray-500">
                          No linked order
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex flex-wrap gap-2">
                        {ticket.status === 'open' && (
                          <button
                            onClick={() => void handleAction(ticket.id, 'start_review')}
                            disabled={updatingId === ticket.id}
                            className="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                          >
                            {updatingId === ticket.id ? 'Saving…' : 'Start Review'}
                          </button>
                        )}
                        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <button
                            onClick={() => void handleAction(ticket.id, 'resolve')}
                            disabled={updatingId === ticket.id}
                            className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500 disabled:opacity-50"
                          >
                            {updatingId === ticket.id ? 'Saving…' : 'Resolve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                No support tickets are currently queued.
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
