'use client';

import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  vehicle_type: string | null;
  created_at: string;
};

function getStatusVariant(
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
    case 'suspended':
      return 'error';
    default:
      return 'default';
  }
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      const response = await fetch('/api/drivers');
      const result = await response.json();
      setDrivers(result.data || []);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const response = await fetch(`/api/drivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const result = await response.json();
        alert(result.error?.message || result.error || 'Failed to update driver');
        return;
      }
      fetchDrivers();
    } catch (error) {
      console.error('Failed to update driver:', error);
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Drivers</h1>
            <p className="mt-2 text-gray-400">Oversee real driver records, approval state, and availability.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/api/export?type=drivers" className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">Export CSV</a>
            <Badge className="bg-[#E85D26] text-white">{drivers.length} Drivers</Badge>
          </div>
        </div>

        <Card className="border-gray-800 bg-[#16213e]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                  <th className="pb-4 pl-6 font-medium">Name</th>
                  <th className="pb-4 font-medium">Email</th>
                  <th className="pb-4 font-medium">Phone</th>
                  <th className="pb-4 font-medium">Vehicle</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-gray-800/50">
                    <td className="py-4 pl-6 font-medium text-white">
                      {driver.first_name} {driver.last_name}
                    </td>
                    <td className="py-4 text-gray-300">{driver.email}</td>
                    <td className="py-4 text-gray-300">{driver.phone}</td>
                    <td className="py-4 text-gray-300">{driver.vehicle_type || 'N/A'}</td>
                    <td className="py-4">
                      <Badge variant={getStatusVariant(driver.status)}>
                        {driver.status}
                      </Badge>
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/drivers/${driver.id}`}
                          className="rounded bg-[#E85D26] px-3 py-1 text-xs text-white transition-colors hover:bg-[#d54d1a]"
                        >
                          View
                        </Link>
                        {driver.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(driver.id, 'approved')}
                              className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(driver.id, 'rejected')}
                              className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-500"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {driver.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(driver.id, 'suspended')}
                            className="rounded bg-gray-700 px-3 py-1 text-xs text-white transition-colors hover:bg-gray-600"
                          >
                            Suspend
                          </button>
                        )}
                        {driver.status === 'suspended' && (
                          <button
                            onClick={() => handleStatusChange(driver.id, 'approved')}
                            className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500"
                          >
                            Unsuspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {drivers.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                No real driver records are available yet. Drivers appear here after they onboard through the driver app flow.
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
