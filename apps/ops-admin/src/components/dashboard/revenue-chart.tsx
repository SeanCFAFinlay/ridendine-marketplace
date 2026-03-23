'use client';

import { useState, useEffect } from 'react';
import { Card } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';

interface DayRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export function RevenueChart() {
  const [data, setData] = useState<DayRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');

  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const days = period === '7d' ? 7 : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: orders } = await supabase
        .from('orders')
        .select('total, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('payment_status', 'completed');

      // Group by date
      const dailyData: Record<string, { revenue: number; orders: number }> = {};

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0] as string;
        dailyData[dateStr] = { revenue: 0, orders: 0 };
      }

      // Fill in actual data
      orders?.forEach((order: any) => {
        const dateStr = order.created_at.split('T')[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].revenue += order.total;
          dailyData[dateStr].orders += 1;
        }
      });

      const chartData = Object.entries(dailyData)
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setData(chartData);
      setLoading(false);
    }

    fetchData();
  }, [period, supabase]);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);
  const avgDaily = data.length > 0 ? totalRevenue / data.length : 0;

  return (
    <Card className="border-gray-800 bg-[#16213e] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
        <div className="flex gap-2">
          {(['7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-[#E85D26] text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E85D26] border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-400">${totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-gray-400">Total Revenue</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{totalOrders}</p>
              <p className="text-xs text-gray-400">Total Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">${avgDaily.toFixed(0)}</p>
              <p className="text-xs text-gray-400">Daily Average</p>
            </div>
          </div>

          <div className="h-40 flex items-end gap-1">
            {data.map((day) => (
              <div
                key={day.date}
                className="flex-1 group relative"
              >
                <div
                  className="bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t hover:from-emerald-500 hover:to-emerald-300 transition-colors"
                  style={{
                    height: `${(day.revenue / maxRevenue) * 100}%`,
                    minHeight: '4px',
                  }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <p>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <p>${day.revenue.toFixed(2)} • {day.orders} orders</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{data[0]?.date && new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span>Today</span>
          </div>
        </>
      )}
    </Card>
  );
}
