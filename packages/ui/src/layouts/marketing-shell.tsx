'use client';

import * as React from 'react';
import { cn } from '../utils';
import { Logo } from '../assets/logo';

export interface MarketingNavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface MarketingShellProps {
  children: React.ReactNode;
  /** Primary nav links rendered between the logo and the CTAs. */
  navItems?: MarketingNavItem[];
  /** Optional CTAs (right side of nav). Pass `<Button>` instances. */
  cta?: React.ReactNode;
  /** Optional announcement banner rendered above the nav (e.g. "Closed Beta"). */
  announcement?: React.ReactNode;
  /** Where the logo links to. Defaults to "/". */
  logoHref?: string;
  /** Page footer. Apps may render their own; this slot replaces the default. */
  footer?: React.ReactNode;
  className?: string;
}

export function MarketingShell({
  children,
  navItems = [],
  cta,
  announcement,
  logoHref = '/',
  footer,
  className,
}: MarketingShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <div className={cn('flex min-h-screen flex-col bg-background text-text', className)}>
      {announcement && (
        <div className="bg-warningSoft text-warning text-sm py-2 text-center">
          {announcement}
        </div>
      )}
      <header className="sticky top-0 z-sticky border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-6 md:px-8">
          <a
            href={logoHref}
            className="inline-flex items-center focus-visible:outline-none focus-visible:shadow-focus rounded-sm"
            aria-label="RideNDine — home"
          >
            <Logo height={30} title="RideNDine — home" />
          </a>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors',
                  item.active ? 'text-primary' : 'text-text hover:text-primary',
                )}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">{cta}</div>

          <button
            type="button"
            className="rounded-md p-2 text-text hover:bg-surfaceMuted md:hidden focus-visible:outline-none focus-visible:shadow-focus"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {drawerOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {drawerOpen && (
          <div className="border-t border-border bg-surface md:hidden">
            <nav className="flex flex-col gap-1 px-6 py-4" aria-label="Mobile">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-2 text-base font-medium transition-colors',
                    item.active
                      ? 'bg-primarySoft text-primary'
                      : 'text-text hover:bg-surfaceMuted',
                  )}
                  aria-current={item.active ? 'page' : undefined}
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              {cta && (
                <div className="mt-3 flex flex-col gap-2 border-t border-divider pt-3">
                  {cta}
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {footer ?? <DefaultFooter />}
    </div>
  );
}

function DefaultFooter() {
  return (
    <footer className="border-t border-border bg-surfaceMuted py-16 text-sm text-textMuted">
      <div className="mx-auto max-w-content px-6 md:px-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo height={28} />
          </div>
          <p>© {new Date().getFullYear()} RideNDine. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
