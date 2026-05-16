'use client';

import * as React from 'react';
import { ridendineTokens } from '../tokens';

// ── Types ──────────────────────────────────────────────────────────────────

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Override the auto-dismiss timer (ms). Pass 0 (or undefined for `error`)
   *  to never auto-dismiss. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

// ── Context ────────────────────────────────────────────────────────────────

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ── Variant styling ────────────────────────────────────────────────────────
// Stripe color sits on the left edge, the rest of the panel is `bg-surface`.

const STRIPE_COLOR: Record<ToastVariant, string> = {
  success: ridendineTokens.colors.success,
  error: ridendineTokens.colors.danger,
  warning: ridendineTokens.colors.warning,
  info: ridendineTokens.colors.info,
};

const ICON_PATH: Record<ToastVariant, string> = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  warning: 'M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

// ── Single Toast item ──────────────────────────────────────────────────────

function ToastEntry({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (toast.duration <= 0) return; // 0 = never auto-dismiss
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        'flex items-center gap-3 rounded-lg bg-surface pl-4 pr-3 py-3 shadow-lg',
        'border-l-4 text-text',
        'transition-all duration-DEFAULT ease-brand',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
      ].join(' ')}
      style={{ borderLeftColor: STRIPE_COLOR[toast.variant] }}
    >
      <svg
        className="h-5 w-5 flex-shrink-0"
        style={{ color: STRIPE_COLOR[toast.variant] }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={ICON_PATH[toast.variant]}
        />
      </svg>
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-auto rounded-md p-1 text-textMuted transition-opacity hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
        aria-label="Dismiss"
      >
        <svg
          className="h-4 w-4"
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
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────

const DEFAULT_DURATION = 5000;

function defaultDurationFor(variant: ToastVariant): number {
  // Critical / actionable variants must not vanish — user has to dismiss.
  if (variant === 'error') return 0;
  return DEFAULT_DURATION;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const showToast = React.useCallback((options: ToastOptions) => {
    const variant = options.variant ?? 'info';
    const item: ToastItem = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message: options.message,
      variant,
      duration: options.duration ?? defaultDurationFor(variant),
    };
    setToasts((prev) => [...prev, item]);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        data-testid="toast-container"
        className={[
          'fixed z-toast flex w-full max-w-sm flex-col gap-2 pointer-events-none',
          // Mobile: top-centre. Desktop: top-right.
          'top-4 left-1/2 -translate-x-1/2',
          'md:top-6 md:right-6 md:left-auto md:translate-x-0',
        ].join(' ')}
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastEntry toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
