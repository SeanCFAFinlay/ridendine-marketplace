'use client';

import * as React from 'react';
import { cn } from '../utils';

export interface MobileTab {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
  /** Optional notification dot count. */
  badge?: number;
}

export interface MobileShellProps {
  children: React.ReactNode;
  /** Bottom tab bar items. 4-5 recommended. */
  tabs: MobileTab[];
  /** Topbar title — shown as the screen heading. */
  title?: React.ReactNode;
  /** Topbar right slot (e.g. an action button). */
  rightAction?: React.ReactNode;
  /** Top warning banner (e.g. "You are offline"). */
  banner?: React.ReactNode;
  className?: string;
}

export function MobileShell({
  children,
  tabs,
  title,
  rightAction,
  banner,
  className,
}: MobileShellProps) {
  return (
    <div className={cn('flex min-h-screen flex-col bg-background text-text', className)}>
      {banner && (
        <div className="bg-warning text-white text-sm font-medium py-2 px-4 text-center safe-top">
          {banner}
        </div>
      )}

      <header className="sticky top-0 z-sticky flex h-14 items-center justify-between gap-3 border-b border-border bg-surface px-4 safe-top">
        <div className="min-w-0 flex-1 truncate text-base font-semibold text-text">
          {title}
        </div>
        {rightAction && <div className="shrink-0">{rightAction}</div>}
      </header>

      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border bg-surface safe-bottom"
        aria-label="Primary"
      >
        <div className="flex h-16 items-stretch">
          {tabs.map((tab) => (
            <a
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 px-2 transition-colors',
                tab.active ? 'text-primary' : 'text-textMuted hover:text-text',
              )}
              aria-current={tab.active ? 'page' : undefined}
            >
              <span className="relative flex h-6 w-6 items-center justify-center">
                {tab.icon}
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1 min-w-[18px] rounded-full bg-danger px-1 text-[10px] font-semibold leading-[18px] text-white">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium">{tab.label}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
