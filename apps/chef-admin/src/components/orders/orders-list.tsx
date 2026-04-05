'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';
import { createBrowserClient } from '@ridendine/db';

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
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state?: string;
    postal_code?: string;
  };
}

interface OrdersListProps {
  initialOrders: Order[];
}

const ACCEPT_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes

function CountdownTimer({ createdAt, onExpire }: { createdAt: string; onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const orderTime = new Date(createdAt).getTime();
    const deadline = orderTime + ACCEPT_TIMEOUT_MS;

    const updateTimer = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        onExpire();
      } else {
        setTimeLeft(remaining);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [createdAt, onExpire]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  const isUrgent = timeLeft < 2 * 60 * 1000; // Less than 2 minutes

  if (timeLeft <= 0) {
    return <span className="text-red-600 font-medium">Expired</span>;
  }

  return (
    <span className={`font-mono font-bold ${isUrgent ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

export function OrdersList({ initialOrders }: OrdersListProps) {
  const [filter, setFilter] = useState<string>('all');
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playSound, setPlaySound] = useState(false);

  const supabase = useMemo(() => createBrowserClient(), []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!supabase) return;

    const db = supabase;
    const channel = db
      .channel('chef-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
            setPlaySound(true);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
            );
          }
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [supabase]);

  // Play notification sound for new orders
  useEffect(() => {
    if (playSound) {
      // Gracefully handle audio notification
      // Sound file can be added to public/sounds/new-order.mp3 when available
      try {
        const audio = new Audio('/sounds/new-order.mp3');
        audio.play().catch(() => {
          // Silent fail if audio file not found or autoplay blocked
          console.debug('Audio notification unavailable');
        });
      } catch (error) {
        // Silent fail if Audio API not available
        console.debug('Audio API unavailable');
      }
      setPlaySound(false);
    }
  }, [playSound]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const handleOrderExpire = useCallback(async (orderId: string) => {
    // Auto-reject expired orders
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'expired' }),
    });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'expired' } : o))
    );
  }, []);

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
            <Card key={order.id} className={order.status === 'pending' ? 'border-2 border-orange-400 shadow-lg' : ''}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{order.order_number}</span>
                    <Badge
                      variant={
                        order.status === 'pending' ? 'warning' :
                        order.status === 'accepted' ? 'info' :
                        order.status === 'preparing' ? 'info' :
                        order.status === 'ready_for_pickup' ? 'success' :
                        order.status === 'expired' ? 'error' : 'default'
                      }
                    >
                      {order.status.replace(/_/g, ' ')}
                    </Badge>
                    {order.status === 'pending' && (
                      <div className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs">
                        <span className="text-orange-800">Accept in:</span>
                        <CountdownTimer
                          createdAt={order.created_at}
                          onExpire={() => handleOrderExpire(order.id)}
                        />
                      </div>
                    )}
                  </div>
                  {order.customer && (
                    <p className="mt-1 text-sm text-gray-600">
                      {order.customer.first_name} {order.customer.last_name}
                      {order.customer.phone && ` • ${order.customer.phone}`}
                    </p>
                  )}
                  {order.address && (
                    <p className="text-sm text-gray-500">
                      {order.address.address_line1}, {order.address.city}
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
