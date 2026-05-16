'use client';

import * as React from 'react';
import { Logo } from '../assets/logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /**
   * @deprecated The brand is unified — every app's auth page now renders the
   * same visual treatment. Kept in the type only for backward-compat callers.
   */
  variant?: 'customer' | 'chef' | 'ops' | 'driver';
  /** Optional badge text shown below the logo (e.g. "Closed Beta"). */
  badgeText?: string;
  /** Override the default brand wordmark — pass a custom node only if you must. */
  logo?: React.ReactNode;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  badgeText,
  logo,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-narrow rounded-2xl bg-surface p-8 shadow-lg">
        <div className="text-center">
          <div className="inline-block">{logo ?? <Logo height={36} />}</div>
          {badgeText && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primarySoft px-3 py-1 text-xs font-semibold text-primary">
              {badgeText}
            </div>
          )}
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-base leading-relaxed text-textMuted">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
