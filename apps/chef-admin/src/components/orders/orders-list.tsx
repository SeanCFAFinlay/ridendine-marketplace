'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, Badge, Button, LiveIndicator, type LiveIndicatorStatus } from '@ridendine/ui';
import { chefStorefrontOrdersChannel, createBrowserClient, parseOrdersRealtimeRow } from '@ridendine/db';
import { OrderToast, type ToastMsg } from './order-toast';

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  tip: number;
  total: number;
  payment_status?: string | null;
  estimated_ready_at?: string | null;
  actual_ready_at?: string | null;
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
    country?: string;
    delivery_instructions?: string | null;
  };
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions?: string | null;
    menu_item?: {
      id?: string;
      name: string;
      description?: string | null;
    } | null;
  }>;
  delivery?: {
    id: string;
    status: string;
    driver_id: string | null;
    driver?: {
      first_name: string;
      last_name: string;
      phone: string | null;
    } | null;
  } | null;
}

interface OrdersListProps {
  initialOrders: Order[];
  storefrontId: string;
}

const ACCEPT_TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatStatus(status: string | null | undefined) {
  return status ? status.replace(/_/g, ' ') : 'not recorded';
}

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
    return <span className="text-danger font-medium">Expired</span>;
  }

  return (
    <span className={`font-mono font-bold ${isUrgent ? 'text-danger animate-pulse' : 'text-primary'}`}>
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

export function OrdersList({ initialOrders, storefrontId }: OrdersListProps) {
  const [filter, setFilter] = useState<string>('all');
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playSound, setPlaySound] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<LiveIndicatorStatus>('connecting');

  const addToast = useCallback((message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const supabase = useMemo(() => createBrowserClient(), []);

  // Subscribe to real-time updates (scoped to this storefront — RLS + client filter)
  useEffect(() => {
    if (!supabase || !storefrontId) return;

    const db = supabase;
    const filter = `storefront_id=eq.${storefrontId}`;
    const channel = db
      .channel(chefStorefrontOrdersChannel(storefrontId))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter },
        (payload) => {
          const hydrateOrder = async (orderId: string) => {
            try {
              const response = await fetch(`/api/orders/${orderId}`);
              if (!response.ok) return null;
              const json = await response.json();
              return json.data?.order ?? json.order ?? null;
            } catch {
              return null;
            }
          };

          if (payload.eventType === 'INSERT') {
            const row = parseOrdersRealtimeRow(payload.new);
            if (!row || row.storefront_id !== storefrontId) return;
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
            hydrateOrder(newOrder.id).then((fullOrder) => {
              if (!fullOrder) return;
              setOrders((prev) => prev.map((order) => order.id === fullOrder.id ? fullOrder : order));
            });
            setPlaySound(true);
            const orderNum = (payload.new as Order).order_number ?? '';
            const customer = (payload.new as Order).customer;
            const customerName = customer
              ? `${customer.first_name} ${customer.last_name}`
              : 'a customer';
            addToast(`New order ${orderNum} from ${customerName}`);
          } else if (payload.eventType === 'UPDATE') {
            const row = parseOrdersRealtimeRow(payload.new);
            if (!row || row.storefront_id !== storefrontId) return;
            const updatedOrder = payload.new as Order;
            setOrders((prev) =>
              prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
            );
            hydrateOrder(updatedOrder.id).then((fullOrder) => {
              if (!fullOrder) return;
              setOrders((prev) => prev.map((order) => order.id === fullOrder.id ? { ...order, ...fullOrder } : order));
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        } else {
          setRealtimeStatus('connecting');
        }
      });

    return () => {
      db.removeChannel(channel);
    };
  }, [supabase, storefrontId, addToast]);

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
      } catch {
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
    // Auto-reject timed-out orders using the protected API action contract.
    await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reject',
        reason: 'other',
        notes: 'Auto-rejected after acceptance timeout',
      }),
    });
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'rejected' } : o))
    );
  }, []);

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(o => o.status === filter);

  const updateOrderStatus = async (
    orderId: string,
    payload: { action?: string; status?: string; reason?: string; notes?: string }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order');
      }

      const json = await response.json();
      const updatedOrder =
        json.data?.order ??
        json.data?.updatedOrder ??
        json.order ??
        json.updatedOrder ??
        null;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? updatedOrder
              ? { ...o, ...updatedOrder }
              : payload.status
                ? { ...o, status: payload.status }
                : o
            : o
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (orderId: string) => {
    await updateOrderStatus(orderId, { action: 'accept', status: 'accepted' });
  };

  const handlePreparing = async (orderId: string) => {
    await updateOrderStatus(orderId, {
      action: 'start_preparing',
      status: 'preparing',
    });
  };

  const handleReady = async (orderId: string) => {
    await updateOrderStatus(orderId, {
      action: 'mark_ready',
      status: 'ready_for_pickup',
    });
  };

  const handleReject = async (orderId: string) => {
    await updateOrderStatus(orderId, {
      action: 'reject',
      status: 'rejected',
      reason: 'other',
      notes: 'Rejected by chef',
    });
  };

  return (
    <>
      <OrderToast toasts={toasts} onDismiss={dismissToast} />
      {error && (
        <div className="mb-4 rounded-lg bg-dangerSoft p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <LiveIndicator status={realtimeStatus} />
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
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
            <p className="py-8 text-center text-sm text-textMuted">
              No {filter === 'all' ? '' : filter.replace(/_/g, ' ')} orders
            </p>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className={order.status === 'pending' ? 'border-2 border-primary/40 shadow-lg' : ''}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text">{order.order_number}</span>
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
                      <div className="flex items-center gap-1 rounded-full bg-primarySoft px-2 py-1 text-xs">
                        <span className="text-primary">Accept in:</span>
                        <CountdownTimer
                          createdAt={order.created_at}
                          onExpire={() => handleOrderExpire(order.id)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-lg border border-divider bg-surfaceMuted p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Customer</p>
                      {order.customer ? (
                        <div className="mt-1 text-sm text-text">
                          <p className="font-medium text-text">{order.customer.first_name} {order.customer.last_name}</p>
                          <p>{order.customer.phone || 'No phone'}</p>
                          {order.customer.email ? <p>{order.customer.email}</p> : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-textMuted">Customer not linked</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-divider bg-surfaceMuted p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Delivery</p>
                      {order.address ? (
                        <div className="mt-1 text-sm text-text">
                          <p className="font-medium text-text">{order.address.address_line1}</p>
                          {order.address.address_line2 ? <p>{order.address.address_line2}</p> : null}
                          <p>{order.address.city}, {order.address.state} {order.address.postal_code}</p>
                          {order.address.delivery_instructions ? <p className="mt-1 italic">{order.address.delivery_instructions}</p> : null}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-textMuted">Delivery address not linked</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-divider bg-surfaceMuted p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">Payment & Ops</p>
                      <div className="mt-1 text-sm text-text">
                        <p><span className="font-medium text-text">{money(order.total)}</span> total</p>
                        <p>Payment: {formatStatus(order.payment_status)}</p>
                        <p>Delivery: {formatStatus(order.delivery?.status)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-lg border border-divider">
                    <div className="grid grid-cols-[1fr_54px_80px] bg-surfaceMuted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-textMuted">
                      <span>Kitchen ticket</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Line</span>
                    </div>
                    {(order.items ?? []).length > 0 ? (
                      (order.items ?? []).map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_54px_80px] border-t border-divider px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-text">{item.menu_item?.name || 'Unknown item'}</p>
                            {item.special_instructions ? (
                              <p className="mt-0.5 text-xs italic text-primary">Item note: {item.special_instructions}</p>
                            ) : null}
                          </div>
                          <span className="text-center font-semibold text-text">{item.quantity}</span>
                          <span className="text-right text-text">{money(item.total_price)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="border-t border-divider px-3 py-3 text-sm text-textMuted">
                        No line items are attached to this order yet.
                      </div>
                    )}
                  </div>

                  {order.special_instructions && (
                    <p className="mt-2 text-sm italic text-textMuted">
                      Note: {order.special_instructions}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-textMuted">
                    <span>Subtotal {money(order.subtotal)}</span>
                    <span>Delivery {money(order.delivery_fee)}</span>
                    <span>Service {money(order.service_fee)}</span>
                    <span>Tax {money(order.tax)}</span>
                    <span>Tip {money(order.tip)}</span>
                    <span>Created {new Date(order.created_at).toLocaleString()}</span>
                    {order.estimated_ready_at ? <span>ETA {new Date(order.estimated_ready_at).toLocaleTimeString()}</span> : null}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="inline-flex min-h-9 items-center rounded-lg border border-borderStrong px-3 text-sm font-medium text-text hover:bg-surfaceMuted"
                  >
                    Full Details
                  </Link>
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
