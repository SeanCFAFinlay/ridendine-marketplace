import { Card } from '@ridendine/ui';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { EventMetrics } from './components/event-metrics';
import { TrendCharts } from './components/trend-charts';

export const dynamic = 'force-dynamic';

async function getAnalyticsData() {
  const supabase = createAdminClient() as unknown as SupabaseClient;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      totalOrdersResult,
      completedOrdersResult,
      revenueResult,
      weeklyOrdersResult,
      approvedChefsResult,
      liveStorefrontsResult,
      approvedDriversResult,
      onlineDriversResult,
      totalCustomersResult,
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'delivered'),
      supabase
        .from('orders')
        .select('total, service_fee')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('payment_status', 'completed'),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString()),
      supabase
        .from('chef_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('chef_storefronts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('driver_presence')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
    ]);

    const revenueData =
      (revenueResult.data as Array<{ total: number | null; service_fee: number | null }>) ??
      [];
    const totalRevenue = revenueData.reduce(
      (sum, order) => sum + (order.total ?? 0),
      0
    );
    const platformRevenue = revenueData.reduce(
      (sum, order) => sum + (order.service_fee ?? 0),
      0
    );

    return {
      totalOrders: totalOrdersResult.count ?? 0,
      completedOrders: completedOrdersResult.count ?? 0,
      weeklyOrders: weeklyOrdersResult.count ?? 0,
      totalRevenue,
      platformRevenue,
      avgOrderValue:
        totalOrdersResult.count && totalOrdersResult.count > 0
          ? totalRevenue / totalOrdersResult.count
          : 0,
      completionRate:
        totalOrdersResult.count && totalOrdersResult.count > 0
          ? ((completedOrdersResult.count ?? 0) / totalOrdersResult.count) * 100
          : 0,
      approvedChefs: approvedChefsResult.count ?? 0,
      liveStorefronts: liveStorefrontsResult.count ?? 0,
      approvedDrivers: approvedDriversResult.count ?? 0,
      onlineDrivers: onlineDriversResult.count ?? 0,
      totalCustomers: totalCustomersResult.count ?? 0,
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
      approvedChefs: 0,
      liveStorefronts: 0,
      approvedDrivers: 0,
      onlineDrivers: 0,
      totalCustomers: 0,
    };
  }
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  const metrics = [
    {
      label: 'Total Orders (30d)',
      value: data.totalOrders.toLocaleString(),
      color: 'text-blue-400',
    },
    {
      label: 'Completed Orders',
      value: data.completedOrders.toLocaleString(),
      color: 'text-green-400',
    },
    {
      label: 'Weekly Orders',
      value: data.weeklyOrders.toLocaleString(),
      color: 'text-purple-400',
    },
    {
      label: 'Completion Rate',
      value: `${data.completionRate.toFixed(1)}%`,
      color: 'text-emerald-400',
    },
  ];

  const financials = [
    {
      label: 'Captured Revenue (30d)',
      value: `$${data.totalRevenue.toFixed(2)}`,
    },
    {
      label: 'Service Fee Revenue',
      value: `$${data.platformRevenue.toFixed(2)}`,
    },
    {
      label: 'Avg Order Value',
      value: `$${data.avgOrderValue.toFixed(2)}`,
    },
  ];

  const platformStats = [
    { label: 'Approved Chefs', value: data.approvedChefs },
    { label: 'Live Storefronts', value: data.liveStorefronts },
    { label: 'Approved Drivers', value: data.approvedDrivers },
    { label: 'Drivers Online', value: data.onlineDrivers },
    { label: 'Total Customers', value: data.totalCustomers },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
          <p className="mt-1 text-gray-400">
            Historical trends, revenue analysis, and operational reporting.
          </p>
        </div>

        <TrendCharts />

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Order Metrics</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-center">
                <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
                <p className="mt-1 text-sm text-gray-400">{metric.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Financial Overview
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {financials.map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-[#1a1a2e] p-4 text-center"
              >
                <p className="text-2xl font-bold text-emerald-400">{item.value}</p>
                <p className="mt-1 text-sm text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Platform Statistics
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
            {platformStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg bg-[#1a1a2e] p-4 text-center"
              >
                <p className="text-2xl font-bold text-white">
                  {stat.value.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <EventMetrics />

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Reporting Scope
          </h2>
          <div className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4 text-sm text-gray-300">
            This analytics surface reports live operational counts, recent
            financial totals, and historical trend charts. Cohort analysis and
            deep forecasting are not yet implemented.
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
