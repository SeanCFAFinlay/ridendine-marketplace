'use client';

import * as React from 'react';
import { cn } from '../utils';
import { Logo } from '../assets/logo';

export interface AppShellNavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface AppShellNavGroup {
  label?: string;
  items: AppShellNavItem[];
}

export interface AppShellProps {
  children: React.ReactNode;
  /** Sidebar navigation. Accepts a flat list or grouped items. */
  nav: AppShellNavItem[] | AppShellNavGroup[];
  /** Topbar slot — breadcrumb or page label, left of the search/menu cluster. */
  topbarLeft?: React.ReactNode;
  /** Topbar slot — usually a search field. */
  topbarCenter?: React.ReactNode;
  /** Topbar slot — user menu / notifications. */
  topbarRight?: React.ReactNode;
  /** Where the logo links to (typically the app's home/dashboard). */
  logoHref?: string;
  /** Render the shell with the sidebar collapsed to an icon rail (64px). */
  collapsedSidebar?: boolean;
  className?: string;
}

function isGrouped(
  nav: AppShellNavItem[] | AppShellNavGroup[],
): nav is AppShellNavGroup[] {
  return nav.length > 0 && 'items' in (nav[0] as AppShellNavGroup);
}

function NavItem({
  item,
  collapsed,
}: {
  item: AppShellNavItem;
  collapsed: boolean;
}) {
  return (
    <a
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        item.active
          ? 'bg-primarySoft text-primary'
          : 'text-textMuted hover:bg-surfaceMuted hover:text-text',
      )}
      aria-current={item.active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
    >
      {item.active && (
        <span
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-primary"
          aria-hidden="true"
        />
      )}
      {item.icon && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {item.icon}
        </span>
      )}
      {!collapsed && <span className="truncate">{item.label}</span>}
    </a>
  );
}

export function AppShell({
  children,
  nav,
  topbarLeft,
  topbarCenter,
  topbarRight,
  logoHref = '/',
  collapsedSidebar = false,
  className,
}: AppShellProps) {
  const groups: AppShellNavGroup[] = isGrouped(nav) ? nav : [{ items: nav }];

  return (
    <div className={cn('flex min-h-screen bg-background text-text', className)}>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface md:flex',
          collapsedSidebar ? 'w-16' : 'w-64',
        )}
        aria-label="Primary"
      >
        <div className="flex h-16 items-center border-b border-border px-4">
          <a
            href={logoHref}
            className="inline-flex items-center focus-visible:outline-none focus-visible:shadow-focus rounded-sm"
            aria-label="RideNDine — home"
          >
            <Logo
              height={28}
              variant={collapsedSidebar ? 'icon' : 'wordmark'}
              title="RideNDine — home"
            />
          </a>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {groups.map((group, idx) => (
            <div key={idx} className={cn(idx > 0 && 'mt-6')}>
              {group.label && !collapsedSidebar && (
                <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-textSubtle">
                  {group.label}
                </h3>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.href} item={item} collapsed={collapsedSidebar} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-sticky flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-6">
          <div className="min-w-0 flex-1 truncate">{topbarLeft}</div>
          {topbarCenter && (
            <div className="hidden max-w-md flex-1 md:block">{topbarCenter}</div>
          )}
          <div className="flex shrink-0 items-center gap-3">{topbarRight}</div>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          <div className="mx-auto max-w-content px-6 py-8 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
