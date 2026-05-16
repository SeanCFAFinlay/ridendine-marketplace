'use client';

import Link from 'next/link';
import { useAuthContext } from '@ridendine/auth';
import { Button, Avatar, Logo } from '@ridendine/ui';
import { useCart } from '@/contexts/cart-context';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const { user, loading } = useAuthContext();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Track previous itemCount to trigger badge bounce only when count increases
  const prevItemCount = useRef(itemCount);
  const [badgeKey, setBadgeKey] = useState(0);

  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setBadgeKey((k) => k + 1);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-surface shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
          aria-label="RideNDine — home"
        >
          <Logo height={30} />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/chefs"
            className="text-sm font-medium text-textMuted transition-colors hover:text-primary"
          >
            Browse Chefs
          </Link>
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-textMuted transition-colors hover:text-primary"
          >
            How It Works
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-textMuted transition-colors hover:text-primary"
          >
            About
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded-md bg-surfaceMuted" />
          ) : user ? (
            <>
              <Link
                href="/cart"
                className="relative rounded-md p-2 transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus"
                aria-label="Cart"
              >
                <svg
                  className="h-6 w-6 text-textMuted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {itemCount > 0 && (
                  <span
                    key={badgeKey}
                    className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primaryFg animate-badge-bounce"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
              <Link
                href="/account"
                className="rounded-full focus-visible:outline-none focus-visible:shadow-focus"
                aria-label="Account"
              >
                <Avatar
                  src={user.user_metadata?.avatar_url}
                  alt={user.email || 'User'}
                  fallback={user.email?.slice(0, 2).toUpperCase() || 'U'}
                  size="sm"
                />
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary" size="sm">
                  Sign up
                </Button>
              </Link>
            </>
          )}

          <button
            type="button"
            className="ml-1 rounded-md p-2 text-textMuted transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            <Link
              href="/chefs"
              className="rounded-md px-3 py-2 text-base font-medium text-text transition-colors hover:bg-surfaceMuted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Chefs
            </Link>
            <Link
              href="/how-it-works"
              className="rounded-md px-3 py-2 text-base font-medium text-text transition-colors hover:bg-surfaceMuted"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="/about"
              className="rounded-md px-3 py-2 text-base font-medium text-text transition-colors hover:bg-surfaceMuted"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            {!user && (
              <Link
                href="/auth/login"
                className="rounded-md px-3 py-2 text-base font-medium text-text transition-colors hover:bg-surfaceMuted"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
