'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';

const orders = [
  { id: '1', number: 'RD-ABC123', customer: 'John Doe', phone: '(555) 123-4567', status: 'pending', total: 45.99, items: 3, createdAt: '2024-01-18T12:30:00Z', address: '123 Main St' },
  { id: '2', number: 'RD-DEF456', customer: 'Sarah Miller', phone: '(555) 234-5678', status: 'preparing', total: 32.50, items: 2, createdAt: '2024-01-18T12:45:00Z', address: '456 Oak Ave' },
  { id: '3', number: 'RD-GHI789', customer: 'Mike Roberts', phone: '(555) 345-6789', status: 'ready_for_pickup', total: 28.00, items: 1, createdAt: '2024-01-18T13:00:00Z', address: '789 Pine Rd' },
];

export default function OrdersPage() {
  const [filter, setFilter] = useState<string>('all');

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const handleAccept = (orderId: string) => {
    console.log('Accept order:', orderId);
  };

  const handleReady = (orderId: string) => {
    console.log('Mark ready:', orderId);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-gray-500">Manage incoming and active orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-2">
        {['all', 'pending', 'preparing', 'ready_for_pickup'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Orders List */}
      <div className="mt-6 space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{order.number}</span>
                  <Badge
                    variant={
                      order.status === 'pending' ? 'warning' :
                      order.status === 'preparing' ? 'info' :
                      order.status === 'ready_for_pickup' ? 'success' : 'default'
                    }
                  >
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {order.customer} • {order.phone}
                </p>
                <p className="text-sm text-gray-500">{order.address}</p>
                <p className="mt-2 text-sm text-gray-500">
                  {order.items} item(s) • ${order.total.toFixed(2)}
                </p>
              </div>

              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <>
                    <Button variant="destructive" size="sm">Reject</Button>
                    <Button size="sm" onClick={() => handleAccept(order.id)}>Accept</Button>
                  </>
                )}
                {order.status === 'preparing' && (
                  <Button size="sm" onClick={() => handleReady(order.id)}>Mark Ready</Button>
                )}
                {order.status === 'ready_for_pickup' && (
                  <Badge variant="success">Waiting for driver</Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
