'use client';

import { Card, Badge, Modal } from '@ridendine/ui';
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

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

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({ first_name: '', last_name: '', email: '', phone: '' });
        fetchCustomers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add customer');
      }
    } catch (error) {
      console.error('Failed to add customer:', error);
      alert('Failed to add customer');
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
            <h1 className="text-3xl font-bold text-white">Customers</h1>
            <p className="mt-2 text-gray-400">View and manage all platform customers</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-[#E85D26] text-white">{customers.length} Customers</Badge>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a]"
            >
              + Add Customer
            </button>
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
              <div className="py-12 text-center text-gray-400">No customers found</div>
            )}
          </div>
        </Card>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Customer"
      >
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white placeholder-gray-500 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                placeholder="John"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white placeholder-gray-500 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white placeholder-gray-500 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
              placeholder="customer@example.com"
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
              {submitting ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
