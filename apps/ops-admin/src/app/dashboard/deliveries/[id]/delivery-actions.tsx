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
  drivers: DriverOption[];
};

export function DeliveryActions({
  deliveryId,
  currentStatus,
  assignedDriverId,
  drivers,
}: DeliveryActionsProps) {
  const router = useRouter();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTerminal = ['delivered', 'cancelled', 'failed'].includes(currentStatus);
  const availableDrivers = drivers.filter((driver) => driver.status === 'approved');

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
        setError(
          result?.error?.message ||
            result?.error ||
            'Dispatch action failed'
        );
        return;
      }

      setShowAssignModal(false);
      setSelectedDriverId('');
      router.refresh();
    } catch {
      setError('Dispatch action failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-700 bg-[#1a1a2e] p-4">
          <h3 className="text-sm font-semibold text-white">Dispatch Controls</h3>
          <p className="mt-2 text-sm text-gray-400">
            Driver assignment and reassignment are real engine-backed actions.
            Delivery status changes remain owned by the live workflow and are not
            overridden from this page.
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
              onClick={() => setShowAssignModal(true)}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a]"
            >
              {assignedDriverId ? 'Reassign Driver' : 'Assign Driver'}
            </button>
          )}

          {!isTerminal && !assignedDriverId && (
            <button
              type="button"
              onClick={() =>
                void runDispatchAction({
                  action: 'retry_assignment',
                  deliveryId,
                })
              }
              disabled={submitting}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Running…' : 'Run Auto-Assign'}
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setError(null);
        }}
        title={assignedDriverId ? 'Reassign Driver' : 'Assign Driver'}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Select Driver
            </label>
            <select
              value={selectedDriverId}
              onChange={(event) => setSelectedDriverId(event.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-[#0d1528] px-3 py-2 text-white focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
            >
              <option value="">Choose a driver...</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.first_name} {driver.last_name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                void runDispatchAction({
                  action: 'manual_assign',
                  deliveryId,
                  driverId: selectedDriverId,
                })
              }
              disabled={!selectedDriverId || submitting}
              className="rounded-lg bg-[#E85D26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a] disabled:opacity-50"
            >
              {submitting ? 'Saving…' : assignedDriverId ? 'Reassign' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
