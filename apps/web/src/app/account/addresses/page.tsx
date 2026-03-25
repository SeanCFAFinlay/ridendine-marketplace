'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { Button, Card, Input, EmptyState } from '@ridendine/ui';

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const newAddress: Address = {
      id: Date.now().toString(),
      ...formData,
      isDefault: addresses.length === 0,
    };
    setAddresses([...addresses, newAddress]);
    setFormData({ label: '', street: '', city: '', state: '', zip: '' });
    setIsAdding(false);
  };

  const handleSetDefault = (id: string) => {
    setAddresses(
      addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );
  };

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter((addr) => addr.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#2D3436]">
              Delivery Addresses
            </h1>
            <p className="mt-1 text-[15px] leading-[1.6] text-[#5F6368]">
              Manage your saved delivery locations
            </p>
          </div>
          <Link href="/account">
            <Button variant="outline">Back to Account</Button>
          </Link>
        </div>

        {addresses.length === 0 && !isAdding ? (
          <Card padding="lg">
            <EmptyState
              icon={
                <svg
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              }
              title="No addresses saved"
              description="Add a delivery address to make checkout faster"
              action={
                <Button
                  onClick={() => setIsAdding(true)}
                  className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                >
                  Add Address
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {addresses.map((address) => (
              <Card key={address.id} padding="lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[17px] font-semibold text-[#2D3436]">
                        {address.label}
                      </h3>
                      {address.isDefault && (
                        <span className="rounded bg-[#FFF8F0] px-2 py-0.5 text-[13px] font-medium text-[#FF6B6B]">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[15px] leading-[1.6] text-[#5F6368]">
                      {address.street}
                      <br />
                      {address.city}, {address.state} {address.zip}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!address.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {!isAdding && (
              <Button
                onClick={() => setIsAdding(true)}
                variant="outline"
                className="w-full"
              >
                + Add New Address
              </Button>
            )}
          </div>
        )}

        {isAdding && (
          <Card padding="lg" className="mt-6">
            <h2 className="mb-6 text-[20px] font-semibold text-[#2D3436]">
              Add New Address
            </h2>
            <form onSubmit={handleAddAddress} className="space-y-4">
              <Input
                label="Label"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                placeholder="e.g., Home, Work"
                required
              />
              <Input
                label="Street Address"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                placeholder="123 Main St, Apt 4"
                required
              />
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="San Francisco"
                  required
                />
                <Input
                  label="State"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="CA"
                  required
                />
                <Input
                  label="ZIP Code"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({ ...formData, zip: e.target.value })
                  }
                  placeholder="94102"
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                >
                  Save Address
                </Button>
              </div>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}
