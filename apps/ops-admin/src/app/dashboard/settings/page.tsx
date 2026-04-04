import Link from 'next/link';
import { Card, Badge } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

const controlSurfaces = [
  {
    title: 'Chef Governance',
    description: 'Approve, reject, suspend, and restore chef accounts from the chef governance surfaces.',
    href: '/dashboard/chefs/approvals',
    cta: 'Open chef approvals',
  },
  {
    title: 'Storefront Governance',
    description: 'Publish, unpublish, pause, and adjust queue controls from chef detail pages.',
    href: '/dashboard/chefs',
    cta: 'Open chef oversight',
  },
  {
    title: 'Order And Delivery Intervention',
    description: 'Use order and delivery operations pages for platform intervention and dispatch oversight.',
    href: '/dashboard/orders',
    cta: 'Open operations queue',
  },
  {
    title: 'Support And Finance Review',
    description: 'Resolve support tickets, review refunds, and monitor liabilities from the dedicated oversight pages.',
    href: '/dashboard/finance',
    cta: 'Open finance oversight',
  },
];

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Platform Controls</h1>
            <p className="mt-1 text-gray-400">
              Ops-admin is the control center for governance and intervention. Persisted platform rule configuration is not implemented as a standalone settings model yet.
            </p>
          </div>
          <Badge className="bg-yellow-500/20 text-yellow-300">Configuration model pending</Badge>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white">Current Control Model</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-sm font-medium text-white">What is real today</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                <li>Chef governance is engine-backed.</li>
                <li>Storefront publication and pause controls are engine-backed.</li>
                <li>Order and dispatch oversight actions are engine-backed.</li>
                <li>Finance visibility comes from ledger, refund, and payout-adjustment data.</li>
              </ul>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-4">
              <p className="text-sm font-medium text-white">What is not implemented yet</p>
              <ul className="mt-3 space-y-2 text-sm text-gray-400">
                <li>No persisted global settings table is wired into ops-admin.</li>
                <li>No standalone payout execution control panel exists yet.</li>
                <li>Platform rules still live in existing domain workflows rather than a centralized settings model.</li>
              </ul>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {controlSurfaces.map((surface) => (
            <Card key={surface.title} className="border-gray-800 bg-[#16213e] p-6">
              <h2 className="text-lg font-semibold text-white">{surface.title}</h2>
              <p className="mt-2 text-sm text-gray-400">{surface.description}</p>
              <Link
                href={surface.href}
                className="mt-4 inline-flex rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a]"
              >
                {surface.cta}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
