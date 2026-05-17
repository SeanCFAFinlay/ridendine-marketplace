'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SupportTicketActionsProps = {
  ticketId: string;
  status: string;
};

export function SupportTicketActions({ ticketId, status }: SupportTicketActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function runAction(action: 'start_review' | 'resolve') {
    setBusy(action);
    setError('');
    try {
      const response = await fetch(`/api/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update ticket');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    } finally {
      setBusy(null);
    }
  }

  const canStart = status === 'open';
  const canResolve = status === 'open' || status === 'in_progress';

  if (!canStart && !canResolve) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {canStart && (
        <button
          type="button"
          onClick={() => runAction('start_review')}
          disabled={busy !== null}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-textSubtle hover:bg-surfaceMuted disabled:opacity-50"
        >
          {busy === 'start_review' ? 'Starting...' : 'Start Review'}
        </button>
      )}
      {canResolve && (
        <button
          type="button"
          onClick={() => runAction('resolve')}
          disabled={busy !== null}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {busy === 'resolve' ? 'Resolving...' : 'Resolve'}
        </button>
      )}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
