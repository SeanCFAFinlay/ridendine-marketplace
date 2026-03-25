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
        <Badge className="bg-[#E85D26] text-white">{chefs.length} Chefs</Badge>
      </div>

      <Card className="border-gray-800 bg-[#16213e]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="pb-4 pl-6 font-medium">Name</th>
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
                  <td className="py-4 text-gray-300">{chef.phone || 'N/A'}</td>
                  <td className="py-4">
                    <Badge variant={getStatusVariant(chef.status)}>
                      {chef.status}
                    </Badge>
                  </td>
                  <td className="py-4 text-gray-400">
                    {new Date(chef.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 pr-6 flex gap-2">
                    <Link
                      href={`/dashboard/chefs/${chef.id}`}
                      className="rounded bg-[#E85D26] px-3 py-1 text-xs text-white transition-colors hover:bg-[#d54d1a]"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleSuspend(chef.id, chef.status)}
                      className="rounded bg-gray-700 px-3 py-1 text-xs text-white transition-colors hover:bg-gray-600"
                    >
                      {chef.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                    </button>
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
