'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DriverGovernanceActionsProps = {
  driverId: string;
  currentStatus: string;
};

export function DriverGovernanceActions({
  driverId,
  currentStatus,
}: DriverGovernanceActionsProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(status: string) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/drivers/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || result.error || 'Failed to update driver');
        return;
      }

      router.refresh();
    } catch {
      setError('Failed to update driver');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-textSubtle">
          Driver governance on this page is real and ops-auth gated. In the
          current implementation it still terminates in the ops driver API rather
          than a dedicated engine-owned driver governance service.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {currentStatus === 'pending' && (
          <>
            <button
              type="button"
              onClick={() => void updateStatus('approved')}
              disabled={submitting}
              className="rounded-lg bg-success px-4 py-2 text-sm text-white transition-colors hover:bg-success disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Approve Driver'}
            </button>
            <button
              type="button"
              onClick={() => void updateStatus('rejected')}
              disabled={submitting}
              className="rounded-lg bg-danger px-4 py-2 text-sm text-white transition-colors hover:bg-danger disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Reject Application'}
            </button>
          </>
        )}

        {currentStatus === 'approved' && (
          <button
            type="button"
            onClick={() => void updateStatus('suspended')}
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white transition-colors hover:bg-primary disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Suspend Driver'}
          </button>
        )}

        {currentStatus === 'suspended' && (
          <button
            type="button"
            onClick={() => void updateStatus('approved')}
            disabled={submitting}
            className="rounded-lg bg-success px-4 py-2 text-sm text-white transition-colors hover:bg-success disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Restore Driver'}
          </button>
        )}
      </div>
    </div>
  );
}
