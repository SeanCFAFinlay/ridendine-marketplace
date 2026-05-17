'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { fetchApiItems, fetchJson } from '@/lib/client-api';
import { PageHeader, DataTable, EmptyState, Modal, StatusBadge, Button } from '@ridendine/ui';
import type { ColumnDef } from '@ridendine/ui';
import { UserCheck, UserX, UserMinus } from 'lucide-react';

type ChefProfile = {
  id: string;
  display_name: string;
  phone: string | null;
  bio: string | null;
  status: string;
  created_at: string;
  chef_storefronts: Array<{
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    is_featured: boolean;
  }> | null;
};

type ChefForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  status: string;
};

const INITIAL_FORM: ChefForm = {
  firstName: '', lastName: '', email: '', phone: '', password: '', status: 'pending',
};

function statusToVariant(status: string): 'success' | 'warning' | 'danger' | 'idle' {
  if (status === 'approved') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'rejected' || status === 'suspended') return 'danger';
  return 'idle';
}

export default function ChefsPage() {
  const [chefs, setChefs] = useState<ChefProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<ChefForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => { void fetchChefs(); }, []);

  async function fetchChefs() {
    try {
      setError('');
      setChefs(await fetchApiItems<ChefProfile>('/api/chefs', undefined, 'Failed to load chefs'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chefs');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateChef(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await fetchJson('/api/chefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: form.phone || undefined }),
      }, 'Failed to add chef');
      setShowCreate(false);
      setForm(INITIAL_FORM);
      void fetchChefs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add chef');
    } finally {
      setSaving(false);
    }
  }

  async function handleChefAction(id: string, action: 'approve' | 'reject' | 'suspend' | 'unsuspend') {
    try {
      setError('');
      await fetchJson(`/api/chefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }, 'Failed to update chef');
      void fetchChefs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update chef');
    }
  }

  const filtered = statusFilter === 'all'
    ? chefs
    : chefs.filter((c) => c.status === statusFilter);

  const columns: ColumnDef<ChefProfile>[] = [
    {
      key: 'display_name',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <Link href={`/dashboard/chefs/${row.id}`} className="font-medium text-white hover:text-primary">
          {row.display_name}
        </Link>
      ),
    },
    {
      key: 'storefront',
      header: 'Storefront',
      cell: (row) => (
        <span className="text-textSubtle text-sm">
          {row.chef_storefronts?.[0]?.name ?? 'No storefront'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (row) => <span className="text-textMuted text-sm">{row.phone ?? 'N/A'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => (
        <StatusBadge status={statusToVariant(row.status)} label={row.status} />
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      sortable: true,
      cell: (row) => (
        <span className="text-textMuted text-xs">
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
            href={`/dashboard/chefs/${row.id}`}
            className="rounded bg-primary px-2 py-1 text-xs text-white hover:bg-primaryHover"
          >
            View
          </Link>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => void handleChefAction(row.id, 'approve')}
                className="rounded bg-success px-2 py-1 text-xs text-white hover:bg-success"
                title="Approve"
              >
                <UserCheck className="h-3 w-3" />
              </button>
              <button
                onClick={() => void handleChefAction(row.id, 'reject')}
                className="rounded bg-danger px-2 py-1 text-xs text-white hover:bg-danger"
                title="Reject"
              >
                <UserX className="h-3 w-3" />
              </button>
            </>
          )}
          {row.status === 'approved' && (
            <button
              onClick={() => void handleChefAction(row.id, 'suspend')}
              className="rounded bg-surfaceMuted px-2 py-1 text-xs text-white hover:bg-surfaceMuted"
              title="Suspend"
            >
              <UserMinus className="h-3 w-3" />
            </button>
          )}
          {row.status === 'suspended' && (
            <button
              onClick={() => void handleChefAction(row.id, 'unsuspend')}
              className="rounded bg-success px-2 py-1 text-xs text-white hover:bg-success"
              title="Unsuspend"
            >
              <UserCheck className="h-3 w-3" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statuses = ['all', ...Array.from(new Set(chefs.map((c) => c.status)))];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Chefs"
          subtitle="Govern chef approvals, suspension state, and storefront readiness."
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-primary text-white hover:bg-primaryHover"
                onClick={() => setShowCreate(true)}
              >
                Add Chef
              </Button>
              <a
                href="/api/export?type=chefs"
                className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs text-textSubtle hover:border-border"
              >
                Export CSV
              </a>
            </div>
          }
        />

        {error && !showCreate && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white'
                  : 'border border-border text-textMuted hover:border-border hover:text-textSubtle'
              }`}
            >
              {s === 'all' ? `All (${chefs.length})` : s}
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
              title="No chefs found"
              description="Add a chef account or adjust your filter."
              action={
                <Button
                  size="sm"
                  className="bg-primary text-white hover:bg-primaryHover"
                  onClick={() => setShowCreate(true)}
                >
                  Add Chef
                </Button>
              }
            />
          }
          className="border-border bg-surface"
        />

        <Modal
          isOpen={showCreate}
          onClose={() => { setShowCreate(false); setForm(INITIAL_FORM); setError(''); }}
          title="Add Chef"
        >
          <p className="mb-4 text-sm text-textMuted">Create a login and chef profile for ops review.</p>
          {error && (
            <div className="mb-4 rounded-lg bg-danger/15 p-3 text-sm text-danger">{error}</div>
          )}
          <form onSubmit={(e) => void handleCreateChef(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-textSubtle">
                First name
                <input
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-text px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-textSubtle">
                Last name
                <input
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-text px-3 py-2 text-white"
                />
              </label>
            </div>
            <label className="block text-sm text-textSubtle">
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-text px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-textSubtle">
              Phone
              <input
                value={form.phone}
                onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-text px-3 py-2 text-white"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-textSubtle">
                Temporary password
                <input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-text px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-textSubtle">
                Starting status
                <select
                  value={form.status}
                  onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-border bg-text px-3 py-2 text-white"
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
                className="bg-primary text-white hover:bg-primaryHover"
                loading={saving}
              >
                Create Chef
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
