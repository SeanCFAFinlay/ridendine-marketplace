'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, Badge } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';
import Link from 'next/link';

interface Alert {
  id: string;
  type: 'urgent' | 'warning' | 'info';
  title: string;
  message: string;
  link?: string;
  time: string;
}

interface AlertsPanelProps {
  pendingApprovals: number;
}

export function AlertsPanel({ pendingApprovals }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      // Still show pending approvals alert even without supabase connection
      if (pendingApprovals > 0) {
        setAlerts([{
          id: 'pending-approvals',
          type: 'urgent',
          title: `${pendingApprovals} Chef Approval${pendingApprovals > 1 ? 's' : ''} Pending`,
          message: 'Review and approve new chef applications',
          link: '/dashboard/chefs/approvals',
          time: 'Now',
        }]);
      }
      setLoading(false);
      return;
    }

    // Capture supabase in closure for TypeScript
    const db = supabase;

    async function fetchAlerts() {
      const generatedAlerts: Alert[] = [];

      // Check for pending approvals
      if (pendingApprovals > 0) {
        generatedAlerts.push({
          id: 'pending-approvals',
          type: 'urgent',
          title: `${pendingApprovals} Chef Approval${pendingApprovals > 1 ? 's' : ''} Pending`,
          message: 'Review and approve new chef applications',
          link: '/dashboard/chefs/approvals',
          time: 'Now',
        });
      }

      // Check for stuck deliveries (longer than 60 min)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: stuckDeliveries } = await db
        .from('deliveries')
        .select('id', { count: 'exact', head: true })
        .in('status', ['assigned', 'accepted', 'en_route_to_pickup'])
        .lt('created_at', hourAgo);

      if (stuckDeliveries && (stuckDeliveries as any).count > 0) {
        generatedAlerts.push({
          id: 'stuck-deliveries',
          type: 'warning',
          title: `${(stuckDeliveries as any).count} Delayed Deliveries`,
          message: 'Some deliveries have been in progress for over 60 minutes',
          link: '/dashboard/deliveries',
          time: '1h+',
        });
      }

      // Check driver availability
      const { count: onlineDrivers } = await db
        .from('driver_presence')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

      if ((onlineDrivers || 0) < 3) {
        generatedAlerts.push({
          id: 'low-drivers',
          type: 'warning',
          title: 'Low Driver Availability',
          message: `Only ${onlineDrivers || 0} driver${onlineDrivers === 1 ? '' : 's'} online`,
          link: '/dashboard/drivers',
          time: 'Now',
        });
      }

      // Check for unassigned orders
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count: unassignedOrders } = await db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ready_for_pickup')
        .is('driver_id', null)
        .lt('created_at', tenMinutesAgo);

      if ((unassignedOrders || 0) > 0) {
        generatedAlerts.push({
          id: 'unassigned-orders',
          type: 'urgent',
          title: `${unassignedOrders} Unassigned Orders`,
          message: 'Orders waiting for driver assignment over 10 minutes',
          link: '/dashboard/deliveries',
          time: '10m+',
        });
      }

      // Check for low-rated deliveries today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: lowRatings } = await db
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .lte('rating', 2)
        .gte('created_at', today.toISOString());

      if ((lowRatings || 0) > 0) {
        generatedAlerts.push({
          id: 'low-ratings',
          type: 'info',
          title: `${lowRatings} Low Rating${(lowRatings || 0) > 1 ? 's' : ''} Today`,
          message: 'Some customers left negative reviews',
          time: 'Today',
        });
      }

      setAlerts(generatedAlerts);
      setLoading(false);
    }

    fetchAlerts();

    // Refresh every minute
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [pendingApprovals, supabase]);

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'border-l-red-500 bg-red-500/10';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/10';
      default:
        return 'border-l-blue-500 bg-blue-500/10';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Card className="border-gray-800 bg-opsPanel p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">System Alerts</h3>
        {alerts.filter((a) => a.type === 'urgent').length > 0 && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E85D26] border-t-transparent" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-gray-400">All systems normal</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border-l-4 ${getAlertStyles(alert.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white text-sm truncate">{alert.title}</p>
                    <Badge variant={getBadgeVariant(alert.type) as any} className="text-xs">
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                </div>
                <span className="text-xs text-gray-500 ml-2">{alert.time}</span>
              </div>
              {alert.link && (
                <Link
                  href={alert.link}
                  className="inline-block mt-2 text-xs text-[#E85D26] hover:underline"
                >
                  View details →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
