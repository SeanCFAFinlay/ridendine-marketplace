'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@ridendine/ui';
import {
  ORDER_STATUS,
  VALID_ORDER_TRANSITIONS,
  ORDER_STATUS_LABELS,
  type OrderStatusType,
} from '@ridendine/engine';

interface OrderStatusActionsProps {
  orderId: string;
  currentStatus: string;
}

export function OrderStatusActions({
  orderId,
  currentStatus,
}: OrderStatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validTransitions =
    VALID_ORDER_TRANSITIONS[currentStatus as OrderStatusType] || [];

  const handleStatusUpdate = async (newStatus: OrderStatusType) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`);
        router.refresh();
      } else {
        setError(result.error || 'Failed to update status');
      }
    } catch (err) {
      setError('Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusButtonStyle = (status: OrderStatusType): string => {
    const styles: Record<string, string> = {
      accepted: 'bg-blue-600 hover:bg-blue-700',
      rejected: 'bg-red-600 hover:bg-red-700',
      preparing: 'bg-purple-600 hover:bg-purple-700',
      ready_for_pickup: 'bg-indigo-600 hover:bg-indigo-700',
      picked_up: 'bg-cyan-600 hover:bg-cyan-700',
      in_transit: 'bg-cyan-600 hover:bg-cyan-700',
      delivered: 'bg-green-600 hover:bg-green-700',
      completed: 'bg-green-600 hover:bg-green-700',
      cancelled: 'bg-red-600 hover:bg-red-700',
      refunded: 'bg-gray-600 hover:bg-gray-700',
    };
    return styles[status] || 'bg-gray-600 hover:bg-gray-700';
  };

  const isTerminal = ['completed', 'cancelled', 'rejected', 'refunded'].includes(
    currentStatus
  );

  return (
    <Card className="border-gray-800 bg-[#16213e] p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Order Actions</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      {isTerminal ? (
        <p className="text-gray-400">
          This order is in a terminal state ({currentStatus}) and cannot be modified.
        </p>
      ) : validTransitions.length === 0 ? (
        <p className="text-gray-400">No status transitions available.</p>
      ) : (
        <>
          <p className="text-gray-400 mb-4">
            Current status:{' '}
            <span className="text-white font-medium">
              {ORDER_STATUS_LABELS[currentStatus as OrderStatusType] || currentStatus}
            </span>
          </p>
          <div className="flex flex-wrap gap-3">
            {validTransitions.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusUpdate(status)}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getStatusButtonStyle(
                  status
                )}`}
              >
                {loading ? 'Updating...' : `Mark as ${ORDER_STATUS_LABELS[status]}`}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Print Order
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(orderId);
              setSuccess('Order ID copied to clipboard');
            }}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Copy Order ID
          </button>
        </div>
      </div>
    </Card>
  );
}
