'use client';

import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  orders?: { count: number }[];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const response = await fetch('/api/customers');
      const result = await response.json();
      setCustomers(result.data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
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
            <h1 className="text-3xl font-bold text-white">Customers</h1>
            <p className="mt-2 text-gray-400">Oversee real customer accounts, ordering history, and support context.</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/api/export?type=customers" className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-600">Export CSV</a>
            <Badge className="bg-[#E85D26] text-white">{customers.length} Customers</Badge>
          </div>
        </div>

        <Card className="border-gray-800 bg-opsPanel">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                  <th className="pb-4 pl-6 font-medium">Name</th>
                  <th className="pb-4 font-medium">Email</th>
                  <th className="pb-4 font-medium">Phone</th>
                  <th className="pb-4 font-medium">Orders</th>
                  <th className="pb-4 font-medium">Joined</th>
                  <th className="pb-4 pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-800/50">
                    <td className="py-4 pl-6 font-medium text-white">
                      {customer.first_name} {customer.last_name}
                    </td>
                    <td className="py-4 text-gray-300">{customer.email}</td>
                    <td className="py-4 text-gray-300">{customer.phone || 'N/A'}</td>
                    <td className="py-4 text-gray-300">
                      {customer.orders?.[0]?.count || 0}
                    </td>
                    <td className="py-4 text-gray-400">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 pr-6">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="rounded bg-[#E85D26] px-3 py-1 text-xs text-white transition-colors hover:bg-[#d54d1a]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customers.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                No customer records are available yet. Customers appear here after signing up and placing orders through the customer app.
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
