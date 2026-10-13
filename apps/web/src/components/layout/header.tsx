'use client';

import Link from 'next/link';
import { useAuthContext } from '@ridendine/auth';
import { Button, Avatar, Logo } from '@ridendine/ui';
import { useCart } from '@/contexts/cart-context';
import { useState, useRef, useEffect } from 'react';

export function Header() {
  const { user, loading, signOut } = useAuthContext();
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

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-sticky border-b border-border bg-surface/95 backdrop-blur-md shadow-sm">
        <div className="container flex h-16 items-center justify-between gap-3">
          {/* Brand Logo & Location Tag */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
              aria-label="RideNDine — home"
            >
              <Logo height={30} />
            </Link>

            <span className="hidden items-center gap-1 rounded-full border border-border bg-surfaceMuted px-2.5 py-0.5 text-xs font-semibold text-textMuted sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Ontario
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Desktop primary navigation">
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
            <Link
              href="/download"
              className="text-sm font-medium text-textMuted transition-colors hover:text-primary"
            >
              Get the App
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Cart Icon — Always accessible for both guests and authenticated users */}
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
              aria-label="Cart"
            >
              <svg
                className="h-6 w-6"
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

            {loading ? (
              <div className="h-9 w-9 animate-pulse rounded-full bg-surfaceMuted" />
            ) : user ? (
              <Link
                href="/account"
                className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:shadow-focus"
                aria-label="Account"
              >
                <Avatar
                  src={user.user_metadata?.avatar_url}
                  alt={user.email || 'User'}
                  fallback={user.email?.slice(0, 2).toUpperCase() || 'U'}
                  size="sm"
                />
              </Link>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button variant="primary" size="sm">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Drawer Toggle */}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-textMuted transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
          </div>
        </div>
      </header>

      {/* Enhanced Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-modal md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl">
            {/* Drawer Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <Logo height={26} />
                <span className="rounded-full bg-primarySoft px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Ontario
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-textMuted hover:bg-surfaceMuted"
                aria-label="Close navigation"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User Banner / Auth Status */}
            <div className="shrink-0 border-b border-border bg-surfaceMuted/50 px-4 py-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <Avatar
                    src={user.user_metadata?.avatar_url}
                    alt={user.email || 'User'}
                    fallback={user.email?.slice(0, 2).toUpperCase() || 'U'}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text">
                      {user.user_metadata?.first_name || user.email?.split('@')[0] || 'Customer'}
                    </p>
                    <p className="truncate text-xs text-textMuted">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-textMuted">
                    Welcome to RideNDine
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/auth/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-9 items-center justify-center rounded-lg border border-border bg-surface text-center text-xs font-semibold text-text transition-colors hover:bg-surfaceMuted"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex h-9 items-center justify-center rounded-lg bg-primary text-center text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Navigation */}
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile navigation">
              <div className="space-y-4">
                {/* Marketplace Group */}
                <div>
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                    Marketplace
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    <li>
                      <Link
                        href="/chefs"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                      >
                        <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Browse Chefs
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/how-it-works"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                      >
                        <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How It Works
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/about"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                      >
                        <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        About
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/download"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg bg-primarySoft/60 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primarySoft"
                      >
                        <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download App
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Customer Hub (if authenticated) */}
                {user && (
                  <div>
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                      My Account
                    </p>
                    <ul className="flex flex-col gap-0.5">
                      <li>
                        <Link
                          href="/account/orders"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                        >
                          <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          My Orders
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/account/favorites"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                        >
                          <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          Saved Favorites
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/account/addresses"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                        >
                          <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Delivery Addresses
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/account/settings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                        >
                          <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Account Settings
                        </Link>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Partner Portals */}
                <div>
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                    Partner With Us
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    <li>
                      <Link
                        href="/chef-signup"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                      >
                        <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Become a Chef
                      </Link>
                    </li>
                    <li>
                      <a
                        href="https://driver.ridendine.ca"
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                      >
                        <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Drive with Us
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Support & Legal */}
                <div>
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                    Support
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    <li>
                      <Link
                        href="/contact"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted"
                      >
                        <svg className="h-5 w-5 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Contact & Help
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/privacy"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text"
                      >
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/terms"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text"
                      >
                        Terms of Service
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </nav>

            {/* Drawer Footer */}
            {user && (
              <div className="shrink-0 border-t border-border bg-surface p-3">
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
            )}
          </div>
        </div>
      )}
    </>
  );
}
