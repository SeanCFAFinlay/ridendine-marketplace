'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ChefGovernanceActions({
  chefId,
  chefStatus,
}: {
  chefId: string;
  chefStatus: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function handleAction(action: 'approve' | 'reject' | 'suspend' | 'unsuspend') {
    setSubmitting(action);

    try {
      const response = await fetch(`/api/chefs/${chefId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update chef governance state');
      }

      router.refresh();
    } catch (error) {
      console.error('Chef governance action failed:', error);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {chefStatus === 'pending' && (
        <>
          <button
            onClick={() => handleAction('approve')}
            disabled={submitting !== null}
            className="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {submitting === 'approve' ? 'Approving...' : 'Approve Chef'}
          </button>
          <button
            onClick={() => handleAction('reject')}
            disabled={submitting !== null}
            className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {submitting === 'reject' ? 'Rejecting...' : 'Reject Application'}
          </button>
        </>
      )}

      {chefStatus === 'approved' && (
        <button
          onClick={() => handleAction('suspend')}
          disabled={submitting !== null}
          className="rounded-lg bg-orange-600 px-4 py-2 text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting === 'suspend' ? 'Suspending...' : 'Suspend Chef'}
        </button>
      )}

      {chefStatus === 'suspended' && (
        <button
          onClick={() => handleAction('unsuspend')}
          disabled={submitting !== null}
          className="rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          {submitting === 'unsuspend' ? 'Restoring...' : 'Restore Chef'}
        </button>
      )}
    </div>
  );
}
