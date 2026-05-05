'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { orderConfirmationPath } from '@/lib/customer-ordering';
import { Card, Badge, Button, NoOrdersEmpty, Spinner } from '@ridendine/ui';

interface OrderItem {
  id: string;
  quantity: number;
  menu_item: { id: string; name: string } | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total: number;
  storefront?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  items?: OrderItem[];
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/orders');
        const json = await response.json();
        if (!response.ok || !json.success) {
          setError(json.error || 'Unable to load orders');
          return;
        }
        const rows = (json.data?.orders || []) as Order[];
        // Fetch items for completed/delivered orders to enable reorder
        const enriched = await Promise.all(
          rows.map(async (order) => {
            if (!['delivered', 'completed'].includes(order.status)) return order;
            try {
              const res = await fetch(`/api/orders/${order.id}`);
              if (!res.ok) return order;
              const detail = await res.json();
              return { ...order, items: detail.data?.order?.items ?? [] };
            } catch {
              return order;
            }
          })
        );
        setOrders(enriched);
      } catch (error) {
        console.error('Failed to fetch orders:', error instanceof Error ? error.message : 'unknown');
        setError('Unable to load orders right now');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchOrders();
    }
  }, [user, authLoading]);

  const handleReorder = useCallback(async (order: Order) => {
    if (!order.storefront?.id || !order.items?.length) return;
    setReorderingId(order.id);
    const omitted: string[] = [];

    for (const item of order.items) {
      if (!item.menu_item?.id) continue;
      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storefrontId: order.storefront.id,
            menuItemId: item.menu_item.id,
            quantity: item.quantity,
          }),
        });
        if (!res.ok) {
          omitted.push(item.menu_item.name ?? item.menu_item.id);
        }
      } catch {
        omitted.push(item.menu_item.name ?? item.menu_item.id);
      }
    }

    setReorderingId(null);

    if (omitted.length > 0 && omitted.length < order.items.length) {
      alert(`Some items are no longer available and were skipped:\n• ${omitted.join('\n• ')}`);
    } else if (omitted.length > 0 && omitted.length >= order.items.length) {
      alert('None of the items from this order are currently available.');
      return;
    }

    router.push(`/checkout?storefrontId=${order.storefront.id}`);
  }, [router]);

  const statusVariant = (status: string): 'success' | 'warning' | 'info' | 'default' | 'error' => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      delivered: 'success',
      completed: 'success',
      preparing: 'info',
      accepted: 'info',
      pending: 'warning',
      cancelled: 'error',
    };
    return variants[status] || 'default';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container py-8">
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
          <Link href="/account">
            <Button variant="ghost" size="sm">
              ← Back to Account
            </Button>
          </Link>
        </div>

        {error ? (
          <Card className="mt-8 p-6">
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        ) : orders.length === 0 ? (
          <Card className="mt-8">
            <NoOrdersEmpty />
          </Card>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        #{order.order_number}
                      </span>
                      <Badge variant={statusVariant(order.status)}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                    {order.storefront && (
                      <Link
                        href={`/chefs/${order.storefront.slug}`}
                        className="mt-1 text-sm text-brand-600 hover:text-brand-700"
                      >
                        {order.storefront.name}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      ${Number(order.total).toFixed(2)}
                    </span>
                    <Link href={orderConfirmationPath(order.id)}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {['delivered', 'completed'].includes(order.status) &&
                      order.items &&
                      order.items.length > 0 && (
                        <Button
                          size="sm"
                          disabled={reorderingId === order.id}
                          onClick={() => void handleReorder(order)}
                          className="bg-[#E85D26] text-white hover:bg-[#d44e1e]"
                        >
                          {reorderingId === order.id ? 'Adding...' : 'Reorder'}
                        </Button>
                      )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
