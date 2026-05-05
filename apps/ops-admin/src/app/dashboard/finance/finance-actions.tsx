'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type RefundCase = {
  id: string;
  orderNumber: string;
  amountCents: number;
  customerName: string;
  reason?: string | null;
  status: string;
};

type Adjustment = {
  id: string;
  payeeType: string;
  amountCents: number;
  adjustmentType: string;
  orderNumber: string;
};

export function FinanceActions({
  refunds,
  adjustments,
}: {
  refunds: RefundCase[];
  adjustments: Adjustment[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(payload: Record<string, string | number>) {
    setBusyId(String(payload.refundCaseId ?? payload.adjustmentId ?? 'finance'));
    setError(null);
    try {
      const response = await fetch('/api/engine/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        setError(result?.error?.message || 'Finance action failed');
        return;
      }
      router.refresh();
    } catch {
      setError('Finance action failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {refunds.map((refund) => (
            <div key={refund.id} className="rounded-lg bg-opsPanel p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white">Order {refund.orderNumber}</p>
                  <p className="text-sm text-gray-400">{refund.customerName}</p>
                  <p className="mt-1 text-sm text-gray-500">{refund.reason || 'No reason supplied'}</p>
                </div>
                <span className="text-lg font-semibold text-red-200">
                  ${(refund.amountCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    void runAction({
                      action: 'approve_refund',
                      refundCaseId: refund.id,
                      approvedAmountCents: refund.amountCents,
                    })
                  }
                  disabled={busyId === refund.id}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    void runAction({
                      action: 'deny_refund',
                      refundCaseId: refund.id,
                      reason: 'Denied by finance review',
                    })
                  }
                  disabled={busyId === refund.id}
                  className="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
          {refunds.length === 0 && (
            <div className="rounded-lg bg-opsPanel p-6 text-sm text-gray-500">
              No refund cases awaiting review.
            </div>
          )}
        </div>

        <div className="space-y-3">
          {adjustments.map((adjustment) => (
            <div key={adjustment.id} className="rounded-lg bg-opsPanel p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-white">
                    {adjustment.payeeType} {adjustment.adjustmentType.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-gray-500">Order {adjustment.orderNumber}</p>
                </div>
                <span className="text-lg font-semibold text-yellow-200">
                  ${(adjustment.amountCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="mt-3">
                <button
                  onClick={() =>
                    void runAction({
                      action: 'release_payout_hold',
                      adjustmentId: adjustment.id,
                    })
                  }
                  disabled={busyId === adjustment.id}
                  className="rounded-lg bg-[#E85D26] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Release Hold
                </button>
              </div>
            </div>
          ))}
          {adjustments.length === 0 && (
            <div className="rounded-lg bg-opsPanel p-6 text-sm text-gray-500">
              No payout adjustments are pending release.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
