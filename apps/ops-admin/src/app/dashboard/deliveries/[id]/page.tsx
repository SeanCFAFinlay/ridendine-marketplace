import Link from 'next/link';
import { Badge, Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine } from '@/lib/engine';
import { createAdminClient, listOpsDrivers, type SupabaseClient } from '@ridendine/db';
import { notFound } from 'next/navigation';
import { DeliveryActions } from './delivery-actions';

export const dynamic = 'force-dynamic';

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, { items: drivers }] = await Promise.all([
    getEngine().ops.getDeliveryInterventionDetail(id),
    listOpsDrivers(createAdminClient() as unknown as SupabaseClient, { status: 'approved' }),
  ]);

  if (!detail) {
    notFound();
  }

  const openException = detail.eventTimeline.find((event) => event.type.startsWith('exception.'));

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/dashboard/deliveries"
              className="mb-2 inline-block text-sm text-gray-400 hover:text-white"
            >
              &larr; Back to dispatch board
            </Link>
            <h1 className="text-3xl font-bold text-white">
              Delivery Intervention Console
            </h1>
            <p className="mt-1 text-gray-400">
              Order {detail.order.orderNumber} · Created {formatDate(detail.order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-500/20 text-blue-200">{detail.status}</Badge>
            <Badge
              className={
                detail.escalationState === 'escalated'
                  ? 'bg-red-500/20 text-red-200'
                  : detail.escalationState === 'acknowledged'
                    ? 'bg-yellow-500/20 text-yellow-200'
                    : detail.escalationState === 'open'
                      ? 'bg-orange-500/20 text-orange-200'
                      : 'bg-gray-700 text-gray-200'
              }
            >
              escalation {detail.escalationState}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white">Linked Order Context</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Order status</span>
                <span className="text-white">{detail.order.status}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Payment status</span>
                <span className="text-white">{detail.order.paymentStatus ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Storefront</span>
                <span className="text-white">{detail.storefront?.name ?? 'Unknown'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Customer</span>
                <span className="text-white">{detail.customer?.name ?? 'Unknown'}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href={`/dashboard/orders/${detail.order.id}`} className="text-[#E85D26] hover:underline">
                View order detail &rarr;
              </Link>
              {detail.driver && (
                <Link href={`/dashboard/drivers/${detail.driver.id}`} className="text-[#E85D26] hover:underline">
                  View driver detail &rarr;
                </Link>
              )}
            </div>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white">Pickup, Dropoff, and Payout</h2>
            <div className="mt-4 grid gap-4">
              <div className="rounded-lg bg-[#1a1a2e] p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Pickup</p>
                <p className="mt-2 text-sm text-white">{detail.pickup.address}</p>
              </div>
              <div className="rounded-lg bg-[#1a1a2e] p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Dropoff</p>
                <p className="mt-2 text-sm text-white">{detail.dropoff.address}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-[#1a1a2e] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Delivery fee</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {formatMoney(detail.payout.deliveryFee)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a1a2e] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Driver payout</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-300">
                    {formatMoney(detail.payout.driverPayout)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#1a1a2e] p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Refund exposure</p>
                  <p className="mt-2 text-lg font-semibold text-yellow-200">
                    {formatMoney(detail.payout.refundExposureCents / 100)}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white">Assignment Attempts</h2>
            <div className="mt-4 space-y-3">
              {detail.assignmentAttempts.length === 0 ? (
                <p className="text-sm text-gray-500">No assignment attempts recorded yet.</p>
              ) : (
                detail.assignmentAttempts.map((attempt) => (
                  <div key={attempt.id} className="rounded-lg bg-[#1a1a2e] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-white">Attempt {attempt.attemptNumber}</p>
                        <p className="text-xs text-gray-500">
                          Offered {formatDate(attempt.offeredAt)} · expires {formatDate(attempt.expiresAt)}
                        </p>
                      </div>
                      <Badge className="bg-gray-700 text-gray-200">{attempt.response}</Badge>
                    </div>
                    {attempt.declineReason && (
                      <p className="mt-2 text-sm text-gray-400">{attempt.declineReason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white">Driver Context</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg bg-[#1a1a2e] p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Assigned driver</p>
                <p className="mt-2 text-white">{detail.driver?.name ?? 'No driver assigned'}</p>
                {detail.driver?.phone && (
                  <p className="mt-1 text-gray-400">{detail.driver.phone}</p>
                )}
                {detail.driver?.presenceStatus && (
                  <p className="mt-1 text-xs text-gray-500">
                    presence {detail.driver.presenceStatus}
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-[#1a1a2e] p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Escalation</p>
                <p className="mt-2 text-white">
                  {detail.escalationReason ?? 'No active escalation reason'}
                </p>
                {openException && (
                  <p className="mt-1 text-xs text-gray-500">
                    Last exception event {formatDate(openException.timestamp)}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white">Event Timeline</h2>
            <div className="mt-4 space-y-3">
              {detail.eventTimeline.length === 0 ? (
                <p className="text-sm text-gray-500">No delivery events recorded yet.</p>
              ) : (
                detail.eventTimeline.map((event) => (
                  <div key={event.id} className="rounded-lg bg-[#1a1a2e] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-white">{event.type}</p>
                      <span className="text-xs text-gray-500">{formatDate(event.timestamp)}</span>
                    </div>
                    {event.note && <p className="mt-2 text-sm text-gray-400">{event.note}</p>}
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white">Ops Notes & Tracking</h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-[#1a1a2e] p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Ops notes</p>
                <div className="mt-3 space-y-3">
                  {detail.opsNotes.length === 0 ? (
                    <p className="text-sm text-gray-500">No ops notes recorded.</p>
                  ) : (
                    detail.opsNotes.map((note) => (
                      <div key={note.id}>
                        <p className="text-sm text-white">{note.content}</p>
                        <p className="text-xs text-gray-500">{formatDate(note.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-[#1a1a2e] p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Tracking breadcrumbs</p>
                <div className="mt-3 space-y-2">
                  {detail.trackingBreadcrumbs.length === 0 ? (
                    <p className="text-sm text-gray-500">No tracking breadcrumbs recorded.</p>
                  ) : (
                    detail.trackingBreadcrumbs.slice(0, 5).map((point) => (
                      <div key={point.id} className="text-sm text-gray-300">
                        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                        <span className="ml-2 text-xs text-gray-500">
                          {formatDate(point.recordedAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Interventions</h2>
          <DeliveryActions
            deliveryId={detail.deliveryId}
            currentStatus={detail.status}
            assignedDriverId={detail.driver?.id ?? null}
            openExceptionId={openException?.type.startsWith('exception.') ? openException.id : null}
            drivers={drivers}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
