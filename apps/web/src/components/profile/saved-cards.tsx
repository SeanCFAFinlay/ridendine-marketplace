'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '@ridendine/ui';

interface StripeCard {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface SavedPaymentMethod {
  id: string;
  type: string;
  card: StripeCard | null;
}

function CardBrandIcon({ brand }: { brand: string }) {
  const label = brand.charAt(0).toUpperCase() + brand.slice(1);
  return (
    <span className="inline-flex h-8 w-12 items-center justify-center rounded border border-gray-200 bg-gray-50 text-xs font-bold text-gray-700">
      {label.slice(0, 4)}
    </span>
  );
}

function PaymentMethodRow({
  method,
  onDelete,
  isDeleting,
}: {
  method: SavedPaymentMethod;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  if (!method.card) return null;
  const { brand, last4, exp_month, exp_year } = method.card;

  return (
    <div className="flex items-center gap-4 py-3">
      <CardBrandIcon brand={brand} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">
          {brand.charAt(0).toUpperCase() + brand.slice(1)} ending in {last4}
        </p>
        <p className="text-xs text-gray-500">
          Expires {exp_month}/{exp_year}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(method.id)}
        disabled={isDeleting}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        {isDeleting ? 'Removing...' : 'Remove'}
      </Button>
    </div>
  );
}

export function SavedCards() {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchMethods = useCallback(async () => {
    try {
      const res = await fetch('/api/payment-methods');
      const json = await res.json();
      if (json.success) {
        setMethods(json.data ?? []);
      }
    } catch {
      setError('Failed to load saved cards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMethods();
  }, [fetchMethods]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError('');
    try {
      const res = await fetch(`/api/payment-methods?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
      } else {
        setError(json.error || 'Failed to remove card');
      }
    } catch {
      setError('Failed to remove card');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card padding="lg">
      <h2 className="mb-4 text-xl font-semibold text-text">Saved Payment Methods</h2>

      {loading && (
        <p className="text-sm text-gray-500">Loading saved cards...</p>
      )}

      {!loading && methods.length === 0 && (
        <p className="text-sm text-gray-500">
          No saved cards yet. Check the &quot;Save this card&quot; option at checkout to save a card for future orders.
        </p>
      )}

      {!loading && methods.length > 0 && (
        <div className="divide-y divide-gray-100">
          {methods.map((method) => (
            <PaymentMethodRow
              key={method.id}
              method={method}
              onDelete={handleDelete}
              isDeleting={deletingId === method.id}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </Card>
  );
}
