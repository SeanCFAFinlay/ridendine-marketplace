import { cookies } from 'next/headers';
import { Card, Badge } from '@ridendine/ui';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

async function getFinanceData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Revenue queries
    const [thisWeekResult, lastWeekResult, monthResult, allTimeResult] = await Promise.all([
      supabase.from('orders').select('total').gte('created_at', weekAgo.toISOString()).eq('payment_status', 'completed'),
      supabase.from('orders').select('total').gte('created_at', twoWeeksAgo.toISOString()).lt('created_at', weekAgo.toISOString()).eq('payment_status', 'completed'),
      supabase.from('orders').select('total').gte('created_at', monthAgo.toISOString()).eq('payment_status', 'completed'),
      supabase.from('orders').select('total').eq('payment_status', 'completed'),
    ]);

    const thisWeekRevenue = (thisWeekResult.data || []).reduce((sum: number, o: { total: number | null }) => sum + (o.total || 0), 0);
    const lastWeekRevenue = (lastWeekResult.data || []).reduce((sum: number, o: { total: number | null }) => sum + (o.total || 0), 0);
    const monthRevenue = (monthResult.data || []).reduce((sum: number, o: { total: number | null }) => sum + (o.total || 0), 0);
    const totalGMV = (allTimeResult.data || []).reduce((sum: number, o: { total: number | null }) => sum + (o.total || 0), 0);

    // Chef payout data
    let chefPayouts: Array<{ id: string; name: string; pending: number; lastPayout?: string }> = [];
    try {
      const { data: chefs } = await supabase
        .from('chef_storefronts')
        .select('id, name, chef_profiles(id)')
        .eq('is_active', true);

      if (chefs) {
        chefPayouts = await Promise.all(
          chefs.slice(0, 10).map(async (chef: { id: string; name: string }) => {
            const { data: orders } = await supabase
              .from('orders')
              .select('subtotal')
              .eq('storefront_id', chef.id)
              .eq('payment_status', 'completed');

            const totalEarnings = (orders || []).reduce((sum: number, o: { subtotal: number }) => sum + (o.subtotal || 0), 0);
            const platformFee = totalEarnings * 0.15;
            const pending = totalEarnings - platformFee;

            return {
              id: chef.id,
              name: chef.name,
              pending: Math.round(pending),
              lastPayout: undefined,
            };
          })
        );
      }
    } catch (e) {
      console.log('Could not fetch chef payouts');
    }

    // Driver earnings data
    let driverPayouts: Array<{ id: string; name: string; pending: number; deliveries: number }> = [];
    try {
      const { data: drivers } = await supabase
        .from('drivers')
        .select('id, first_name, last_name')
        .eq('status', 'approved');

      if (drivers) {
        driverPayouts = await Promise.all(
          drivers.slice(0, 10).map(async (driver: { id: string; first_name: string; last_name: string }) => {
            const { data: deliveries } = await supabase
              .from('deliveries')
              .select('driver_payout')
              .eq('driver_id', driver.id)
              .eq('status', 'delivered');

            const totalEarnings = (deliveries || []).reduce((sum: number, d: { driver_payout: number }) => sum + (d.driver_payout || 0), 0);

            return {
              id: driver.id,
              name: `${driver.first_name} ${driver.last_name}`,
              pending: totalEarnings,
              deliveries: deliveries?.length || 0,
            };
          })
        );
      }
    } catch (e) {
      console.log('Could not fetch driver payouts');
    }

    const weekOverWeekGrowth = lastWeekRevenue > 0
      ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
      : 0;

    return {
      totalGMV,
      thisWeekRevenue,
      lastWeekRevenue,
      monthRevenue,
      platformCommission: totalGMV * 0.15,
      weekOverWeekGrowth,
      chefPayouts: chefPayouts.filter(c => c.pending > 0),
      driverPayouts: driverPayouts.filter(d => d.pending > 0),
    };
  } catch (error) {
    console.error('Finance data error:', error);
    return {
      totalGMV: 0,
      thisWeekRevenue: 0,
      lastWeekRevenue: 0,
      monthRevenue: 0,
      platformCommission: 0,
      weekOverWeekGrowth: 0,
      chefPayouts: [],
      driverPayouts: [],
    };
  }
}

export default async function FinancePage() {
  const data = await getFinanceData();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Finance Dashboard</h1>
          <p className="mt-1 text-gray-400">Revenue tracking and payout management</p>
        </div>

        {/* Revenue Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Total GMV</p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              ${(data.totalGMV / 100).toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-gray-500">All-time gross merchandise value</p>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Platform Commission (15%)</p>
            <p className="mt-2 text-3xl font-bold text-blue-400">
              ${(data.platformCommission / 100).toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-gray-500">All-time platform earnings</p>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">This Week Revenue</p>
            <p className="mt-2 text-3xl font-bold text-purple-400">
              ${(data.thisWeekRevenue / 100).toFixed(2)}
            </p>
            <p className={`mt-1 text-sm ${data.weekOverWeekGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.weekOverWeekGrowth >= 0 ? '+' : ''}{data.weekOverWeekGrowth.toFixed(1)}% vs last week
            </p>
          </Card>

          <Card className="border-gray-800 bg-[#16213e] p-6">
            <p className="text-sm text-gray-400">Monthly Revenue</p>
            <p className="mt-2 text-3xl font-bold text-orange-400">
              ${(data.monthRevenue / 100).toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-gray-500">Last 30 days</p>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Chef Payout Queue */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Chef Payout Queue</h2>
              <Badge className="bg-yellow-500/20 text-yellow-400">
                {data.chefPayouts.length} pending
              </Badge>
            </div>

            {data.chefPayouts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending chef payouts</p>
            ) : (
              <div className="space-y-3">
                {data.chefPayouts.map((chef) => (
                  <div
                    key={chef.id}
                    className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{chef.name}</p>
                      {chef.lastPayout && (
                        <p className="text-xs text-gray-500">Last payout: {chef.lastPayout}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-emerald-400">
                        ${(chef.pending / 100).toFixed(2)}
                      </span>
                      <button className="rounded-lg bg-[#E85D26] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#d14d1a] transition-colors">
                        Pay Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Driver Payout Queue */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Driver Payout Queue</h2>
              <Badge className="bg-blue-500/20 text-blue-400">
                {data.driverPayouts.length} pending
              </Badge>
            </div>

            {data.driverPayouts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending driver payouts</p>
            ) : (
              <div className="space-y-3">
                {data.driverPayouts.map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between rounded-lg bg-gray-800/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{driver.name}</p>
                      <p className="text-xs text-gray-500">{driver.deliveries} deliveries</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-emerald-400">
                        ${(driver.pending / 100).toFixed(2)}
                      </span>
                      <button className="rounded-lg bg-[#E85D26] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#d14d1a] transition-colors">
                        Pay Driver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Payout Run History */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Payout Run History</h2>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
              Run Weekly Payouts
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-3 text-left text-sm font-medium text-gray-400">Date</th>
                  <th className="py-3 text-left text-sm font-medium text-gray-400">Type</th>
                  <th className="py-3 text-left text-sm font-medium text-gray-400">Recipients</th>
                  <th className="py-3 text-left text-sm font-medium text-gray-400">Total Amount</th>
                  <th className="py-3 text-left text-sm font-medium text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="py-4 text-sm text-gray-300">Mar 21, 2026</td>
                  <td className="py-4 text-sm text-gray-300">Weekly Chef Payout</td>
                  <td className="py-4 text-sm text-gray-300">5 chefs</td>
                  <td className="py-4 text-sm text-emerald-400 font-medium">$2,450.00</td>
                  <td className="py-4">
                    <Badge className="bg-green-500/20 text-green-400">Completed</Badge>
                  </td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 text-sm text-gray-300">Mar 21, 2026</td>
                  <td className="py-4 text-sm text-gray-300">Weekly Driver Payout</td>
                  <td className="py-4 text-sm text-gray-300">2 drivers</td>
                  <td className="py-4 text-sm text-emerald-400 font-medium">$340.00</td>
                  <td className="py-4">
                    <Badge className="bg-green-500/20 text-green-400">Completed</Badge>
                  </td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 text-sm text-gray-300">Mar 14, 2026</td>
                  <td className="py-4 text-sm text-gray-300">Weekly Chef Payout</td>
                  <td className="py-4 text-sm text-gray-300">4 chefs</td>
                  <td className="py-4 text-sm text-emerald-400 font-medium">$1,890.00</td>
                  <td className="py-4">
                    <Badge className="bg-green-500/20 text-green-400">Completed</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
