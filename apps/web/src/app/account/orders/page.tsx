'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, Badge, Button, NoOrdersEmpty } from '@ridendine/ui';
import { formatDate, formatCurrencyFromDollars } from '@ridendine/utils';

// Placeholder data
const orders = [
  {
    id: '1',
    orderNumber: 'RD-ABC123',
    status: 'delivered',
    createdAt: '2024-01-15T12:30:00Z',
    total: 45.99,
    storefront: {
      name: "Maria's Kitchen",
      slug: 'chef-maria',
    },
    itemsSummary: '2 items',
  },
  {
    id: '2',
    orderNumber: 'RD-DEF456',
    status: 'preparing',
    createdAt: '2024-01-18T18:00:00Z',
    total: 32.50,
    storefront: {
      name: 'Thai Home Cooking',
      slug: 'thai-home',
    },
    itemsSummary: '3 items',
  },
];

export default function OrdersPage() {
  const statusVariant = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
      delivered: 'success',
      preparing: 'info',
      pending: 'warning',
    };
    return variants[status] || 'default';
  };

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
                        {order.orderNumber}
                      </span>
                      <Badge variant={statusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(order.createdAt)} • {order.itemsSummary}
                    </p>
                    <Link
                      href={`/chefs/${order.storefront.slug}`}
                      className="mt-1 text-sm text-brand-600 hover:text-brand-700"
                    >
                      {order.storefront.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-gray-900">
                      {formatCurrencyFromDollars(order.total)}
                    </span>
                    <Link href={`/account/orders/${order.id}`}>
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
