'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@ridendine/ui';

interface OrderStatusActionsProps {
  orderId: string;
  currentStatus: string;
  allowedActions: string[];
}

export function OrderStatusActions({
  orderId,
  currentStatus,
  allowedActions,
}: OrderStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const actionConfig: Record<string, { apiAction: string; label: string; success: string; className: string }> = {
    accept_order: {
      apiAction: 'accept',
      label: 'Accept Order',
      success: 'Order accepted',
      className: 'bg-info hover:bg-info',
    },
    reject_order: {
      apiAction: 'reject',
      label: 'Reject Order',
      success: 'Order rejected',
      className: 'bg-danger hover:bg-danger',
    },
    start_preparing: {
      apiAction: 'start_preparing',
      label: 'Start Preparing',
      success: 'Order moved to preparing',
      className: 'bg-info hover:bg-info',
    },
    mark_ready: {
      apiAction: 'mark_ready',
      label: 'Mark Ready',
      success: 'Order marked ready',
      className: 'bg-info hover:bg-info/90',
    },
    complete_order: {
      apiAction: 'complete',
      label: 'Complete Order',
      success: 'Order completed',
      className: 'bg-success hover:bg-success',
    },
  };

  const actionableItems = allowedActions
    .map((action) => ({ action, config: actionConfig[action] }))
    .filter((item): item is { action: string; config: { apiAction: string; label: string; success: string; className: string } } => Boolean(item.config));

  const handleAction = async (action: string, successMessage: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/engine/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(successMessage);
        router.refresh();
      } else {
        setError(result.error?.message || result.error || 'Failed to update order');
      }
    } catch {
      setError('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const isTerminal = ['completed', 'cancelled', 'rejected', 'refunded'].includes(
    currentStatus
  );

  return (
    <Card className="border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Order Actions</h2>

      {error && (
        <div className="mb-4 p-3 bg-danger/20 border border-danger rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-success/20 border border-success rounded-lg text-success text-sm">
          {success}
        </div>
      )}

      {isTerminal ? (
        <p className="text-textMuted">
          This order is in a terminal state ({currentStatus}) and cannot be modified.
        </p> 
      ) : actionableItems.length === 0 ? (
        <p className="text-textMuted">No engine-backed actions are currently available.</p>
      ) : (
        <>
          <p className="text-textMuted mb-4">
            Current status:{' '}
            <span className="text-white font-medium">{currentStatus}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            {actionableItems.map(({ action, config }) => (
              <button
                key={action}
                onClick={() => handleAction(config.apiAction, config.success)}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.className}`}
              >
                {loading ? 'Updating...' : config.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="text-sm font-medium text-textMuted mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-surfaceMuted text-white rounded-lg hover:bg-surfaceMuted transition-colors"
          >
            Print Order
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(orderId);
              setSuccess('Order ID copied to clipboard');
            }}
            className="px-4 py-2 bg-surfaceMuted text-white rounded-lg hover:bg-surfaceMuted transition-colors"
          >
            Copy Order ID
          </button>
        </div>
      </div>
    </Card>
  );
}
