import { Card, Badge } from '@ridendine/ui';

export const dynamic = 'force-dynamic';

// Placeholder stats
const stats = [
  { label: 'Active Orders', value: '5', change: '+2 from yesterday' },
  { label: "Today's Revenue", value: '$342.50', change: '+12% from yesterday' },
  { label: 'Total Orders (Month)', value: '127', change: '+8% from last month' },
  { label: 'Average Rating', value: '4.8', change: '124 reviews' },
];

const recentOrders = [
  { id: '1', number: 'RD-ABC123', customer: 'John D.', status: 'preparing', total: 45.99, time: '12:30 PM' },
  { id: '2', number: 'RD-DEF456', customer: 'Sarah M.', status: 'pending', total: 32.50, time: '12:45 PM' },
  { id: '3', number: 'RD-GHI789', customer: 'Mike R.', status: 'ready_for_pickup', total: 28.00, time: '1:00 PM' },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">Welcome back! Here&apos;s what&apos;s happening today.</p>

      {/* Stats Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-400">{stat.change}</p>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <a href="/dashboard/orders" className="text-sm text-brand-600 hover:text-brand-700">
            View all →
          </a>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                <th className="pb-3 font-medium">Order</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-50">
                  <td className="py-3 font-medium text-gray-900">{order.number}</td>
                  <td className="py-3 text-gray-600">{order.customer}</td>
                  <td className="py-3">
                    <Badge
                      variant={
                        order.status === 'preparing' ? 'info' :
                        order.status === 'pending' ? 'warning' :
                        order.status === 'ready_for_pickup' ? 'success' : 'default'
                      }
                    >
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 text-gray-900">${order.total.toFixed(2)}</td>
                  <td className="py-3 text-gray-500">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
