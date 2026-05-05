'use client';

import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import type { FormEvent } from 'react';
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
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    vehicleType: 'car',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      const response = await fetch('/api/drivers');
      const result = await response.json();
      setDrivers(result.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDriver(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || result.error || 'Failed to add driver');
      setShowCreate(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        vehicleType: 'car',
        status: 'pending',
      });
      fetchDrivers();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add driver');
    } finally {
      setSaving(false);
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
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d54d1a]"
            >
              Add Driver
            </button>
            <a href="/api/export?type=drivers" className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">Export CSV</a>
            <Badge className="bg-[#E85D26] text-white">{drivers.length} Drivers</Badge>
          </div>
        </div>

        <Card className="mb-6 border-gray-800 bg-[#16213e] p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4 text-left transition-colors hover:border-[#E85D26]"
            >
              <p className="text-sm font-semibold text-white">Create driver account</p>
              <p className="mt-1 text-xs text-gray-400">Add a driver directly from operations.</p>
            </button>
            <Link href="/dashboard/dispatch" className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4 transition-colors hover:border-[#E85D26]">
              <p className="text-sm font-semibold text-white">Open dispatch</p>
              <p className="mt-1 text-xs text-gray-400">Assign, retry, and monitor deliveries.</p>
            </Link>
            <a href="/api/export?type=drivers" className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4 transition-colors hover:border-[#E85D26]">
              <p className="text-sm font-semibold text-white">Export driver records</p>
              <p className="mt-1 text-xs text-gray-400">Download the current driver list.</p>
            </a>
          </div>
        </Card>

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

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-[#16213e] p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Add Driver</h2>
                  <p className="mt-1 text-sm text-gray-400">Create a login, driver profile, and offline presence record.</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-sm text-gray-400 hover:text-white">
                  Close
                </button>
              </div>
              {error && <div className="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-200">{error}</div>}
              <form onSubmit={handleCreateDriver} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-gray-300">
                    First name
                    <input required value={form.firstName} onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a2e] px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-gray-300">
                    Last name
                    <input required value={form.lastName} onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a2e] px-3 py-2 text-white" />
                  </label>
                </div>
                <label className="block text-sm text-gray-300">
                  Email
                  <input required type="email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a2e] px-3 py-2 text-white" />
                </label>
                <label className="block text-sm text-gray-300">
                  Phone
                  <input required value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a2e] px-3 py-2 text-white" />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-sm text-gray-300">
                    Temporary password
                    <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a2e] px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-gray-300">
                    Vehicle
                    <select value={form.vehicleType} onChange={(e) => setForm((v) => ({ ...v, vehicleType: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a2e] px-3 py-2 text-white">
                      <option value="car">Car</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="scooter">Scooter</option>
                    </select>
                  </label>
                  <label className="text-sm text-gray-300">
                    Starting status
                    <select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-[#1a1a2e] px-3 py-2 text-white">
                      <option value="pending">Pending review</option>
                      <option value="approved">Approved</option>
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
                  <button disabled={saving} type="submit" className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d54d1a] disabled:opacity-60">
                    {saving ? 'Creating...' : 'Create Driver'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
