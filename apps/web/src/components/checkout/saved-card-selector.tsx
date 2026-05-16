'use client';

import { useEffect, useState } from 'react';

interface SavedCard {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface SavedCardSelectorProps {
  onSelect: (paymentMethodId: string | null, saveCard: boolean) => void;
}

function brandLabel(brand: string): string {
  const map: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'MC',
    amex: 'Amex',
    discover: 'Discover',
  };
  return map[brand.toLowerCase()] ?? brand.toUpperCase();
}

function formatExpiry(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

export function SavedCardSelector({ onSelect }: SavedCardSelectorProps) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | 'new'>('new');
  const [saveCard, setSaveCard] = useState(false);

  useEffect(() => {
    fetch('/api/payment-methods')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCards(json.data as SavedCard[]);
          if (json.data.length > 0) {
            const firstId = (json.data[0] as SavedCard).id;
            setSelected(firstId);
            onSelect(firstId, false);
          }
        }
      })
      .catch(() => {/* silently fall through to new card */})
      .finally(() => setLoading(false));
  // onSelect intentionally omitted — we only run this on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-12 rounded-md bg-surfaceMuted" />
        <div className="h-12 rounded-md bg-surfaceMuted" />
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  function handleSelect(value: string) {
    setSelected(value);
    if (value === 'new') {
      onSelect(null, saveCard);
    } else {
      onSelect(value, false);
    }
  }

  function handleSaveCard(checked: boolean) {
    setSaveCard(checked);
    onSelect(null, checked);
  }

  return (
    <div className="space-y-3">
      {cards.map((pm) => (
        <label
          key={pm.id}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
            selected === pm.id
              ? 'border-primary bg-primarySoft'
              : 'border-border hover:border-borderStrong'
          }`}
        >
          <input
            type="radio"
            name="payment-method"
            value={pm.id}
            checked={selected === pm.id}
            onChange={() => handleSelect(pm.id)}
            className="h-4 w-4 accent-primary"
          />
          <span className="w-10 text-sm font-medium text-text">
            {brandLabel(pm.card.brand)}
          </span>
          <span className="flex-1 text-sm text-text">
            &bull;&bull;&bull;&bull; {pm.card.last4}
          </span>
          <span className="text-xs text-textMuted">
            Exp {formatExpiry(pm.card.exp_month, pm.card.exp_year)}
          </span>
        </label>
      ))}

      <label
        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
          selected === 'new'
            ? 'border-primary bg-primarySoft'
            : 'border-border hover:border-borderStrong'
        }`}
      >
        <input
          type="radio"
          name="payment-method"
          value="new"
          checked={selected === 'new'}
          onChange={() => handleSelect('new')}
          className="h-4 w-4 accent-primary"
        />
        <span className="text-sm font-medium text-text">Use a new card</span>
      </label>

      {selected === 'new' && (
        <label className="flex cursor-pointer items-center gap-2 pl-2 text-sm text-text">
          <input
            type="checkbox"
            checked={saveCard}
            onChange={(e) => handleSaveCard(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Save this card for future orders
        </label>
      )}
    </div>
  );
}
