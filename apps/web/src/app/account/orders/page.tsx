'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { orderConfirmationPath } from '@/lib/customer-ordering';
import { Card, Badge, Button, NoOrdersEmpty, Spinner } from '@ridendine/ui';

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total: number;
  storefront?: {
    name: string;
    slug: string;
  };
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setOrders(rows);
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
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900">
                      ${Number(order.total).toFixed(2)}
                    </span>
                    <Link href={orderConfirmationPath(order.id)}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
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
