'use client';

import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

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

export default function ChefsPage() {
  const [chefs, setChefs] = useState<ChefProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    status: 'pending',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChefs();
  }, []);

  async function fetchChefs() {
    try {
      const response = await fetch('/api/chefs');
      const result = await response.json();
      setChefs(result.data?.items || []);
    } catch (error) {
      console.error('Failed to fetch chefs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateChef(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/chefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: form.phone || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || result.error || 'Failed to add chef');
      setShowCreate(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '', status: 'pending' });
      fetchChefs();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add chef');
    } finally {
      setSaving(false);
    }
  }

  async function handleChefAction(id: string, action: 'approve' | 'reject' | 'suspend' | 'unsuspend') {
    try {
      await fetch(`/api/chefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchChefs();
    } catch (error) {
      console.error('Failed to update chef:', error);
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
            <h1 className="text-3xl font-bold text-white">Chefs</h1>
            <p className="mt-2 text-gray-400">Govern chef approvals, suspension state, and storefront readiness</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#d54d1a]"
            >
              Add Chef
            </button>
            <a href="/api/export?type=chefs" className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">Export CSV</a>
            <Badge className="bg-[#E85D26] text-white">{chefs.length} Chefs</Badge>
          </div>
        </div>

        <Card className="mb-6 border-gray-800 bg-opsPanel p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/chefs/approvals" className="rounded-lg border border-gray-700 bg-opsPanel p-4 transition-colors hover:border-[#E85D26]">
              <p className="text-sm font-semibold text-white">Review approvals</p>
              <p className="mt-1 text-xs text-gray-400">Approve, reject, or suspend chef access.</p>
            </Link>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg border border-gray-700 bg-opsPanel p-4 text-left transition-colors hover:border-[#E85D26]"
            >
              <p className="text-sm font-semibold text-white">Create chef account</p>
              <p className="mt-1 text-xs text-gray-400">Add a chef directly from operations.</p>
            </button>
            <a href="/api/export?type=chefs" className="rounded-lg border border-gray-700 bg-opsPanel p-4 transition-colors hover:border-[#E85D26]">
              <p className="text-sm font-semibold text-white">Export chef records</p>
              <p className="mt-1 text-xs text-gray-400">Download the current chef list.</p>
            </a>
          </div>
        </Card>

        <Card className="border-gray-800 bg-opsPanel">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                  <th className="pb-4 pl-6 font-medium">Name</th>
                  <th className="pb-4 font-medium">Storefront</th>
                  <th className="pb-4 font-medium">Phone</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Joined</th>
                  <th className="pb-4 pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {chefs.map((chef) => (
                  <tr key={chef.id} className="border-b border-gray-800/50">
                    <td className="py-4 pl-6 font-medium text-white">
                      {chef.display_name}
                    </td>
                    <td className="py-4 text-gray-300">{chef.chef_storefronts?.[0]?.name || 'No storefront'}</td>
                    <td className="py-4 text-gray-300">{chef.phone || 'N/A'}</td>
                    <td className="py-4">
                      <Badge variant={getStatusVariant(chef.status)}>
                        {chef.status}
                      </Badge>
                    </td>
                    <td className="py-4 text-gray-400">
                      {new Date(chef.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/chefs/${chef.id}`}
                          className="rounded bg-[#E85D26] px-3 py-1 text-xs text-white transition-colors hover:bg-[#d54d1a]"
                        >
                          View
                        </Link>
                        {chef.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleChefAction(chef.id, 'approve')}
                              className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleChefAction(chef.id, 'reject')}
                              className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-500"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {chef.status === 'approved' && (
                          <button
                            onClick={() => handleChefAction(chef.id, 'suspend')}
                            className="rounded bg-gray-700 px-3 py-1 text-xs text-white transition-colors hover:bg-gray-600"
                          >
                            Suspend
                          </button>
                        )}
                        {chef.status === 'suspended' && (
                          <button
                            onClick={() => handleChefAction(chef.id, 'unsuspend')}
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
            {chefs.length === 0 && (
              <div className="py-12 text-center text-gray-400">No chefs found</div>
            )}
          </div>
        </Card>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-opsPanel p-6 shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Add Chef</h2>
                  <p className="mt-1 text-sm text-gray-400">Create a login and chef profile for ops review.</p>
                </div>
                <button onClick={() => setShowCreate(false)} className="text-sm text-gray-400 hover:text-white">
                  Close
                </button>
              </div>
              {error && <div className="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-200">{error}</div>}
              <form onSubmit={handleCreateChef} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-gray-300">
                    First name
                    <input required value={form.firstName} onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-opsPanel px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-gray-300">
                    Last name
                    <input required value={form.lastName} onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-opsPanel px-3 py-2 text-white" />
                  </label>
                </div>
                <label className="block text-sm text-gray-300">
                  Email
                  <input required type="email" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-opsPanel px-3 py-2 text-white" />
                </label>
                <label className="block text-sm text-gray-300">
                  Phone
                  <input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-opsPanel px-3 py-2 text-white" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-gray-300">
                    Temporary password
                    <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-opsPanel px-3 py-2 text-white" />
                  </label>
                  <label className="text-sm text-gray-300">
                    Starting status
                    <select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-600 bg-opsPanel px-3 py-2 text-white">
                      <option value="pending">Pending review</option>
                      <option value="approved">Approved</option>
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">Cancel</button>
                  <button disabled={saving} type="submit" className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-semibold text-white hover:bg-[#d54d1a] disabled:opacity-60">
                    {saving ? 'Creating...' : 'Create Chef'}
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
