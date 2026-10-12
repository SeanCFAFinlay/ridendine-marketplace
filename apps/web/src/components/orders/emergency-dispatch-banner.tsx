'use client';

import React from 'react';

interface EmergencyDispatchBannerProps {
  orderNumber: string;
  phone?: string;
  isOrderActive?: boolean;
}

export function EmergencyDispatchBanner({
  orderNumber,
  phone = '+1 (905) 555-0199',
  isOrderActive = true,
}: EmergencyDispatchBannerProps) {
  if (!isOrderActive) return null;

  const rawPhone = phone.replace(/[^0-9+]/g, '');

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">Live Dispatch Emergency Hotline</h4>
            <p className="text-xs text-textMuted mt-0.5">
              Need immediate help with Order #{orderNumber}? Our Ontario dispatch team is on standby.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-center">
          <a
            href={`tel:${rawPhone}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-500 transition-colors"
          >
            <span>Call Hotline</span>
          </a>
          <a
            href={`sms:${rawPhone}?body=Regarding%20Order%20%23${encodeURIComponent(orderNumber)}:`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-textSubtle hover:text-text transition-colors"
          >
            <span>Text Dispatch</span>
          </a>
        </div>
      </div>
    </div>
  );
}
