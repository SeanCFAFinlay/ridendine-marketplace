'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';
import { opsOrdersChannel, parseOrdersRealtimeRow } from '@ridendine/db';

interface RealtimeOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
}

export function RealTimeStats() {
  const [recentOrders, setRecentOrders] = useState<RealtimeOrder[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const db = supabase;

    // Fetch initial data
    async function fetchInitial() {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data } = await db
        .from('orders')
        .select('id, order_number, total, status, created_at')
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const parsed = (data as RealtimeOrder[])
          .map((row) => parseOrdersRealtimeRow(row))
          .filter((o): o is NonNullable<typeof o> => o !== null);
        setRecentOrders(parsed);
      }
    }

    void fetchInitial();

    // Subscribe to new orders
    const channel = db
      .channel(opsOrdersChannel())
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = parseOrdersRealtimeRow(payload.new);
          if (!newOrder) return;
          setRecentOrders((prev) => [newOrder, ...prev.slice(0, 9)]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = parseOrdersRealtimeRow(payload.new);
          if (!updatedOrder) return;
          setRecentOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      db.removeChannel(channel);
    };
  }, [supabase]);

  const currentRevenue = recentOrders.reduce((sum, o) => sum + o.total, 0);
  const ordersPerMinute = recentOrders.length / 5;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning';
      case 'accepted': return 'bg-info';
      case 'preparing': return 'bg-info';
      case 'ready_for_pickup': return 'bg-infoSoft0';
      case 'delivered': return 'bg-success';
      case 'cancelled': return 'bg-danger';
      default: return 'bg-surfaceMuted';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isConnected && !supabase) {
    return (
      <Card className="border-border bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Real-Time Activity</h3>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-warning">Offline</span>
          </div>
        </div>
        <div className="py-8 text-center">
          <p className="text-textMuted">Real-time updates unavailable</p>
          <p className="text-textMuted text-sm mt-1">Data shown is from server fetch</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Real-Time Activity</h3>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-textMuted">Orders/min: </span>
            <span className="text-success font-mono">{ordersPerMinute.toFixed(1)}</span>
          </div>
          <div>
            <span className="text-textMuted">5min Revenue: </span>
            <span className="text-success font-mono">${currentRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {recentOrders.length === 0 ? (
          <p className="text-textMuted text-center py-4">Waiting for new orders...</p>
        ) : (
          recentOrders.map((order, index) => (
            <div
              key={order.id}
              className={`flex items-center justify-between p-3 rounded-lg bg-surface ${
                index === 0 ? 'animate-pulse ring-1 ring-success' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${getStatusColor(order.status)}`} />
                <span className="font-mono text-white">{order.order_number}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-success font-medium">${order.total.toFixed(2)}</span>
                <span className="text-textMuted text-xs">{formatTime(order.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
