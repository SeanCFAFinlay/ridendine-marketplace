'use client';

import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  storefront_id: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  total: number;
  created_at: string;
  chef_storefronts?: {
    name: string;
  };
};

function getStatusVariant(
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'preparing':
    case 'ready':
      return 'info';
    case 'accepted':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const response = await fetch('/api/orders');
      const result = await response.json();
      const payload = result?.data;
      const items = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : [];
      setOrders(items);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    const statusToAction: Record<string, string> = {
      accepted: 'accept',
      preparing: 'start_preparing',
      ready: 'mark_ready',
      cancelled: 'cancel',
    };

    const action = statusToAction[newStatus];
    if (!action) {
      return;
    }

    try {
      const response = await fetch(`/api/engine/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'cancel'
            ? { action, reason: 'ops_override', notes: 'Cancelled from order management list' }
            : { action }
        ),
      });

      if (response.ok) {
        fetchOrders();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Failed to update order:', error);
    }
  }

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered' || o.status === 'completed').length,
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Order Management</h1>
            <p className="mt-2 text-gray-400">Monitor and manage all platform orders</p>
          </div>
          <Badge className="bg-[#E85D26] text-white">{orders.length} Total Orders</Badge>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'pending', label: 'Pending' },
            { key: 'accepted', label: 'Accepted' },
            { key: 'preparing', label: 'Preparing' },
            { key: 'ready', label: 'Ready' },
            { key: 'delivered', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-[#E85D26] text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.label} ({statusCounts[tab.key as keyof typeof statusCounts] || 0})
            </button>
          ))}
        </div>

        <Card className="border-gray-800 bg-opsPanel">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                  <th className="pb-4 pl-6 font-medium">Order Number</th>
                  <th className="pb-4 font-medium">Chef Storefront</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Total</th>
                  <th className="pb-4 font-medium">Created</th>
                  <th className="pb-4 pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-800/50">
                    <td className="py-4 pl-6 font-mono font-medium text-white">
                      {order.order_number}
                    </td>
                    <td className="py-4 text-gray-300">
                      {order.chef_storefronts?.name ?? 'N/A'}
                    </td>
                    <td className="py-4">
                      <Badge variant={getStatusVariant(order.status)}>
                        {formatStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="py-4 font-medium text-white">
                      ${Number(order.total).toFixed(2)}
                    </td>
                    <td className="py-4 text-gray-400">
                      {new Date(order.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="rounded bg-[#E85D26] px-3 py-1 text-xs text-white transition-colors hover:bg-[#d54d1a]"
                        >
                          View
                        </Link>
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(order.id, 'accepted')}
                              className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleStatusChange(order.id, 'cancelled')}
                              className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-500"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {order.status === 'accepted' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'preparing')}
                            className="rounded bg-blue-600 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-500"
                          >
                            Start Prep
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => handleStatusChange(order.id, 'ready')}
                            className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500"
                          >
                            Mark Ready
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                No orders found {filter !== 'all' && `with status "${filter}"`}
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
