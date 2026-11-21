'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthContext } from '@ridendine/auth';
import { Avatar, Badge, cn, Logo } from '@ridendine/ui';
import { BrandSwitcher } from '@/components/layout/brand-switcher';
import { useKitchenScope } from '@/components/layout/kitchen-scope-provider';
import { ChefAppQrModal } from '@/components/chef-app-qr-modal';
import { FutureNavGroup } from '@/components/layout/future-nav-group';
import { isNavItemActive, primaryNavSections, type NavItem } from '@/components/layout/nav-config';

export function Header() {
  const { user, signOut } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();
  const scope = useKitchenScope();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const webBaseUrl = (process.env.NEXT_PUBLIC_WEB_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://ridendine.ca').replace(/\/+$/, '');
  const activeBrand = scope?.brands.find((b) => b.id === scope.activeBrandId) ?? null;
  const storefrontSlug = activeBrand?.slug || 'bep-ba-muoi';
  const storefrontUrl = `${webBaseUrl}/chefs/${storefrontSlug}`;

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <>
      <header className="sticky top-0 z-sticky flex h-16 w-full min-w-0 items-center justify-between gap-2 sm:gap-4 border-b border-border bg-surface px-3 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="shrink-0 rounded-md p-2 text-textMuted transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus lg:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Logo for mobile */}
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus lg:hidden"
          aria-label="Chef dashboard — home"
        >
          <Logo height={28} variant="icon" />
        </Link>

        {/* Desktop title + brand switcher */}
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <h2 className="font-display text-lg font-semibold text-text">Chef Dashboard</h2>
          <Badge tone="success">Online</Badge>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#57BBFF]/40 bg-gradient-to-r from-[#57BBFF]/15 to-[#EE3985]/15 px-2.5 py-0.5 text-xs font-semibold text-[#0284c7] dark:text-[#57BBFF]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EE3985]" />
            cooco.app Partner
          </span>
          <BrandSwitcher />
          <ChefAppQrModal buttonText="📱 Tablet App (QR)" />
        </div>

        <div className="flex max-w-[calc(100vw-7rem)] shrink-0 items-center gap-2 sm:gap-4 overflow-hidden lg:max-w-none">
          <ChefAppQrModal variant="icon" />
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Avatar
              src={user?.user_metadata?.avatar_url}
              alt={user?.email || ''}
              fallback={user?.email?.slice(0, 2).toUpperCase() || 'C'}
              size="sm"
            />
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-text">
                {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Chef'}
              </p>
              <p className="text-xs text-textMuted">{user?.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-textMuted transition-colors hover:bg-surfaceMuted hover:text-danger focus-visible:outline-none focus-visible:shadow-focus sm:flex"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-modal lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl">
            {/* Drawer Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <Logo height={26} variant="wordmark" />
                <span className="rounded-full bg-primarySoft px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Chef
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-2 text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scope / Brand Switcher for mobile if available */}
            {scope && scope.brands.length > 1 && (
              <div className="shrink-0 border-b border-border bg-surfaceMuted/50 px-4 py-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-textMuted">Active Brand</p>
                <BrandSwitcher />
              </div>
            )}

            {/* Navigation Sections */}
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile primary navigation">
              {primaryNavSections.map((section) => (
                <div key={section.key} className="mb-3">
                  {section.title && (
                    <div className="px-3 pb-1 pt-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                        {section.title}
                      </span>
                    </div>
                  )}
                  <MobileNavList items={section.items} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
                </div>
              ))}
              <FutureNavGroup
                pathname={pathname}
                renderItems={(items) => (
                  <MobileNavList items={items} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
                )}
              />
            </nav>

            {/* Drawer Footer */}
            <div className="shrink-0 border-t border-border bg-surface p-3 space-y-1">
              <Link
                href="/app"
                onClick={() => setMobileMenuOpen(false)}
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
              <Link
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Storefront
              </Link>
              <Link
                href={webBaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                View Marketplace
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-dangerSoft"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileNavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = isNavItemActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primarySoft text-primary'
                  : 'text-textMuted hover:bg-surfaceMuted hover:text-text',
              )}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
