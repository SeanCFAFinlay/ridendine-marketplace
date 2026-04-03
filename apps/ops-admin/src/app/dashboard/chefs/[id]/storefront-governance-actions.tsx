'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function StorefrontGovernanceActions({
  storefrontId,
  isActive,
}: {
  storefrontId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function handleAction(action: 'publish' | 'unpublish') {
    setSubmitting(action);

    try {
      const response = await fetch(`/api/engine/storefronts/${storefrontId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update storefront governance state');
      }

      router.refresh();
    } catch (error) {
      console.error('Storefront governance action failed:', error);
    } finally {
      setSubmitting(null);
    }
  }

  if (isActive) {
    return (
      <button
        onClick={() => handleAction('unpublish')}
        disabled={submitting !== null}
        className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-500 disabled:opacity-50"
      >
        {submitting === 'unpublish' ? 'Unpublishing...' : 'Unpublish'}
      </button>
    );
  }

  return (
    <button
      onClick={() => handleAction('publish')}
      disabled={submitting !== null}
      className="rounded bg-green-600 px-3 py-1 text-xs text-white transition-colors hover:bg-green-500 disabled:opacity-50"
    >
      {submitting === 'publish' ? 'Publishing...' : 'Publish'}
    </button>
  );
}
