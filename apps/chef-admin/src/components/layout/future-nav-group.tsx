'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@ridendine/ui';
import { futureNavSection, isFutureRoute } from '@/components/layout/nav-config';

/**
 * Collapsed-by-default "Add-ons" tab holding the parked Kitchen OS tools.
 * Opens automatically when the chef is already on one of those routes so the
 * active item is never hidden.
 */
export function FutureNavGroup({
  pathname,
  renderItems,
}: {
  pathname: string;
  renderItems: (items: typeof futureNavSection.items) => ReactNode;
}) {
  const onFutureRoute = isFutureRoute(pathname);
  const [open, setOpen] = useState(onFutureRoute);

  useEffect(() => {
    if (onFutureRoute) setOpen(true);
  }, [onFutureRoute]);

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="future-nav-items"
        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
      >
        <span className="flex items-center gap-2">
          {futureNavSection.title}
          <span className="rounded-full bg-surfaceMuted px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-textMuted">
            Beta
          </span>
        </span>
        <svg
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div id="future-nav-items">
          <p className="px-3 pb-2 text-[11px] leading-snug text-textSubtle">
            Optional kitchen tools in testing. Not needed to run your orders.
          </p>
          {renderItems(futureNavSection.items)}
        </div>
      )}
    </div>
  );
}
