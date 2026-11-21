'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, Logo } from '@ridendine/ui';
import { useKitchenScope } from '@/components/layout/kitchen-scope-provider';
import { FutureNavGroup } from '@/components/layout/future-nav-group';
import { isNavItemActive, primaryNavSections, type NavItem } from '@/components/layout/nav-config';

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active ? 'bg-primarySoft text-primary' : 'text-textMuted hover:bg-surfaceMuted hover:text-text',
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-primary" aria-hidden="true" />
        )}
        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
        </svg>
        {item.label}
      </Link>
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const scope = useKitchenScope();
  const activeBrand = scope?.brands.find((b) => b.id === scope.activeBrandId) ?? null;

  const isActive = (href: string) => isNavItemActive(pathname, href);

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-surface lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
          aria-label="Chef dashboard — home"
        >
          <Logo height={28} />
        </Link>
        <span className="ml-auto rounded-full bg-primarySoft px-2 py-0.5 text-xs font-medium text-primary">
          Chef
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Primary">
        {primaryNavSections.map((section) => (
          <div key={section.key} className="mb-2">
            {section.title && (
              <div className="px-3 pb-1 pt-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-textMuted">
                  {section.title}
                </span>
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </ul>
          </div>
        ))}
        <FutureNavGroup
          pathname={pathname}
          renderItems={(items) => (
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </ul>
          )}
        />
      </nav>

      {/* Footer */}
      <div className="space-y-2 border-t border-border p-3">
        {(() => {
          const isCooco =
            activeBrand?.slug === 'bep-ba-muoi' ||
            activeBrand?.slug === 'little-saigon' ||
            activeBrand?.slug === 'cooco' ||
            activeBrand?.name?.toLowerCase().includes('cooco') ||
            activeBrand?.name?.toLowerCase().includes('saigon') ||
            activeBrand?.name?.toLowerCase().includes('muối');
          if (!isCooco) return null;
          return (
            <div className="rounded-lg border border-[#57BBFF]/40 bg-gradient-to-br from-[#57BBFF]/10 via-surface to-[#EE3985]/10 p-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#EE3985] animate-pulse" />
                <span className="text-xs font-bold text-text">Cooco Partner Chef</span>
              </div>
              <p className="mt-1 text-[11px] leading-tight text-textMuted">
                {activeBrand?.name || 'Partner'} operations powered by RideNDine & Cooco
              </p>
            </div>
          );
        })()}

        <Link
          href="/app"
          className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <span>Kitchen Tablet App (QR)</span>
          </span>
          <span className="text-[10px] uppercase tracking-wider bg-primary/20 px-1.5 py-0.5 rounded">QR</span>
        </Link>

        {(() => {
          const webBaseUrl = (process.env.NEXT_PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://ridendine.ca').replace(/\/+$/, '');
          const storefrontSlug = activeBrand?.slug || (activeBrand?.name?.toLowerCase().includes('saigon') ? 'little-saigon' : 'bep-ba-muoi');
          const storefrontUrl = `${webBaseUrl}/chefs/${storefrontSlug}`;
          return (
            <Link
              href={storefrontUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View Storefront
            </Link>
          );
        })()}
      </div>
    </aside>
  );
}
