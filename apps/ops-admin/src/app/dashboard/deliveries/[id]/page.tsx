import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import {
  createAdminClient,
  getOpsDeliveryDetail,
  listOpsDrivers,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';
import { DeliveryActions } from './delivery-actions';

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  assigned: 'bg-blue-500',
  accepted: 'bg-indigo-500',
  en_route_to_pickup: 'bg-purple-500',
  arrived_at_pickup: 'bg-cyan-500',
  picked_up: 'bg-teal-500',
  en_route_to_dropoff: 'bg-orange-500',
  arrived_at_dropoff: 'bg-amber-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  failed: 'bg-red-700',
};

function formatMoney(value: number | null | undefined) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function formatTimestamp(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

async function getDeliveryDetailPageData(deliveryId: string) {
  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const [delivery, drivers] = await Promise.all([
    getOpsDeliveryDetail(adminClient, deliveryId),
    listOpsDrivers(adminClient, { status: 'approved' }),
  ]);

  if (!delivery) {
    return null;
  }

  return { delivery, drivers };
}

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDeliveryDetailPageData(id);

  if (!data) {
    notFound();
  }

  const { delivery, drivers } = data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/deliveries"
              className="mb-2 inline-block text-sm text-gray-400 hover:text-white"
            >
              &larr; Back to Deliveries
            </Link>
            <h1 className="text-3xl font-bold text-white">
              Delivery #{delivery.id.slice(0, 8)}
            </h1>
            <p className="mt-1 text-gray-400">
              Created {new Date(delivery.created_at).toLocaleString()}
            </p>
          </div>
          <Badge
            className={`${
              statusColors[delivery.status] || 'bg-gray-500'
            } px-4 py-2 text-white`}
          >
            {delivery.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Delivery Oversight
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Linked Order</span>
                <span className="text-white">
                  {delivery.order?.order_number
                    ? `#${delivery.order.order_number}`
                    : 'Not linked'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Order Status</span>
                <span className="text-white">
                  {delivery.order?.status?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Payment Status</span>
                <span className="text-white">
                  {delivery.order?.payment_status || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Storefront</span>
                <span className="text-white">
                  {delivery.order?.storefront?.name || 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {delivery.order?.id && (
                <Link
                  href={`/dashboard/orders/${delivery.order.id}`}
                  className="text-[#E85D26] hover:underline"
                >
                  View Order Detail &rarr;
                </Link>
              )}
              {delivery.driver?.id && (
                <Link
                  href={`/dashboard/drivers/${delivery.driver.id}`}
                  className="text-[#E85D26] hover:underline"
                >
                  View Driver Detail &rarr;
                </Link>
              )}
            </div>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Driver & Customer Context
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-400">Assigned Driver</p>
                <p className="mt-1 text-white">
                  {delivery.driver
                    ? `${delivery.driver.first_name} ${delivery.driver.last_name}`
                    : 'Not assigned'}
                </p>
                {delivery.driver?.phone && (
                  <p className="text-xs text-gray-400">{delivery.driver.phone}</p>
                )}
              </div>
              <div>
                <p className="text-gray-400">Customer</p>
                <p className="mt-1 text-white">
                  {delivery.order?.customer
                    ? `${delivery.order.customer.first_name} ${delivery.order.customer.last_name}`
                    : 'Not available'}
                </p>
                {delivery.order?.customer?.phone && (
                  <p className="text-xs text-gray-400">
                    {delivery.order.customer.phone}
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Dispatch Status
                </p>
                <p className="mt-2 text-sm text-gray-200">
                  {delivery.driver
                    ? 'A driver is assigned. Reassignment is available if intervention is required.'
                    : 'No driver is assigned yet. Ops can run auto-assign or make a manual assignment from this page.'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Route & Payout Context
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-sm font-medium text-white">Pickup</p>
              <p className="mt-2 text-sm text-gray-300">
                {delivery.pickup_address || 'Address not set'}
              </p>
            </div>
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-sm font-medium text-white">Dropoff</p>
              <p className="mt-2 text-sm text-gray-300">
                {delivery.dropoff_address || 'Address not set'}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-400">Distance</p>
              <p className="text-white">
                {delivery.distance_km ? `${delivery.distance_km} km` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Delivery Fee</p>
              <p className="text-white">{formatMoney(delivery.delivery_fee)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Driver Payout</p>
              <p className="text-emerald-400">
                {formatMoney(delivery.driver_payout)}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/map"
            className="mt-4 inline-block text-[#E85D26] hover:underline"
          >
            View on Live Map &rarr;
          </Link>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Workflow Timeline
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div>
                  <p className="text-white">Delivery Record Created</p>
                  <p className="text-sm text-gray-400">
                    {formatTimestamp(delivery.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <div>
                  <p className="text-white">Estimated Pickup</p>
                  <p className="text-sm text-gray-400">
                    {formatTimestamp(delivery.estimated_pickup_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <div>
                  <p className="text-white">Actual Pickup</p>
                  <p className="text-sm text-gray-400">
                    {formatTimestamp(delivery.actual_pickup_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <div>
                  <p className="text-white">Estimated Dropoff</p>
                  <p className="text-sm text-gray-400">
                    {formatTimestamp(delivery.estimated_dropoff_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-white">Actual Dropoff</p>
                  <p className="text-sm text-gray-400">
                    {formatTimestamp(delivery.actual_dropoff_at)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Tracking Visibility
            </h2>
            {delivery.tracking_events.length > 0 ? (
              <div className="space-y-3">
                {delivery.tracking_events
                  .slice(-5)
                  .reverse()
                  .map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4"
                    >
                      <p className="text-sm text-white">
                        {event.lat.toFixed(5)}, {event.lng.toFixed(5)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Recorded {formatTimestamp(event.recorded_at)}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4">
                <p className="text-sm text-gray-300">
                  No tracking pings are recorded for this delivery yet.
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Live workflow events still come from the assigned driver flow. Ops
                  can use dispatch controls here without fabricating status changes.
                </p>
              </div>
            )}
          </Card>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Delivery Controls
          </h2>
          <DeliveryActions
            deliveryId={delivery.id}
            currentStatus={delivery.status}
            assignedDriverId={delivery.driver_id}
            drivers={drivers}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
