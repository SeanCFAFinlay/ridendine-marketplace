import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const queueLinks = [
  {
    href: '/dashboard/deliveries?queue=pending',
    label: 'Pending dispatch',
    field: 'pendingDispatch' as const,
    description: 'Orders waiting for driver assignment or auto-assign retry.',
  },
  {
    href: '/dashboard/deliveries?queue=escalated',
    label: 'Delivery escalations',
    field: 'deliveryEscalations' as const,
    description: 'Deliveries that require manual intervention or escalation handling.',
  },
  {
    href: '/dashboard/orders',
    label: 'Orders needing action',
    field: 'ordersNeedingAction' as const,
    description: 'Kitchen and order workflow states that need ops attention.',
  },
  {
    href: '/dashboard/support',
    label: 'Support backlog',
    field: 'supportBacklog' as const,
    description: 'Customer support work still waiting for review or resolution.',
  },
  {
    href: '/dashboard/finance',
    label: 'Pending refunds',
    field: 'pendingRefunds' as const,
    description: 'Refund cases waiting for finance review or execution.',
  },
  {
    href: '/dashboard/chefs',
    label: 'Storefront risks',
    field: 'storefrontRisks' as const,
    description: 'Paused or risky storefronts that threaten service quality.',
  },
];

export default async function DashboardPage() {
  const dashboard = await getEngine().ops.getDashboard();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Marketplace Control Center</h1>
            <p className="mt-1 text-gray-400">
              Engine-backed operational state for dispatch, exceptions, support, finance, and governance.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Drivers</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {dashboard.driversOnline} online / {dashboard.driversBusy} busy
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Exceptions</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {dashboard.openExceptions} open
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">SLA Breaches</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {dashboard.slaBreaches} today
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboard.cards.map((card) => (
            <Card key={card.label} className="border-gray-800 bg-[#16213e] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{card.value}</p>
                </div>
                <Badge
                  className={
                    card.tone === 'critical'
                      ? 'bg-red-500/20 text-red-200'
                      : card.tone === 'warning'
                        ? 'bg-yellow-500/20 text-yellow-200'
                        : card.tone === 'success'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-gray-700 text-gray-200'
                  }
                >
                  {card.tone}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white">Operational Load</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Active orders</p>
              <p className="mt-2 text-2xl font-semibold text-white">{dashboard.activeOrders}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Active deliveries</p>
              <p className="mt-2 text-2xl font-semibold text-white">{dashboard.activeDeliveries}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Pending dispatch</p>
              <p className="mt-2 text-2xl font-semibold text-white">{dashboard.pendingDispatch}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Driver unavailable</p>
              <p className="mt-2 text-2xl font-semibold text-white">{dashboard.driversUnavailable}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {queueLinks.map((queue) => (
            <Link key={queue.href} href={queue.href}>
              <Card className="h-full border-gray-800 bg-[#16213e] p-6 transition-colors hover:border-[#E85D26]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{queue.label}</h2>
                    <p className="mt-2 text-sm text-gray-400">{queue.description}</p>
                  </div>
                  <Badge className="bg-[#E85D26]/20 text-[#F7B49A]">
                    {dashboard[queue.field]}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
