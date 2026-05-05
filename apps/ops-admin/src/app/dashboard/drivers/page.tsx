'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader, DataTable, EmptyState, Modal, StatusBadge, Button } from '@ridendine/ui';
import type { ColumnDef } from '@ridendine/ui';
import { UserCheck, UserX, UserMinus } from 'lucide-react';

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

type DriverForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  vehicleType: string;
  status: string;
};

const INITIAL_FORM: DriverForm = {
  firstName: '', lastName: '', email: '', phone: '',
  password: '', vehicleType: 'car', status: 'pending',
};

function statusToVariant(status: string): 'success' | 'warning' | 'danger' | 'idle' {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'rejected' || status === 'suspended') return 'danger';
  return 'idle';
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<DriverForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { void fetchDrivers(); }, []);

  async function fetchDrivers() {
    try {
      const response = await fetch('/api/drivers');
      const result = await response.json();
      setDrivers(result.data?.items || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
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
      setForm(INITIAL_FORM);
      void fetchDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add driver');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await fetch(`/api/drivers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      void fetchDrivers();
    } catch { /* silent */ }
  }

  const filtered = statusFilter === 'all'
    ? drivers
    : drivers.filter((d) => d.status === statusFilter);

  const columns: ColumnDef<Driver>[] = [
    {
      key: 'first_name',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <Link
          href={`/dashboard/drivers/${row.id}`}
          className="font-medium text-white hover:text-[#E85D26]"
        >
          {row.first_name} {row.last_name}
        </Link>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => <span className="text-gray-300 text-sm">{row.email}</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (row) => <span className="text-gray-400 text-sm">{row.phone}</span>,
    },
    {
      key: 'vehicle_type',
      header: 'Vehicle',
      cell: (row) => <span className="text-gray-400 text-sm">{row.vehicle_type ?? 'N/A'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => <StatusBadge status={statusToVariant(row.status)} label={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      cell: (row) => (
        <span className="text-gray-500 text-xs">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/dashboard/drivers/${row.id}`}
            className="rounded bg-[#E85D26] px-2 py-1 text-xs text-white hover:bg-[#d54d1a]"
          >
            View
          </Link>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => void handleStatusChange(row.id, 'approved')}
                className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-600"
                title="Approve"
              >
                <UserCheck className="h-3 w-3" />
              </button>
              <button
                onClick={() => void handleStatusChange(row.id, 'rejected')}
                className="rounded bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-600"
                title="Reject"
              >
                <UserX className="h-3 w-3" />
              </button>
            </>
          )}
          {row.status === 'approved' && (
            <button
              onClick={() => void handleStatusChange(row.id, 'suspended')}
              className="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600"
              title="Suspend"
            >
              <UserMinus className="h-3 w-3" />
            </button>
          )}
          {row.status === 'suspended' && (
            <button
              onClick={() => void handleStatusChange(row.id, 'approved')}
              className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-600"
              title="Unsuspend"
            >
              <UserCheck className="h-3 w-3" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statuses = ['all', ...Array.from(new Set(drivers.map((d) => d.status)))];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Drivers"
          subtitle="Oversee real driver records, approval state, and availability."
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-[#E85D26] text-white hover:bg-[#d54d1a]"
                onClick={() => setShowCreate(true)}
              >
                Add Driver
              </Button>
              <a
                href="/api/export?type=drivers"
                className="inline-flex h-8 items-center rounded-md border border-gray-700 px-3 text-xs text-gray-300 hover:border-gray-500"
              >
                Export CSV
              </a>
            </div>
          }
        />

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-[#E85D26] text-white'
                  : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              {s === 'all' ? `All (${drivers.length})` : s}
            </button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(r) => r.id}
          isLoading={loading}
          emptyState={
            <EmptyState
              title="No drivers found"
              description="Drivers appear here after they onboard through the driver app."
              action={
                <Button
                  size="sm"
                  className="bg-[#E85D26] text-white hover:bg-[#d54d1a]"
                  onClick={() => setShowCreate(true)}
                >
                  Add Driver
                </Button>
              }
            />
          }
          className="border-gray-800 bg-opsPanel"
        />

        <Modal
          isOpen={showCreate}
          onClose={() => { setShowCreate(false); setForm(INITIAL_FORM); setError(''); }}
          title="Add Driver"
        >
          <p className="mb-4 text-sm text-gray-400">
            Create a login, driver profile, and offline presence record.
          </p>
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-200">{error}</div>
          )}
          <form onSubmit={(e) => void handleCreateDriver(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-gray-300">
                First name
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-gray-300">
                Last name
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white"
                />
              </label>
            </div>
            <label className="block text-sm text-gray-300">
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-gray-300">
              Phone
              <input
                required
                value={form.phone}
                onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm text-gray-300">
                Temporary password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-gray-300">
                Vehicle
                <select
                  value={form.vehicleType}
                  onChange={(e) => setForm((v) => ({ ...v, vehicleType: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white"
                >
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="scooter">Scooter</option>
                </select>
              </label>
              <label className="block text-sm text-gray-300">
                Starting status
                <select
                  value={form.status}
                  onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-950 px-3 py-2 text-white"
                >
                  <option value="pending">Pending review</option>
                  <option value="approved">Approved</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowCreate(false); setForm(INITIAL_FORM); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-[#E85D26] text-white hover:bg-[#d54d1a]"
                loading={saving}
              >
                Create Driver
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
