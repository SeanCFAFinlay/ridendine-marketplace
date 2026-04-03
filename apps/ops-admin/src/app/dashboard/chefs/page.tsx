'use client';

import { Card, Badge } from '@ridendine/ui';
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
          <Badge className="bg-[#E85D26] text-white">{chefs.length} Chefs</Badge>
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
      </div>
    </DashboardLayout>
  );
}
