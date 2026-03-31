'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { Button, Card } from '@ridendine/ui';

interface Address {
  id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  is_default: boolean;
}

interface AddressForm {
  label: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
}

const emptyForm: AddressForm = {
  label: 'Home',
  address_line1: '',
  address_line2: '',
  city: 'Hamilton',
  state: 'ON',
  postal_code: '',
};

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuthContext();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AddressForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      fetchAddresses();
    }
  }, [user, authLoading]);

  async function fetchAddresses() {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/addresses');
      const result = await res.json();
      setAddresses(result.data || []);
    } catch {
      setError('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add address');
      }
      setShowForm(false);
      setFormData(emptyForm);
      fetchAddresses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add address');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await fetch('/api/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_default: true }),
      });
      fetchAddresses();
    } catch {
      setError('Failed to update address');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this address?')) return;
    try {
      await fetch(`/api/addresses?id=${id}`, { method: 'DELETE' });
      fetchAddresses();
    } catch {
      setError('Failed to delete address');
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container py-8">
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E85D26] border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your delivery addresses</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/account">
              <Button variant="ghost" size="sm">← Back</Button>
            </Link>
            <Button
              size="sm"
              className="bg-[#E85D26] text-white hover:bg-[#d44e1e]"
              onClick={() => setShowForm(true)}
            >
              + Add Address
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Add Address Form */}
        {showForm && (
          <Card className="mt-6 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">New Address</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Label</label>
                  <select
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  >
                    <option>Home</option>
                    <option>Work</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address_line1}
                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                    placeholder="123 Main St"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Apt/Suite (optional)</label>
                <input
                  type="text"
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  placeholder="Apt 4B"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Hamilton"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Province *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="ON"
                    maxLength={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="L8P 1A1"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowForm(false); setFormData(emptyForm); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#E85D26] text-white hover:bg-[#d44e1e]"
                  loading={submitting}
                >
                  Save Address
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Address List */}
        {addresses.length === 0 && !showForm ? (
          <Card className="mt-6 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-medium text-gray-700">No saved addresses</p>
            <p className="mt-1 text-sm text-gray-500">Add an address to speed up checkout</p>
            <Button
              className="mt-4 bg-[#E85D26] text-white hover:bg-[#d44e1e]"
              onClick={() => setShowForm(true)}
            >
              Add Your First Address
            </Button>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {addresses.map((addr) => (
              <Card key={addr.id} className={`p-5 ${addr.is_default ? 'border-[#E85D26] ring-1 ring-[#E85D26]/30' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${addr.is_default ? 'bg-[#E85D26]' : 'bg-gray-100'}`}>
                      <svg className={`h-4 w-4 ${addr.is_default ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{addr.label}</span>
                        {addr.is_default && (
                          <span className="rounded-full bg-[#fff0e8] px-2 py-0.5 text-xs font-medium text-[#E85D26]">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-600">
                        {addr.address_line1}
                        {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        {addr.city}, {addr.state} {addr.postal_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!addr.is_default && (
                      <button
                        onClick={() => handleSetDefault(addr.id)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-[#E85D26] hover:text-[#E85D26]"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
