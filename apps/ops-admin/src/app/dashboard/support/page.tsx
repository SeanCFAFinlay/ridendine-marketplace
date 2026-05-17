import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { createAdminClient, getOpsSupportQueue, type SupabaseClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine, getOpsActorContext, hasPlatformApiCapability } from '@/lib/engine';
import { SupportTicketActions } from './support-ticket-actions';

export const dynamic = 'force-dynamic';

function getSearchParam(
  value: string | string[] | undefined,
  fallback = ''
): string {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }
  return value ?? fallback;
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getOpsActorContext();
  if (!actor || !hasPlatformApiCapability(actor, 'support_queue')) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl">
          <Card className="border-border bg-surface p-8">
            <h1 className="text-xl font-semibold text-white">Support access required</h1>
            <p className="mt-2 text-textMuted">
              Sign in with a platform role that includes the support queue capability.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const params = await searchParams;
  const search = getSearchParam(params.search).toLowerCase();
  const statusFilter = getSearchParam(params.status, 'all');
  const page = Number(getSearchParam(params.page, '1'));

  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const [queue, exceptionQueue, sla] = await Promise.all([
    getOpsSupportQueue(adminClient, {
      supportAgentUserId: actor.role === 'support_agent' ? actor.userId : undefined,
    }),
    getEngine().support.getExceptionQueue(),
    getEngine().support.getSLAStatus(),
  ]);

  const filteredTickets = queue.tickets.filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) {
      return false;
    }
    if (!search) return true;
    return [ticket.subject, ticket.description, ticket.priority, ticket.order_id ?? '']
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  const pageSize = 10;
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const pageItems = filteredTickets.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Support Operations</h1>
          <p className="mt-1 text-textMuted">
            Queue-first support triage with linked exception visibility and SLA tracking.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border bg-surface p-4">
            <p className="text-sm text-textMuted">Backlog</p>
            <p className="mt-2 text-2xl font-bold text-white">{queue.summary.openCount}</p>
          </Card>
          <Card className="border-border bg-surface p-4">
            <p className="text-sm text-textMuted">Urgent</p>
            <p className="mt-2 text-2xl font-bold text-danger">{queue.summary.urgentCount}</p>
          </Card>
          <Card className="border-border bg-surface p-4">
            <p className="text-sm text-textMuted">At Risk SLA</p>
            <p className="mt-2 text-2xl font-bold text-warning">{sla.atRisk}</p>
          </Card>
          <Card className="border-border bg-surface p-4">
            <p className="text-sm text-textMuted">Breached SLA</p>
            <p className="mt-2 text-2xl font-bold text-danger">{sla.breached}</p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <Card className="border-border bg-surface p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Support Queue</h2>
                <p className="mt-1 text-sm text-textMuted">
                  {filteredTickets.length} tickets match the current filter.
                </p>
              </div>
              <form action="/dashboard/support" className="flex gap-2">
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
                >
                  <option value="all">All statuses</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <input
                  type="search"
                  name="search"
                  defaultValue={search}
                  placeholder="Search tickets"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
                />
                <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
                  Apply
                </button>
              </form>
            </div>

            <div className="mt-6 space-y-3">
              {pageItems.map((ticket) => (
                <div key={ticket.id} className="rounded-lg bg-surface p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-medium text-white">{ticket.subject}</p>
                      <p className="mt-1 text-sm text-textMuted">{ticket.description}</p>
                      <p className="mt-2 text-xs text-textMuted">
                        {new Date(ticket.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-info/20 text-info">{ticket.status}</Badge>
                      <Badge className="bg-surfaceMuted text-textSubtle">{ticket.priority}</Badge>
                    </div>
                  </div>
                  {ticket.order_id && (
                    <Link
                      href={`/dashboard/orders/${ticket.order_id}`}
                      className="mt-3 inline-block text-sm text-primary hover:underline"
                    >
                      View linked order &rarr;
                    </Link>
                  )}
                  <SupportTicketActions ticketId={ticket.id} status={ticket.status} />
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <Link
                href={`/dashboard/support?status=${statusFilter}&search=${encodeURIComponent(search)}&page=${Math.max(1, safePage - 1)}`}
                className={`rounded-lg px-4 py-2 text-sm ${
                  safePage <= 1 ? 'pointer-events-none bg-surface text-textMuted' : 'bg-surface text-white'
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/dashboard/support?status=${statusFilter}&search=${encodeURIComponent(search)}&page=${Math.min(totalPages, safePage + 1)}`}
                className={`rounded-lg px-4 py-2 text-sm ${
                  safePage >= totalPages ? 'pointer-events-none bg-surface text-textMuted' : 'bg-surface text-white'
                }`}
              >
                Next
              </Link>
            </div>
          </Card>

          <Card className="border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-white">Open Exceptions</h2>
            <div className="mt-4 space-y-3">
              {exceptionQueue.slice(0, 8).map((exception) => (
                <div key={exception.id} className="rounded-lg bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white">{exception.title}</p>
                    <Badge
                      className={
                        exception.severity === 'critical'
                          ? 'bg-danger/20 text-danger'
                          : exception.severity === 'high'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-surfaceMuted text-textSubtle'
                      }
                    >
                      {exception.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-textMuted">{exception.status}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
