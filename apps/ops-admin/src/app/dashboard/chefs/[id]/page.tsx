import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient, getChefGovernanceDetail } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';
import { ChefGovernanceActions } from './chef-governance-actions';
import { StorefrontGovernanceActions } from './storefront-governance-actions';

export const dynamic = 'force-dynamic';

async function getChefDetails(chefId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  return getChefGovernanceDetail(supabase, chefId);
}

async function getDeliveryZones(storefrontIds: string[]) {
  if (storefrontIds.length === 0) return [];
  const { createAdminClient } = await import('@ridendine/db');
  const adminClient = createAdminClient() as any;
  const { data } = await adminClient
    .from('chef_delivery_zones')
    .select('id, name, radius_km, delivery_fee, min_order_for_free_delivery, is_active, storefront_id')
    .in('storefront_id', storefrontIds);
  return data || [];
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  suspended: 'bg-orange-500',
};

type Storefront = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_featured: boolean;
  average_rating: number;
  total_reviews: number;
  cuisine_types: string[];
};

type DeliveryZone = {
  id: string;
  name: string;
  radius_km: number;
  delivery_fee: number;
  min_order_for_free_delivery: number | null;
  is_active: boolean;
  storefront_id: string;
};

export default async function ChefDetailPage({ params }: { params: { id: string } }) {
  const data = await getChefDetails(params.id);

  if (!data) {
    notFound();
  }

  const chef = data;
  const storefronts = chef.chef_storefronts as Storefront[] | null;
  const storefrontIds = (storefronts || []).map((s) => s.id);
  const zones = (await getDeliveryZones(storefrontIds)) as DeliveryZone[];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/chefs" className="text-sm text-gray-400 hover:text-white mb-2 inline-block">
              &larr; Back to Chefs
            </Link>
            <h1 className="text-3xl font-bold text-white">{chef.display_name}</h1>
            <p className="mt-1 text-gray-400">
              Member since {new Date(chef.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge className={`${statusColors[chef.status] || 'bg-gray-500'} text-white px-4 py-2`}>
            {chef.status?.toUpperCase()}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Info */}
          <Card className="border-gray-800 bg-[#16213e] p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-white">{chef.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Account Link</p>
                <p className="text-white">{chef.user_id ? 'Linked user account' : 'No linked user account'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-gray-400">Bio</p>
                <p className="text-white">{chef.bio || 'No bio provided'}</p>
              </div>
              {chef.profile_image_url && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-400 mb-2">Profile Image</p>
                  <img
                    src={chef.profile_image_url}
                    alt={chef.display_name}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Stats */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Performance</h2>
            <div className="space-y-4">
              <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-emerald-400">${chef.total_revenue.toFixed(2)}</p>
                <p className="text-sm text-gray-400">Total Revenue</p>
              </div>
              <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{chef.order_count}</p>
                <p className="text-sm text-gray-400">Completed Orders</p>
              </div>
              <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-purple-400">{storefronts?.length || 0}</p>
                <p className="text-sm text-gray-400">Storefronts</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Storefronts */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Storefronts</h2>
          {storefronts && storefronts.length > 0 ? (
            <div className="space-y-4">
              {storefronts.map((storefront) => (
                <div key={storefront.id} className="p-4 bg-[#1a1a2e] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{storefront.name}</h3>
                      <p className="text-sm text-gray-400">
                        {storefront.cuisine_types?.join(', ') || 'No cuisines'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {storefront.is_featured && (
                        <Badge className="bg-yellow-500 text-white">Featured</Badge>
                      )}
                      <Badge className={storefront.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                        {storefront.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <StorefrontGovernanceActions
                        storefrontId={storefront.id}
                        isActive={storefront.is_active}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
                    <span>Rating: {storefront.average_rating?.toFixed(1) || 'N/A'}</span>
                    <span>Reviews: {storefront.total_reviews || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No storefronts created yet</p>
          )}
        </Card>

        {/* Delivery Zones */}
        <Card className="border-gray-800 bg-[#16213e] p-6 mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Delivery Zones</h3>
          {zones.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left">
                    <th className="pb-3 text-gray-400 font-medium">Zone Name</th>
                    <th className="pb-3 text-gray-400 font-medium">Storefront</th>
                    <th className="pb-3 text-gray-400 font-medium">Radius (km)</th>
                    <th className="pb-3 text-gray-400 font-medium">Delivery Fee</th>
                    <th className="pb-3 text-gray-400 font-medium">Free Delivery Min</th>
                    <th className="pb-3 text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {zones.map((zone) => {
                    const sf = (storefronts || []).find((s) => s.id === zone.storefront_id);
                    return (
                      <tr key={zone.id}>
                        <td className="py-3 text-white">{zone.name}</td>
                        <td className="py-3 text-gray-300">{sf?.name || zone.storefront_id}</td>
                        <td className="py-3 text-gray-300">{zone.radius_km}</td>
                        <td className="py-3 text-gray-300">${zone.delivery_fee.toFixed(2)}</td>
                        <td className="py-3 text-gray-300">
                          {zone.min_order_for_free_delivery != null
                            ? `$${zone.min_order_for_free_delivery.toFixed(2)}`
                            : 'N/A'}
                        </td>
                        <td className="py-3">
                          <Badge className={zone.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                            {zone.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">No delivery zones configured</p>
          )}
        </Card>

        {/* Actions */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <p className="mb-4 text-sm text-gray-400">
            Ops owns chef approval and storefront publication. Suspension removes storefront visibility until ops republishes it.
          </p>
          <ChefGovernanceActions chefId={chef.id} chefStatus={chef.status} />
        </Card>
      </div>
    </DashboardLayout>
  );
}
