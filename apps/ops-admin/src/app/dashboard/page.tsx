import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';

const stats = [
  { label: 'Active Orders', value: '47', change: '+12% from yesterday', color: 'text-blue-400' },
  { label: 'Active Deliveries', value: '23', change: '15 drivers online', color: 'text-green-400' },
  { label: 'Pending Chef Approvals', value: '8', change: '3 new today', color: 'text-yellow-400' },
  { label: 'Open Support Tickets', value: '5', change: '2 high priority', color: 'text-red-400' },
];

const quickActions = [
  { href: '/dashboard/chefs/approvals', label: 'Chef Approvals', count: 8 },
  { href: '/dashboard/orders', label: 'Order Overview', count: 47 },
  { href: '/dashboard/deliveries', label: 'Delivery Map', count: 23 },
  { href: '/dashboard/support', label: 'Support Queue', count: 5 },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
            <p className="mt-1 text-gray-400">Real-time platform overview</p>
          </div>
          <Badge variant="success">All Systems Operational</Badge>
        </div>

        {/* Stats Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-gray-800 border-gray-700">
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.change}</p>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{action.label}</span>
                  <Badge variant="default">{action.count}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent Activity */}
        <Card className="mt-8 bg-gray-800 border-gray-700">
          <h2 className="font-semibold text-white">Recent Activity</h2>
          <div className="mt-4 space-y-3">
            {[
              { time: '2 min ago', event: 'Order #RD-ABC123 delivered', type: 'success' },
              { time: '5 min ago', event: 'New chef application: Thai Kitchen', type: 'info' },
              { time: '12 min ago', event: 'Driver John went offline', type: 'warning' },
              { time: '15 min ago', event: 'Support ticket #45 resolved', type: 'success' },
              { time: '20 min ago', event: 'Order #RD-XYZ789 cancelled by customer', type: 'error' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-20">{activity.time}</span>
                <Badge
                  variant={
                    activity.type === 'success' ? 'success' :
                    activity.type === 'warning' ? 'warning' :
                    activity.type === 'error' ? 'error' : 'info'
                  }
                  className="w-16 justify-center"
                >
                  {activity.type}
                </Badge>
                <span className="text-gray-300">{activity.event}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
