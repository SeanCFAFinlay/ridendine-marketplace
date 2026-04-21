'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';

interface AnalyticsData {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  avgOrderValue: number;
  topItems: Array<{ name: string; count: number; revenue: number }>;
  hourlyOrders: Array<{ hour: number; count: number }>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const db = supabase;

    async function fetchAnalytics() {
      setLoading(true);

      const { data: { user } } = await db.auth.getUser();
      if (!user) return;

      // Get chef profile and storefront
      const { data: chefProfile } = await db
        .from('chef_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: { id: string } | null };

      if (!chefProfile) return;

      const { data: storefront } = await db
        .from('chef_storefronts')
        .select('id')
        .eq('chef_id', chefProfile.id)
        .single() as { data: { id: string } | null };

      if (!storefront) return;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      interface OrderData {
        id: string;
        total: number;
        status: string;
        created_at: string;
      }

      // Fetch all orders for this storefront
      const { data: ordersData } = await db
        .from('orders')
        .select('id, total, status, created_at')
        .eq('storefront_id', storefront.id)
        .gte('created_at', monthAgo.toISOString())
        .in('status', ['delivered', 'completed', 'ready_for_pickup', 'preparing', 'accepted']);

      const orders = (ordersData || []) as OrderData[];

      // Fetch order items for top items
      const { data: orderItems } = await db
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          menu_items (name)
        `)
        .in('order_id', orders.map(o => o.id));

      const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
      const weekOrders = orders.filter(o => new Date(o.created_at) >= weekAgo);
      const monthOrders = orders;

      const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
      const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
      const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

      // Calculate top items
      const itemCounts: Record<string, { count: number; revenue: number }> = {};
      orderItems?.forEach((item: any) => {
        const name = item.menu_items?.name || 'Unknown';
        if (!itemCounts[name]) {
          itemCounts[name] = { count: 0, revenue: 0 };
        }
        itemCounts[name].count += item.quantity;
        itemCounts[name].revenue += item.unit_price * item.quantity;
      });

      const topItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate hourly distribution
      const hourlyOrders: Record<number, number> = {};
      for (let i = 0; i < 24; i++) hourlyOrders[i] = 0;
      weekOrders.forEach(o => {
        const hour = new Date(o.created_at).getHours();
        if (hourlyOrders[hour] !== undefined) {
          hourlyOrders[hour]++;
        }
      });

      // Calculate daily revenue for chart
      const dailyRevenue: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0] || '';
        dailyRevenue[dateStr] = 0;
      }
      monthOrders.forEach(o => {
        const date = o.created_at.split('T')[0] || '';
        if (date && dailyRevenue[date] !== undefined) {
          dailyRevenue[date] += o.total;
        }
      });

      setData({
        todayRevenue,
        weekRevenue,
        monthRevenue,
        todayOrders: todayOrders.length,
        weekOrders: weekOrders.length,
        monthOrders: monthOrders.length,
        avgOrderValue: monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0,
        topItems,
        hourlyOrders: Object.entries(hourlyOrders).map(([hour, count]) => ({
          hour: parseInt(hour),
          count,
        })),
        dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({
          date,
          revenue,
        })),
      });

      setLoading(false);
    }

    fetchAnalytics();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="mt-2 h-8 w-16 bg-gray-200 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Unable to load analytics. Please try again.</p>
      </div>
    );
  }

  const maxHourlyOrders = Math.max(...data.hourlyOrders.map(h => h.count), 1);
  const maxDailyRevenue = Math.max(...data.dailyRevenue.map(d => d.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-gray-500">Track your performance and revenue</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-[#E85D26] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-sm text-gray-500">Today's Revenue</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">${data.todayRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-gray-400">{data.todayOrders} orders</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">This Week</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">${data.weekRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-gray-400">{data.weekOrders} orders</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">This Month</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">${data.monthRevenue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-gray-400">{data.monthOrders} orders</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">${data.avgOrderValue.toFixed(2)}</p>
          <p className="mt-1 text-sm text-gray-400">per order</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <h3 className="font-semibold text-gray-900">Daily Revenue (Last 30 Days)</h3>
          <div className="mt-4 h-48 flex items-end gap-1">
            {data.dailyRevenue.map((day, i) => (
              <div
                key={day.date}
                className="flex-1 bg-[#E85D26] rounded-t opacity-70 hover:opacity-100 transition-opacity"
                style={{ height: `${(day.revenue / maxDailyRevenue) * 100}%`, minHeight: '2px' }}
                title={`${day.date}: $${day.revenue.toFixed(2)}`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <h3 className="font-semibold text-gray-900">Orders by Hour (This Week)</h3>
          <div className="mt-4 h-48 flex items-end gap-1">
            {data.hourlyOrders.map((hour) => (
              <div
                key={hour.hour}
                className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                style={{ height: `${(hour.count / maxHourlyOrders) * 100}%`, minHeight: '2px' }}
                title={`${hour.hour}:00 - ${hour.count} orders`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
        </Card>
      </div>

      {/* Top Items */}
      <Card>
        <h3 className="font-semibold text-gray-900">Top Selling Items</h3>
        {data.topItems.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No orders yet this month</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.topItems.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-[#E85D26]">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.count} sold • ${item.revenue.toFixed(2)} revenue
                  </p>
                </div>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E85D26]"
                    style={{ width: `${(item.count / (data.topItems[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
