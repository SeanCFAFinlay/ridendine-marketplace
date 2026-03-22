'use client';

import { Card, Badge, Button } from '@ridendine/ui';

const activeDeliveries = [
  { id: '1', order: 'RD-ABC123', driver: 'Carlos M.', status: 'en_route_to_pickup', pickup: "Maria's Kitchen", dropoff: '123 Main St', eta: '5 min' },
  { id: '2', order: 'RD-DEF456', driver: 'Ahmed K.', status: 'picked_up', pickup: 'Thai Home', dropoff: '456 Oak Ave', eta: '12 min' },
  { id: '3', order: 'RD-GHI789', driver: 'Jessica L.', status: 'en_route_to_dropoff', pickup: "Nonna's Table", dropoff: '789 Pine Rd', eta: '3 min' },
];

const onlineDrivers = [
  { id: 'd1', name: 'Carlos Martinez', status: 'busy', deliveries: 1, earnings: 45.50 },
  { id: 'd2', name: 'Ahmed Khan', status: 'busy', deliveries: 2, earnings: 72.00 },
  { id: 'd3', name: 'Jessica Lee', status: 'busy', deliveries: 3, earnings: 98.25 },
  { id: 'd4', name: 'David Chen', status: 'available', deliveries: 0, earnings: 0 },
  { id: 'd5', name: 'Maria Santos', status: 'available', deliveries: 1, earnings: 28.00 },
];

export default function DeliveriesPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Delivery Overview</h1>
          <p className="mt-1 text-gray-400">Monitor active deliveries and driver status</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Active Deliveries */}
          <Card className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Active Deliveries</h2>
              <Badge variant="info">{activeDeliveries.length} active</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {activeDeliveries.map((delivery) => (
                <div key={delivery.id} className="rounded-lg border border-gray-700 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{delivery.order}</span>
                    <Badge
                      variant={
                        delivery.status === 'picked_up' ? 'success' :
                        delivery.status === 'en_route_to_dropoff' ? 'primary' : 'info'
                      }
                    >
                      {delivery.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    Driver: {delivery.driver}
                  </p>
                  <p className="text-sm text-gray-500">
                    {delivery.pickup} → {delivery.dropoff}
                  </p>
                  <p className="text-sm text-green-400">ETA: {delivery.eta}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Online Drivers */}
          <Card className="bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Online Drivers</h2>
              <Badge variant="success">{onlineDrivers.length} online</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {onlineDrivers.map((driver) => (
                <div key={driver.id} className="flex items-center justify-between rounded-lg border border-gray-700 p-3">
                  <div>
                    <p className="font-medium text-white">{driver.name}</p>
                    <p className="text-sm text-gray-400">
                      {driver.deliveries} deliveries today • ${driver.earnings.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant={driver.status === 'available' ? 'success' : 'warning'}>
                    {driver.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Map Placeholder */}
        <Card className="mt-6 bg-gray-800 border-gray-700">
          <h2 className="font-semibold text-white">Live Map</h2>
          <div className="mt-4 flex h-64 items-center justify-center rounded-lg bg-gray-700">
            <p className="text-gray-400">Map integration placeholder</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
