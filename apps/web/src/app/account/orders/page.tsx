'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@ridendine/auth';
import { createBrowserClient } from '@ridendine/db';
import { Header } from '@/components/layout/header';
import { Card, Badge, Button, NoOrdersEmpty, Spinner } from '@ridendine/ui';

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total: number;
  storefront_id: string;
  chef_storefronts?: {
    name: string;
    slug: string;
  };
}

interface CustomerProfileRow {
  id: string;
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setLoading(false);
        return;
      }

      const supabase = createBrowserClient();
      if (!supabase) return;

      try {
        // Get customer profile
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        const typedCustomer = customer as CustomerProfileRow | null;

        if (!typedCustomer) {
          setLoading(false);
          return;
        }

        // Get orders with storefront info
        const { data: ordersData } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            status,
            created_at,
            total,
            storefront_id,
            chef_storefronts (
              name,
              slug
            )
          `)
          .eq('customer_id', typedCustomer.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (ordersData) {
          setOrders(ordersData as Order[]);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
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

        {orders.length === 0 ? (
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
                    {order.chef_storefronts && (
                      <Link
                        href={`/chefs/${order.chef_storefronts.slug}`}
                        className="mt-1 text-sm text-brand-600 hover:text-brand-700"
                      >
                        {order.chef_storefronts.name}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900">
                      ${Number(order.total).toFixed(2)}
                    </span>
                    <Link href={`/order-confirmation/${order.id}`}>
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
