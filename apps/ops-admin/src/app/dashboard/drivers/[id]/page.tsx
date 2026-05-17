import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import {
  createAdminClient,
  getOpsDriverDetail,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';
import { DriverGovernanceActions } from './driver-governance-actions';

export const dynamic = 'force-dynamic';

const statusColors: Record<string, string> = {
  pending: 'bg-warning',
  approved: 'bg-success',
  rejected: 'bg-danger',
  suspended: 'bg-primary',
};

const presenceColors: Record<string, string> = {
  online: 'bg-success',
  offline: 'bg-surfaceMuted',
  busy: 'bg-primary',
};

function formatMoney(value: number | null | undefined) {
  return `$${(value ?? 0).toFixed(2)}`;
}

function formatTimestamp(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

async function getDriverPageData(driverId: string) {
  const adminClient = createAdminClient() as unknown as SupabaseClient;
  return getOpsDriverDetail(adminClient, driverId);
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const driver = await getDriverPageData(id);

  if (!driver) {
    notFound();
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/drivers"
              className="mb-2 inline-block text-sm text-textMuted hover:text-white"
            >
              &larr; Back to Drivers
            </Link>
            <h1 className="text-3xl font-bold text-white">
              {driver.first_name} {driver.last_name}
            </h1>
            <p className="mt-1 text-textMuted">
              Driver since {new Date(driver.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            {driver.driver_presence && (
              <Badge
                className={`${
                  presenceColors[driver.driver_presence.status] || 'bg-surfaceMuted'
                } px-3 py-1 text-white`}
              >
                {driver.driver_presence.status.toUpperCase()}
              </Badge>
            )}
            <Badge
              className={`${
                statusColors[driver.status] || 'bg-surfaceMuted'
              } px-3 py-1 text-white`}
            >
              {driver.status?.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border bg-surface p-6 lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Driver Profile & Operations Context
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-textMuted">Email</p>
                <p className="text-white">{driver.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-textMuted">Phone</p>
                <p className="text-white">{driver.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-textMuted">Presence</p>
                <p className="text-white capitalize">
                  {driver.driver_presence?.status || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-textMuted">Profile Image</p>
                <p className="text-white">
                  {driver.profile_image_url ? 'Uploaded' : 'Not recorded'}
                </p>
              </div>
              <div>
                <p className="text-sm text-textMuted">User ID</p>
                <p className="font-mono text-sm text-white">{driver.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-textMuted">Driver ID</p>
                <p className="font-mono text-sm text-white">{driver.id}</p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">
                Active Operations
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-textMuted">Active Deliveries</p>
                  <p className="text-xl font-semibold text-white">
                    {driver.stats.activeDeliveries}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-textMuted">Completed Deliveries</p>
                  <p className="text-xl font-semibold text-white">
                    {driver.stats.completedDeliveries}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-border bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Earnings Snapshot
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-surface p-4 text-center">
                <p className="text-2xl font-bold text-success">
                  {formatMoney(driver.stats.totalEarnings)}
                </p>
                <p className="text-sm text-textMuted">Delivered Payouts</p>
              </div>
              <div className="rounded-lg bg-surface p-4 text-center">
                <p className="text-2xl font-bold text-info">
                  {driver.recent_deliveries.length}
                </p>
                <p className="text-sm text-textMuted">Recent Jobs Visible</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Last Known Location
            </h2>
            {driver.driver_presence ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-textMuted">Latitude</p>
                  <p className="font-mono text-white">
                    {driver.driver_presence.last_location_lat ?? 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-textMuted">Longitude</p>
                  <p className="font-mono text-white">
                    {driver.driver_presence.last_location_lng ?? 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-textMuted">Last Updated</p>
                  <p className="text-white">
                    {formatTimestamp(driver.driver_presence.last_updated_at)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-textMuted">
                No presence record is available for this driver yet.
              </p>
            )}

            <Link
              href="/dashboard/map"
              className="mt-4 inline-block text-primary hover:underline"
            >
              View on Live Map &rarr;
            </Link>
          </Card>

          <Card className="border-border bg-surface p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Recent Delivery Context
            </h2>
            {driver.recent_deliveries.length > 0 ? (
              <div className="space-y-3">
                {driver.recent_deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="rounded-lg border border-border bg-surface p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {delivery.order?.order_number
                            ? `Order #${delivery.order.order_number}`
                            : `Delivery ${delivery.id.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-textMuted">
                          {formatTimestamp(
                            delivery.actual_dropoff_at ?? delivery.created_at
                          )}
                        </p>
                      </div>
                      <Badge
                        className={`${
                          delivery.status === 'delivered'
                            ? 'bg-success'
                            : 'bg-info'
                        } text-white`}
                      >
                        {delivery.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-textMuted">
                        Payout {formatMoney(delivery.driver_payout)}
                      </span>
                      <Link
                        href={`/dashboard/deliveries/${delivery.id}`}
                        className="text-primary hover:underline"
                      >
                        View delivery &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-textMuted">
                No deliveries are recorded for this driver yet.
              </p>
            )}
          </Card>
        </div>

        <Card className="border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Driver Governance
          </h2>
          <DriverGovernanceActions
            driverId={driver.id}
            currentStatus={driver.status}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
