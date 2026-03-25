import { Card } from '@ridendine/ui';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

async function getAnalyticsData() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      totalOrdersResult,
      completedOrdersResult,
      revenueResult,
      weeklyOrdersResult,
      chefsResult,
      driversResult,
      customersResult,
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()).eq('status', 'delivered'),
      supabase.from('orders').select('total, service_fee').gte('created_at', thirtyDaysAgo.toISOString()).eq('payment_status', 'completed'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('chef_storefronts').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('drivers').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
    ]);

    const revenueData = revenueResult.data as Array<{ total: number; service_fee: number }> || [];
    const totalRevenue = revenueData.reduce((sum, o) => sum + (o.total || 0), 0);
    const platformRevenue = revenueData.reduce((sum, o) => sum + (o.service_fee || 0), 0);

    return {
      totalOrders: totalOrdersResult.count ?? 0,
      completedOrders: completedOrdersResult.count ?? 0,
      weeklyOrders: weeklyOrdersResult.count ?? 0,
      totalRevenue,
      platformRevenue,
      avgOrderValue: totalOrdersResult.count ? totalRevenue / totalOrdersResult.count : 0,
      completionRate: totalOrdersResult.count ? ((completedOrdersResult.count ?? 0) / totalOrdersResult.count) * 100 : 0,
      activeChefs: chefsResult.count ?? 0,
      activeDrivers: driversResult.count ?? 0,
      totalCustomers: customersResult.count ?? 0,
    };
  } catch (error) {
    console.error('Analytics error:', error);
    return {
      totalOrders: 0,
      completedOrders: 0,
      weeklyOrders: 0,
      totalRevenue: 0,
      platformRevenue: 0,
      avgOrderValue: 0,
      completionRate: 0,
      activeChefs: 0,
      activeDrivers: 0,
      totalCustomers: 0,
    };
  }
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  const metrics = [
    { label: 'Total Orders (30d)', value: data.totalOrders.toLocaleString(), color: 'text-blue-400' },
    { label: 'Completed Orders', value: data.completedOrders.toLocaleString(), color: 'text-green-400' },
    { label: 'Weekly Orders', value: data.weeklyOrders.toLocaleString(), color: 'text-purple-400' },
    { label: 'Completion Rate', value: `${data.completionRate.toFixed(1)}%`, color: 'text-emerald-400' },
  ];

  const financials = [
    { label: 'Total Revenue (30d)', value: `$${data.totalRevenue.toFixed(2)}` },
    { label: 'Platform Revenue', value: `$${data.platformRevenue.toFixed(2)}` },
    { label: 'Avg Order Value', value: `$${data.avgOrderValue.toFixed(2)}` },
  ];

  const platformStats = [
    { label: 'Active Chefs', value: data.activeChefs },
    { label: 'Active Drivers', value: data.activeDrivers },
    { label: 'Total Customers', value: data.totalCustomers },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
          <p className="mt-1 text-gray-400">Platform performance metrics and insights</p>
        </div>

        {/* Order Metrics */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Metrics</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
                <p className="text-sm text-gray-400 mt-1">{metric.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Financial Overview */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Financial Overview</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {financials.map((item) => (
              <div key={item.label} className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-emerald-400">{item.value}</p>
                <p className="text-sm text-gray-400 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Platform Statistics */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Platform Statistics</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {platformStats.map((stat) => (
              <div key={stat.label} className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Placeholder for Charts */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Trends & Insights</h2>
          <div className="h-64 flex items-center justify-center border border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-500">Advanced charts and trend analysis coming soon</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
