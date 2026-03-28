'use client';

import { Card, Badge, Modal, Input, Textarea, Button } from '@ridendine/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type ChefProfile = {
  id: string;
  display_name: string;
  phone: string | null;
  bio: string | null;
  status: string;
  created_at: string;
  chef_storefronts?: {
    name: string;
    status: string;
  };
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    fetchChefs();
  }, []);

  async function fetchChefs() {
    try {
      const response = await fetch('/api/chefs');
      const result = await response.json();
      setChefs(result.data || []);
    } catch (error) {
      console.error('Failed to fetch chefs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSuspend(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'suspended' ? 'approved' : 'suspended';
    try {
      await fetch(`/api/chefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchChefs();
    } catch (error) {
      console.error('Failed to update chef:', error);
    }
  }

  async function handleApprove(id: string) {
    try {
      await fetch(`/api/chefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      fetchChefs();
    } catch (error) {
      console.error('Failed to approve chef:', error);
    }
  }

  async function handleReject(id: string) {
    try {
      await fetch(`/api/chefs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      fetchChefs();
    } catch (error) {
      console.error('Failed to reject chef:', error);
    }
  }

  async function handleAddChef(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/chefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({ display_name: '', phone: '', bio: '' });
        fetchChefs();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add chef');
      }
    } catch (error) {
      console.error('Failed to add chef:', error);
      alert('Failed to add chef');
    } finally {
      setSubmitting(false);
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
            <p className="mt-2 text-gray-400">Manage all chef profiles</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-[#E85D26] text-white">{chefs.length} Chefs</Badge>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a]"
            >
              + Add Chef
            </button>
          </div>
        </div>

        <Card className="border-gray-800 bg-[#16213e]">
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
                    <td className="py-4 text-gray-300">{chef.chef_storefronts?.name || 'No storefront'}</td>
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
                              onClick={() => handleApprove(chef.id)}
                              className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(chef.id)}
                              className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-500"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {chef.status === 'approved' && (
                          <button
                            onClick={() => handleSuspend(chef.id, chef.status)}
                            className="rounded bg-gray-700 px-3 py-1 text-xs text-white transition-colors hover:bg-gray-600"
                          >
                            Suspend
                          </button>
                        )}
                        {chef.status === 'suspended' && (
                          <button
                            onClick={() => handleSuspend(chef.id, chef.status)}
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
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Chef"
      >
        <form onSubmit={handleAddChef} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Display Name *
            </label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white placeholder-gray-500 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
              placeholder="Chef's display name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white placeholder-gray-500 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white placeholder-gray-500 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
              placeholder="Chef's bio and specialties..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a] disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Chef'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
