'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePwaInstall } from '@/contexts/pwa-install-context';

export function InstallAppBanner() {
  const { isInstalled, triggerInstall, isInstallable } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true); // default true until hydrated

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const wasDismissed = sessionStorage.getItem('ridendine_install_banner_dismissed');
      setDismissed(Boolean(wasDismissed));
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('ridendine_install_banner_dismissed', 'true');
    } catch {
      // Ignore storage errors
    }
  };

  // Don't show if already installed, dismissed, or not ready
  if (isInstalled || dismissed) return null;

  return (
    <aside
      data-testid="install-app-banner"
      aria-label="Install RideNDine App banner"
      className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-surface px-3 py-2.5 sm:px-4"
    >
      <div className="container flex items-center justify-between gap-3">
        {/* Left info */}
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo-icon.png"
            alt="RideNDine App"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-lg border border-border bg-surface object-contain shadow-xs"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-bold text-text">Get the RideNDine App</span>
              <span className="hidden rounded-full bg-primarySoft px-1.5 py-0.2 text-[9px] font-semibold text-primary sm:inline-block">
                Free
              </span>
            </div>
            <p className="truncate text-[11px] text-textMuted">
              Fast ordering, order tracking, and live updates
            </p>
          </div>
        </div>

        {/* Right CTA + Dismiss */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={triggerInstall}
            aria-label="Install RideNDine App"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:shadow-focus"
          >
            {isInstallable ? 'Install' : 'Download'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss app install banner"
            className="flex h-7 w-7 items-center justify-center rounded-md text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
