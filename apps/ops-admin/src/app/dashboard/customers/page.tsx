'use client';

import { Card } from '@ridendine/ui';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Customers</h1>
        <p className="mt-2 text-gray-400">View all platform customers</p>
      </div>

      <Card className="border-gray-800 bg-[#16213e]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                <th className="pb-4 pl-6 font-medium">Name</th>
                <th className="pb-4 font-medium">Email</th>
                <th className="pb-4 font-medium">Phone</th>
                <th className="pb-4 pr-6 font-medium">Joined</th>
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
                  <td className="py-4 pr-6 text-gray-400">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="py-12 text-center text-gray-400">No customers found</div>
          )}
        </div>
      </Card>
    </div>
    </DashboardLayout>
  );
}
