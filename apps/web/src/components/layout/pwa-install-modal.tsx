'use client';

import React from 'react';
import Image from 'next/image';
import { usePwaInstall } from '@/contexts/pwa-install-context';
import { Button } from '@ridendine/ui';

export function PwaInstallModal() {
  const { showIosModal, setShowIosModal, isIos } = usePwaInstall();

  if (!showIosModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-modal flex items-end justify-center p-4 sm:items-center"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setShowIosModal(false)}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-fade-in-up">
        {/* Header with App Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-icon.png"
              alt="RideNDine"
              width={52}
              height={52}
              className="h-12 w-12 rounded-xl border border-border bg-surface shadow-sm object-contain"
            />
            <div>
              <h3 id="install-modal-title" className="font-display text-lg font-bold text-text">
                Install RideNDine App
              </h3>
              <p className="text-xs text-textMuted">Fast ordering & live tracking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIosModal(false)}
            className="rounded-lg p-1.5 text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content depending on iOS vs other */}
        {isIos ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-textMuted">
              Install RideNDine on your iPhone or iPad for a full-screen app experience:
            </p>

            <div className="space-y-3 rounded-xl border border-border bg-surfaceMuted p-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  1
                </span>
                <div>
                  <p className="font-semibold text-text">Tap the Share button</p>
                  <p className="text-xs text-textMuted">
                    Look for the <span className="inline-block rounded bg-surface px-1 py-0.5 font-medium text-text">Share 📤</span> icon at the bottom of your Safari screen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <p className="font-semibold text-text">Select &ldquo;Add to Home Screen&rdquo;</p>
                  <p className="text-xs text-textMuted">
                    Scroll down the options list and tap <span className="inline-block rounded bg-surface px-1 py-0.5 font-medium text-text">Add to Home Screen ➕</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  3
                </span>
                <div>
                  <p className="font-semibold text-text">Tap &ldquo;Add&rdquo;</p>
                  <p className="text-xs text-textMuted">
                    Tap <span className="inline-block rounded bg-surface px-1 py-0.5 font-medium text-text">Add</span> in the top-right corner to place RideNDine on your home screen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-textMuted">
              Install RideNDine directly to your device for instant launch and push notifications:
            </p>

            <div className="space-y-3 rounded-xl border border-border bg-surfaceMuted p-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  1
                </span>
                <div>
                  <p className="font-semibold text-text">Click the Install icon</p>
                  <p className="text-xs text-textMuted">
                    Look for the install button <span className="inline-block rounded bg-surface px-1 py-0.5 font-mono text-xs">⊕</span> in your browser&apos;s address bar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <p className="font-semibold text-text">Confirm installation</p>
                  <p className="text-xs text-textMuted">
                    Click &ldquo;Install&rdquo; to add RideNDine as a standalone application on your home screen or desktop.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="primary" fullWidth onClick={() => setShowIosModal(false)}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
