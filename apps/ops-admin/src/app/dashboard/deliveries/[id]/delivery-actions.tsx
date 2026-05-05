'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@ridendine/ui';

type DriverOption = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
};

type DeliveryActionsProps = {
  deliveryId: string;
  currentStatus: string;
  assignedDriverId: string | null;
  openExceptionId: string | null;
  drivers: DriverOption[];
};

type ActionMode = 'assign' | 'reassign' | 'escalate' | 'cancel' | 'note' | null;

export function DeliveryActions({
  deliveryId,
  currentStatus,
  assignedDriverId,
  openExceptionId,
  drivers,
}: DeliveryActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ActionMode>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = ['delivered', 'cancelled', 'failed'].includes(currentStatus);

  async function runDispatchAction(payload: Record<string, string>) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/engine/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        setError(result?.error?.message || result?.error || 'Action failed');
        return;
      }

      setMode(null);
      setSelectedDriverId('');
      setReason('');
      router.refresh();
    } catch {
      setError('Action failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-700 bg-opsPanel p-4">
          <p className="text-sm text-gray-300">
            All interventions on this page are engine-backed and audit logged. Delivery execution status remains owned by the live workflow.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {!isTerminal && (
            <button
              type="button"
              onClick={() => setMode(assignedDriverId ? 'reassign' : 'assign')}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white"
            >
              {assignedDriverId ? 'Manual Reassign' : 'Manual Assign'}
            </button>
          )}
          {!isTerminal && (
            <button
              type="button"
              onClick={() => void runDispatchAction({ action: 'retry_assignment', deliveryId })}
              disabled={submitting}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 disabled:opacity-50"
            >
              Retry Auto-Assign
            </button>
          )}
          {!isTerminal && (
            <button
              type="button"
              onClick={() => setMode('escalate')}
              className="rounded-lg border border-yellow-500/40 px-4 py-2 text-sm text-yellow-200"
            >
              Escalate Exception
            </button>
          )}
          {openExceptionId && (
            <button
              type="button"
              onClick={() =>
                void runDispatchAction({
                  action: 'acknowledge_issue',
                  exceptionId: openExceptionId,
                })
              }
              className="rounded-lg border border-blue-500/40 px-4 py-2 text-sm text-blue-200"
            >
              Acknowledge Issue
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode('note')}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200"
          >
            Add Ops Note
          </button>
          {!isTerminal && (
            <button
              type="button"
              onClick={() => setMode('cancel')}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-200"
            >
              Cancel Delivery
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={mode !== null}
        onClose={() => {
          setMode(null);
          setError(null);
          setReason('');
          setSelectedDriverId('');
        }}
        title={
          mode === 'assign'
            ? 'Assign Driver'
            : mode === 'reassign'
              ? 'Reassign Driver'
              : mode === 'escalate'
                ? 'Escalate Delivery'
                : mode === 'cancel'
                  ? 'Cancel Delivery'
                  : 'Add Ops Note'
        }
      >
        <div className="space-y-4">
          {(mode === 'assign' || mode === 'reassign') && (
            <select
              value={selectedDriverId}
              onChange={(event) => setSelectedDriverId(event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white"
            >
              <option value="">Choose a driver...</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.first_name} {driver.last_name}
                </option>
              ))}
            </select>
          )}

          {(mode === 'reassign' || mode === 'escalate' || mode === 'cancel' || mode === 'note') && (
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder={
                mode === 'note'
                  ? 'Add the operator note'
                  : 'Add the required reason'
              }
              className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white"
            />
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300"
            >
              Close
            </button>
            <button
              type="button"
              disabled={
                submitting ||
                ((mode === 'assign' || mode === 'reassign') && !selectedDriverId) ||
                ((mode === 'reassign' || mode === 'escalate' || mode === 'cancel' || mode === 'note') &&
                  reason.trim().length < 3)
              }
              onClick={() => {
                if (mode === 'assign') {
                  void runDispatchAction({
                    action: 'manual_assign',
                    deliveryId,
                    driverId: selectedDriverId,
                  });
                } else if (mode === 'reassign') {
                  void runDispatchAction({
                    action: 'reassign',
                    deliveryId,
                    reason,
                  });
                } else if (mode === 'escalate') {
                  void runDispatchAction({
                    action: 'escalate_exception',
                    deliveryId,
                    reason,
                  });
                } else if (mode === 'cancel') {
                  void runDispatchAction({
                    action: 'cancel_delivery',
                    deliveryId,
                    reason,
                  });
                } else if (mode === 'note') {
                  void runDispatchAction({
                    action: 'add_ops_note',
                    deliveryId,
                    note: reason,
                  });
                }
              }}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
