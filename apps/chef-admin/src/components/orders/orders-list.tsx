'use client';

import { useState } from 'react';
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
  };
  address?: {
    id: string;
    street_address: string;
    city: string;
  };
}

interface OrdersListProps {
  initialOrders: Order[];
}

export function OrdersList({ initialOrders }: OrdersListProps) {
  const [filter, setFilter] = useState<string>('all');

  const filteredOrders = filter === 'all'
    ? initialOrders
    : initialOrders.filter(o => o.status === filter);

  const handleAccept = async (orderId: string) => {
    console.log('Accept order:', orderId);
  };

  const handleReady = async (orderId: string) => {
    console.log('Mark ready:', orderId);
  };

  const handleReject = async (orderId: string) => {
    console.log('Reject order:', orderId);
  };

  return (
    <>
      <div className="mt-6 flex gap-2">
        {['all', 'pending', 'preparing', 'ready_for_pickup'].map((status) => (
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

                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <>
                      <Button variant="destructive" size="sm" onClick={() => handleReject(order.id)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleAccept(order.id)}>
                        Accept
                      </Button>
                    </>
                  )}
                  {order.status === 'preparing' && (
                    <Button size="sm" onClick={() => handleReady(order.id)}>
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
