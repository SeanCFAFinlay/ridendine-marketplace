'use client';

export const dynamic = 'force-dynamic';

import { Card, Badge, Button } from '@ridendine/ui';

const orders = [
  { id: '1', number: 'RD-ABC123', chef: "Maria's Kitchen", customer: 'John D.', status: 'preparing', total: 45.99, time: '12:30 PM' },
  { id: '2', number: 'RD-DEF456', chef: 'Thai Home', customer: 'Sarah M.', status: 'pending', total: 32.50, time: '12:45 PM' },
  { id: '3', number: 'RD-GHI789', chef: "Nonna's Table", customer: 'Mike R.', status: 'in_transit', total: 28.00, time: '1:00 PM' },
  { id: '4', number: 'RD-JKL012', chef: 'Soul Kitchen', customer: 'Lisa K.', status: 'delivered', total: 52.00, time: '11:30 AM' },
];

export default function OrdersPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Order Overview</h1>
            <p className="mt-1 text-gray-400">Monitor all platform orders</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Export</Button>
            <Button variant="outline" size="sm">Filter</Button>
          </div>
        </div>

        <Card className="mt-8 bg-gray-800 border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Chef</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Time</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-700/50">
                    <td className="py-3 font-medium text-white">{order.number}</td>
                    <td className="py-3 text-gray-300">{order.chef}</td>
                    <td className="py-3 text-gray-300">{order.customer}</td>
                    <td className="py-3">
                      <Badge
                        variant={
                          order.status === 'delivered' ? 'success' :
                          order.status === 'in_transit' ? 'primary' :
                          order.status === 'preparing' ? 'info' :
                          'warning'
                        }
                      >
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-300">${order.total.toFixed(2)}</td>
                    <td className="py-3 text-gray-400">{order.time}</td>
                    <td className="py-3">
                      <Button variant="ghost" size="sm">View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
