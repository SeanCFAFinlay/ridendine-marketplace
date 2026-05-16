'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Backdrop click + ESC close the modal. Defaults to true. */
  dismissible?: boolean;
  /** Max-width of the panel. Defaults to "md" (rem-narrow). */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  dismissible = true,
  size = 'md',
}: ModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, dismissible]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 z-overlay bg-text/40 backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-modal w-full rounded-xl bg-surface p-6 shadow-xl',
          SIZE_CLASS[size],
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-text">{title}</h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
