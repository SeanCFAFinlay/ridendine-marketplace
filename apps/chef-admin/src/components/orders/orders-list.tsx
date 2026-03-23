'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  special_instructions: string | null;
  created_at: string;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email?: string;
  };
  address?: {
    id: string;
    street_address: string;
    city: string;
    state?: string;
    postal_code?: string;
  };
}

interface OrdersListProps {
  initialOrders: Order[];
}

export function OrdersList({ initialOrders }: OrdersListProps) {
  const [filter, setFilter] = useState<string>('all');
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order');
      }

      const { order: updatedOrder } = await response.json();
      setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    await updateOrderStatus(orderId, 'accepted');
  };

  const handlePreparing = async (orderId: string) => {
    await updateOrderStatus(orderId, 'preparing');
  };

  const handleReady = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready_for_pickup');
  };

  const handleReject = async (orderId: string) => {
    await updateOrderStatus(orderId, 'rejected');
  };

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-6 flex gap-2 flex-wrap">
        {['all', 'pending', 'accepted', 'preparing', 'ready_for_pickup'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-sm text-gray-500">
              No {filter === 'all' ? '' : filter.replace(/_/g, ' ')} orders
            </p>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{order.order_number}</span>
                    <Badge
                      variant={
                        order.status === 'pending' ? 'warning' :
                        order.status === 'accepted' ? 'info' :
                        order.status === 'preparing' ? 'info' :
                        order.status === 'ready_for_pickup' ? 'success' : 'default'
                      }
                    >
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  {order.customer && (
                    <p className="mt-1 text-sm text-gray-600">
                      {order.customer.first_name} {order.customer.last_name}
                      {order.customer.phone && ` • ${order.customer.phone}`}
                    </p>
                  )}
                  {order.address && (
                    <p className="text-sm text-gray-500">
                      {order.address.street_address}, {order.address.city}
                    </p>
                  )}
                  {order.special_instructions && (
                    <p className="mt-2 text-sm italic text-gray-600">
                      Note: {order.special_instructions}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    ${order.total.toFixed(2)} • {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  {order.status === 'pending' && (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(order.id)}
                        disabled={loading}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(order.id)}
                        disabled={loading}
                      >
                        Accept
                      </Button>
                    </>
                  )}
                  {order.status === 'accepted' && (
                    <Button
                      size="sm"
                      onClick={() => handlePreparing(order.id)}
                      disabled={loading}
                    >
                      Start Preparing
                    </Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button
                      size="sm"
                      onClick={() => handleReady(order.id)}
                      disabled={loading}
                    >
                      Mark Ready
                    </Button>
                  )}
                  {order.status === 'ready_for_pickup' && (
                    <Badge variant="success">Waiting for driver</Badge>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
