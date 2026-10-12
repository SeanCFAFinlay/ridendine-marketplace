'use client';

import React, { useState } from 'react';
import { Button, Modal } from '@ridendine/ui';
import { formatCurrency } from '@ridendine/utils';

export interface TaxReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderTaxReceiptProps {
  orderNumber: string;
  createdAt: string;
  storefrontName: string;
  customerName?: string;
  deliveryAddress?: string;
  subtotal: number;
  deliveryFee: number;
  tip: number;
  tax: number;
  total: number;
  craBusinessNumber?: string;
}

export function OrderTaxReceiptModal({
  orderNumber,
  createdAt,
  storefrontName,
  customerName,
  deliveryAddress,
  subtotal,
  deliveryFee,
  tip,
  tax,
  total,
  craBusinessNumber = 'BN 789123456 RT0001',
}: OrderTaxReceiptProps) {
  const [isOpen, setIsOpen] = useState(false);

  // In Ontario, HST is 13% (5% Federal GST + 8% Provincial PST)
  const gstShare = tax * (5 / 13);
  const pstShare = tax * (8 / 13);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 text-xs font-semibold"
      >
        <svg
          className="h-4 w-4 text-textMuted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Official CRA Tax Receipt
      </Button>

      {isOpen && (
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Official Tax Invoice & Receipt"
          className="max-w-lg"
        >
          <div className="space-y-4 text-left p-2 printable-receipt">
            {/* Header info */}
            <div className="border-b border-border pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-text">Ride-N-Dine Ontario Corp.</h3>
                  <p className="text-xs text-textMuted">Ontario Marketplace Platform</p>
                  <p className="text-xs font-mono font-medium text-primary mt-1">
                    CRA Registration: {craBusinessNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-surfaceMuted px-2 py-1 text-xs font-mono font-bold text-text">
                    Order #{orderNumber}
                  </span>
                  <p className="text-[11px] text-textMuted mt-1">
                    {new Date(createdAt).toLocaleDateString('en-CA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Merchant / Kitchen */}
            <div className="rounded-lg bg-surfaceMuted p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-textMuted">Fulfilling Kitchen:</span>
                <span className="font-semibold text-text">{storefrontName}</span>
              </div>
              {customerName && (
                <div className="flex justify-between">
                  <span className="text-textMuted">Diner:</span>
                  <span className="text-text">{customerName}</span>
                </div>
              )}
              {deliveryAddress && (
                <div className="flex justify-between">
                  <span className="text-textMuted">Dropoff:</span>
                  <span className="text-text truncate max-w-[200px]">{deliveryAddress}</span>
                </div>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 border-b border-border pb-3 text-sm">
              <div className="flex justify-between text-textMuted">
                <span>Food & Beverage Subtotal</span>
                <span className="font-mono text-text">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-textMuted">
                <span>Ontario Delivery Fee</span>
                <span className="font-mono text-text">{formatCurrency(deliveryFee)}</span>
              </div>
              {tip > 0 && (
                <div className="flex justify-between text-textMuted">
                  <span>Courier Gratuity (Direct)</span>
                  <span className="font-mono text-text">{formatCurrency(tip)}</span>
                </div>
              )}

              {/* Ontario 13% HST Section */}
              <div className="pt-2 border-t border-dashed border-border/60">
                <div className="flex justify-between font-medium text-text">
                  <span>Harmonized Sales Tax (13.00% HST)</span>
                  <span className="font-mono">{formatCurrency(tax)}</span>
                </div>
                <div className="text-[11px] text-textMuted flex justify-between pl-3 mt-0.5">
                  <span>• Federal Component (5.00% GST)</span>
                  <span className="font-mono">{formatCurrency(gstShare)}</span>
                </div>
                <div className="text-[11px] text-textMuted flex justify-between pl-3">
                  <span>• Ontario Component (8.00% PST)</span>
                  <span className="font-mono">{formatCurrency(pstShare)}</span>
                </div>
              </div>
            </div>

            {/* Total Paid */}
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-base font-bold text-text">Total Paid (CAD)</span>
              <span className="text-xl font-bold font-mono text-primary">
                {formatCurrency(total)}
              </span>
            </div>

            <p className="text-[10px] text-center text-textMuted pt-2">
              Statutory invoice issued pursuant to Canada Revenue Agency (CRA) guidelines for electronic marketplace platforms operating in Ontario.
            </p>

            <div className="flex gap-2 pt-2 justify-end">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button variant="primary" onClick={handlePrint}>
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
