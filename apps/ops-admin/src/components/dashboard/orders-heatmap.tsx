'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';

export function OrdersHeatmap() {
  const [hourlyData, setHourlyData] = useState<number[]>(Array(24).fill(0));
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const db = supabase;

    async function fetchData() {
      setLoading(true);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const { data: orders } = await db
        .from('orders')
        .select('created_at')
        .gte('created_at', weekAgo.toISOString());

      // Count orders by hour
      const hourCounts = Array(24).fill(0);

      orders?.forEach((order: any) => {
        const hour = new Date(order.created_at).getHours();
        hourCounts[hour]++;
      });

      setHourlyData(hourCounts);
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  const maxOrders = Math.max(...hourlyData, 1);
  const totalOrders = hourlyData.reduce((sum, count) => sum + count, 0);
  const peakHour = hourlyData.indexOf(Math.max(...hourlyData));

  const getIntensityColor = (count: number) => {
    const intensity = count / maxOrders;
    if (intensity === 0) return 'bg-gray-800';
    if (intensity < 0.25) return 'bg-emerald-900';
    if (intensity < 0.5) return 'bg-emerald-700';
    if (intensity < 0.75) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  return (
    <Card className="border-gray-800 bg-[#16213e] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Order Activity by Hour</h3>
        <span className="text-xs text-gray-400">Last 7 days</span>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E85D26] border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <p className="text-2xl font-bold text-white">{totalOrders}</p>
              <p className="text-xs text-gray-400">Total Orders</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{formatHour(peakHour)}</p>
              <p className="text-xs text-gray-400">Peak Hour</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{hourlyData[peakHour]}</p>
              <p className="text-xs text-gray-400">Peak Orders</p>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="grid grid-cols-6 gap-1 mb-4">
            {hourlyData.map((count, hour) => (
              <div
                key={hour}
                className={`relative aspect-square rounded group ${getIntensityColor(count)}`}
                title={`${formatHour(hour)}: ${count} orders`}
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold text-white">{count}</span>
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {formatHour(hour)}: {count} orders
                </div>
              </div>
            ))}
          </div>

          {/* Hour Labels */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>12 AM</span>
            <span>6 AM</span>
            <span>12 PM</span>
            <span>6 PM</span>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-4 text-xs">
            <span className="text-gray-400">Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-gray-800" />
              <div className="w-3 h-3 rounded bg-emerald-900" />
              <div className="w-3 h-3 rounded bg-emerald-700" />
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <div className="w-3 h-3 rounded bg-emerald-400" />
            </div>
            <span className="text-gray-400">More</span>
          </div>
        </>
      )}
    </Card>
  );
}
