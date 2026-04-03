'use client';

import { Card, Badge, Modal } from '@ridendine/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type Delivery = {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  created_at: string;
  orders?: {
    order_number: string;
    total: number;
  };
  drivers?: {
    first_name: string;
    last_name: string;
  } | null;
};

type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
};

function getDeliveryStatusVariant(
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'picked_up':
    case 'en_route_to_dropoff':
      return 'info';
    case 'assigned':
    case 'accepted':
    case 'en_route_to_pickup':
      return 'warning';
    case 'pending':
      return 'default';
    default:
      return 'default';
  }
}

function formatDeliveryStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [deliveriesRes, driversRes] = await Promise.all([
        fetch('/api/deliveries'),
        fetch('/api/drivers?status=approved'),
      ]);

      const deliveriesData = await deliveriesRes.json();
      const driversData = await driversRes.json();

      const allDeliveries = deliveriesData.data || [];
      setDeliveries(allDeliveries.filter((d: Delivery) => d.driver_id !== null));
      setPendingDeliveries(allDeliveries.filter((d: Delivery) => d.driver_id === null && d.status === 'pending'));
      setDrivers(driversData.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  function openAssignModal(delivery: Delivery) {
    setSelectedDelivery(delivery);
    setSelectedDriverId('');
    setShowAssignModal(true);
  }

  async function handleAssignDriver() {
    if (!selectedDelivery || !selectedDriverId) return;

    setAssigning(true);
    try {
      const response = await fetch('/api/engine/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_assign',
          deliveryId: selectedDelivery.id,
          driverId: selectedDriverId,
        }),
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedDelivery(null);
        setSelectedDriverId('');
        fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to assign driver');
      }
    } catch (error) {
      console.error('Failed to assign driver:', error);
      alert('Failed to assign driver');
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-7xl">
          <div className="text-center text-gray-400">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Delivery Management</h1>
          <p className="mt-2 text-gray-400">Assign drivers and monitor active deliveries</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Deliveries - Need Driver Assignment */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pending Assignment</h2>
              <Badge variant="warning">{pendingDeliveries.length} Pending</Badge>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {pendingDeliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="rounded-lg border border-yellow-500/30 bg-[#1a1a2e] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-white">
                      {delivery.orders?.order_number || 'N/A'}
                    </span>
                    <Badge variant="warning">Needs Driver</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    <span className="text-gray-500">From:</span> {delivery.pickup_address || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-400">
                    <span className="text-gray-500">To:</span> {delivery.dropoff_address || 'N/A'}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-medium text-white">
                      ${((delivery.orders?.total ?? 0) / 100).toFixed(2)}
                    </span>
                    <button
                      onClick={() => openAssignModal(delivery)}
                      className="rounded bg-[#E85D26] px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a]"
                    >
                      Assign Driver
                    </button>
                  </div>
                </div>
              ))}
              {pendingDeliveries.length === 0 && (
                <div className="py-8 text-center text-gray-400">
                  No deliveries pending assignment
                </div>
              )}
            </div>
          </Card>

          {/* Active Deliveries */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Active Deliveries</h2>
              <Badge className="bg-[#E85D26] text-white">{deliveries.length} Active</Badge>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {deliveries.map((delivery) => (
                <Link
                  key={delivery.id}
                  href={`/dashboard/deliveries/${delivery.id}`}
                  className="block rounded-lg border border-gray-800 bg-[#1a1a2e] p-4 transition-colors hover:border-[#E85D26]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-white">
                      {delivery.orders?.order_number || 'N/A'}
                    </span>
                    <Badge variant={getDeliveryStatusVariant(delivery.status)}>
                      {formatDeliveryStatus(delivery.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {delivery.pickup_address} → {delivery.dropoff_address}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-400">Driver: </span>
                      <span className="text-sm font-medium text-white">
                        {delivery.drivers
                          ? `${delivery.drivers.first_name} ${delivery.drivers.last_name}`
                          : 'Unassigned'}
                      </span>
                    </div>
                    <span className="text-sm text-[#E85D26]">View →</span>
                  </div>
                </Link>
              ))}
              {deliveries.length === 0 && (
                <div className="py-8 text-center text-gray-400">No active deliveries</div>
              )}
            </div>
          </Card>
        </div>

        {/* Available Drivers Quick View */}
        <Card className="mt-6 border-gray-800 bg-[#16213e] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Available Drivers</h2>
            <Badge variant="success">{drivers.length} Online</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {drivers.slice(0, 8).map((driver) => (
              <div
                key={driver.id}
                className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E85D26] text-white font-medium">
                    {driver.first_name[0]}{driver.last_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {driver.first_name} {driver.last_name}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-xs text-green-400">Available</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {drivers.length === 0 && (
              <div className="col-span-full py-8 text-center text-gray-400">
                No approved drivers available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Driver Assignment Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Driver"
      >
        <div className="space-y-4">
          {selectedDelivery && (
            <div className="rounded-lg border border-gray-700 bg-[#0d1528] p-4">
              <p className="text-sm text-gray-400">Order</p>
              <p className="font-mono font-medium text-white">
                {selectedDelivery.orders?.order_number}
              </p>
              <p className="mt-2 text-sm text-gray-400">
                {selectedDelivery.pickup_address} → {selectedDelivery.dropoff_address}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Select Driver
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
            >
              <option value="">Choose a driver...</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.first_name} {driver.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignDriver}
              disabled={!selectedDriverId || assigning}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a] disabled:opacity-50"
            >
              {assigning ? 'Assigning...' : 'Assign Driver'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
