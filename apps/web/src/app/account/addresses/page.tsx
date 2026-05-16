'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { Button, Card, Input, Select } from '@ridendine/ui';

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
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/addresses');
        const result = await res.json();
        if (!cancelled) setAddresses(result.data || []);
      } catch {
        if (!cancelled) setError('Failed to load addresses');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">Saved Addresses</h1>
            <p className="mt-1 text-sm text-textMuted">Manage your delivery addresses</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/account">
              <Button variant="ghost" size="sm">← Back</Button>
            </Link>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              + Add Address
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-danger/30 bg-dangerSoft p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Add Address Form */}
        {showForm && (
          <Card className="mt-6" padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-text">New Address</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                >
                  <option>Home</option>
                  <option>Work</option>
                  <option>Other</option>
                </Select>
                <Input
                  label="Street Address *"
                  required
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <Input
                label="Apt/Suite (optional)"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                placeholder="Apt 4B"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="City *"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Hamilton"
                />
                <Input
                  label="Province *"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="ON"
                  maxLength={2}
                />
                <Input
                  label="Postal Code *"
                  required
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="L8P 1A1"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowForm(false); setFormData(emptyForm); }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  Save Address
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Address List */}
        {addresses.length === 0 && !showForm ? (
          <Card className="mt-6 p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surfaceMuted">
              <svg className="h-8 w-8 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-medium text-text">No saved addresses</p>
            <p className="mt-1 text-sm text-textMuted">Add an address to speed up checkout</p>
            <Button variant="primary" className="mt-4" onClick={() => setShowForm(true)}>
              Add Your First Address
            </Button>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            {addresses.map((addr) => (
              <Card
                key={addr.id}
                className={`p-5 ${addr.is_default ? 'border-primary ring-1 ring-primary/30' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-md ${addr.is_default ? 'bg-primary' : 'bg-surfaceMuted'}`}>
                      <svg
                        className={`h-4 w-4 ${addr.is_default ? 'text-primaryFg' : 'text-textMuted'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text">{addr.label}</span>
                        {addr.is_default && (
                          <span className="rounded-full bg-primarySoft px-2 py-0.5 text-xs font-medium text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-textMuted">
                        {addr.address_line1}
                        {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                      </p>
                      <p className="text-sm text-textMuted">
                        {addr.city}, {addr.state} {addr.postal_code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!addr.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(addr.id)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-textMuted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-focus"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(addr.id)}
                      className="rounded-md border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-dangerSoft focus-visible:outline-none focus-visible:shadow-focus"
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
