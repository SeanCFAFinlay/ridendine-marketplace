import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getDriverDetails(driverId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: driver, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (error || !driver) {
    return null;
  }

  // Get driver presence
  let presence = null;
  try {
    const { data } = await supabase
      .from('driver_presence')
      .select('*')
      .eq('driver_id', driverId)
      .single();
    presence = data;
  } catch {
    // Presence may not exist
  }

  // Get delivery stats
  let deliveryCount = 0;
  let totalEarnings = 0;
  try {
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('driver_payout')
      .eq('driver_id', driverId)
      .eq('status', 'delivered');

    if (deliveries) {
      deliveryCount = deliveries.length;
      totalEarnings = deliveries.reduce((sum: number, d: { driver_payout: number | null }) => sum + (d.driver_payout || 0), 0);
    }
  } catch {
    // Deliveries may not exist
  }

  return { driver, presence, deliveryCount, totalEarnings };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  suspended: 'bg-orange-500',
};

const presenceColors: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-gray-500',
  busy: 'bg-orange-500',
};

export default async function DriverDetailPage({ params }: { params: { id: string } }) {
  const data = await getDriverDetails(params.id);

  if (!data) {
    notFound();
  }

  const { driver, presence, deliveryCount, totalEarnings } = data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/drivers" className="text-sm text-gray-400 hover:text-white mb-2 inline-block">
              &larr; Back to Drivers
            </Link>
            <h1 className="text-3xl font-bold text-white">
              {driver.first_name} {driver.last_name}
            </h1>
            <p className="mt-1 text-gray-400">
              Driver since {new Date(driver.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            {presence && (
              <Badge className={`${presenceColors[presence.status] || 'bg-gray-500'} text-white px-3 py-1`}>
                {presence.status?.toUpperCase()}
              </Badge>
            )}
            <Badge className={`${statusColors[driver.status] || 'bg-gray-500'} text-white px-3 py-1`}>
              {driver.status?.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Info */}
          <Card className="border-gray-800 bg-[#16213e] p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{driver.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-white">{driver.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Account Status</p>
                <p className="text-white capitalize">{driver.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Online Status</p>
                <p className="text-white capitalize">{presence?.status || 'Unknown'}</p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Performance</h2>
            <div className="space-y-4">
              <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-emerald-400">${totalEarnings.toFixed(2)}</p>
                <p className="text-sm text-gray-400">Total Earnings</p>
              </div>
              <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{deliveryCount}</p>
                <p className="text-sm text-gray-400">Completed Deliveries</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Location */}
        {presence && presence.last_location_lat && presence.last_location_lng && (
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Last Known Location</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-gray-400">Latitude</p>
                <p className="text-white font-mono">{presence.last_location_lat}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Longitude</p>
                <p className="text-white font-mono">{presence.last_location_lng}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Updated</p>
                <p className="text-white">
                  {presence.last_updated_at
                    ? new Date(presence.last_updated_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>
            <Link href="/dashboard/map" className="text-[#E85D26] hover:underline inline-block mt-4">
              View on Live Map &rarr;
            </Link>
          </Card>
        )}

        {/* Recent Deliveries Placeholder */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Deliveries</h2>
          <div className="h-32 flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-500">Delivery history coming soon</p>
          </div>
        </Card>

        {/* Actions */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="flex gap-3">
            {driver.status === 'pending' && (
              <>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Approve Driver
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Reject Application
                </button>
              </>
            )}
            {driver.status === 'approved' && (
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                Suspend Driver
              </button>
            )}
            {driver.status === 'suspended' && (
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Unsuspend Driver
              </button>
            )}
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              View Deliveries
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Send Message
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
