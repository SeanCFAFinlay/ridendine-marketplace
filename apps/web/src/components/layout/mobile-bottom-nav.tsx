'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/contexts/cart-context';
import { useAuthContext } from '@ridendine/auth';

/**
 * MobileAppBottomNav
 *
 * Fixed bottom application tab bar for mobile viewports (hidden on desktop screens).
 * Provides single-tap thumb navigation between primary consumer hubs:
 * - Explore (Home / Chefs Directory)
 * - Saved (Customer Favorites)
 * - Cart (Live cart with dynamic reactive badge)
 * - Orders (Active order tracking & history)
 * - Profile / Sign In
 *
 * Automatically suppresses itself on focused flows:
 * - `/checkout` (distraction-free payment funnel)
 * - `/auth/*` (login and registration screens)
 * - `/chefs/[slug]` (specific chef menus display their own sticky "View Cart" bar)
 */
export function MobileAppBottomNav() {
  const pathname = usePathname() || '/';
  const { itemCount } = useCart();
  const { user } = useAuthContext();

  // Route suppression logic
  const isStorefront = /^\/chefs\/[^/]+$/.test(pathname);
  const isCheckout = pathname.startsWith('/checkout');
  const isAuth = pathname.startsWith('/auth');

  if (isCheckout || isAuth || isStorefront) {
    return null;
  }

  // Active tab state determinations
  const isExploreActive =
    pathname === '/' ||
    pathname === '/chefs' ||
    (pathname.startsWith('/chefs') && !isStorefront);

  const isFavoritesActive = pathname.startsWith('/account/favorites');
  const isCartActive = pathname.startsWith('/cart');
  const isOrdersActive =
    pathname.startsWith('/account/orders') ||
    (pathname.startsWith('/orders') && !pathname.includes('confirmation'));
  const isAccountActive =
    pathname === '/account' ||
    pathname.startsWith('/account/settings') ||
    pathname.startsWith('/account/addresses');

  return (
    <nav
      data-testid="mobile-app-bottom-nav"
      aria-label="Mobile app primary navigation"
      className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border bg-surface/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {/* Explore / Home */}
        <Link
          href="/chefs"
          aria-label="Explore chefs and menus"
          aria-current={isExploreActive ? 'page' : undefined}
          className={`flex min-w-[3.5rem] flex-1 flex-col items-center justify-center py-1 px-1 transition-colors select-none ${
            isExploreActive ? 'text-primary' : 'text-textMuted hover:text-text'
          }`}
        >
          <svg
            className="h-5 w-5"
            fill={isExploreActive ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={isExploreActive ? 1.5 : 2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span
            className={`mt-1 text-[10px] leading-none tracking-tight ${
              isExploreActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Explore
          </span>
        </Link>

        {/* Favorites */}
        <Link
          href={user ? '/account/favorites' : '/auth/login?redirect=/account/favorites'}
          aria-label="Saved chefs and favorites"
          aria-current={isFavoritesActive ? 'page' : undefined}
          className={`flex min-w-[3.5rem] flex-1 flex-col items-center justify-center py-1 px-1 transition-colors select-none ${
            isFavoritesActive ? 'text-primary' : 'text-textMuted hover:text-text'
          }`}
        >
          <svg
            className="h-5 w-5"
            fill={isFavoritesActive ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={isFavoritesActive ? 1.5 : 2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span
            className={`mt-1 text-[10px] leading-none tracking-tight ${
              isFavoritesActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Saved
          </span>
        </Link>

        {/* Cart */}
        <Link
          href="/cart"
          aria-label="Shopping Cart"
          aria-current={isCartActive ? 'page' : undefined}
          className={`relative flex min-w-[3.5rem] flex-1 flex-col items-center justify-center py-1 px-1 transition-colors select-none ${
            isCartActive ? 'text-primary' : 'text-textMuted hover:text-text'
          }`}
        >
          <div className="relative">
            <svg
              className="h-5 w-5"
              fill={isCartActive ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={isCartActive ? 1.5 : 2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            {itemCount > 0 && (
              <span
                data-testid="mobile-bottom-nav-cart-badge"
                className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-primaryFg shadow-sm animate-badge-bounce"
              >
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          <span
            className={`mt-1 text-[10px] leading-none tracking-tight ${
              isCartActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Cart
          </span>
        </Link>

        {/* Orders */}
        <Link
          href={user ? '/account/orders' : '/auth/login?redirect=/account/orders'}
          aria-label="Order history and tracking"
          aria-current={isOrdersActive ? 'page' : undefined}
          className={`flex min-w-[3.5rem] flex-1 flex-col items-center justify-center py-1 px-1 transition-colors select-none ${
            isOrdersActive ? 'text-primary' : 'text-textMuted hover:text-text'
          }`}
        >
          <svg
            className="h-5 w-5"
            fill={isOrdersActive ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={isOrdersActive ? 1.5 : 2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <span
            className={`mt-1 text-[10px] leading-none tracking-tight ${
              isOrdersActive ? 'font-bold' : 'font-medium'
            }`}
          >
            Orders
          </span>
        </Link>

        {/* Account / Profile */}
        <Link
          href={user ? '/account' : '/auth/login?redirect=/account'}
          aria-label="Account profile and settings"
          aria-current={isAccountActive ? 'page' : undefined}
          className={`flex min-w-[3.5rem] flex-1 flex-col items-center justify-center py-1 px-1 transition-colors select-none ${
            isAccountActive ? 'text-primary' : 'text-textMuted hover:text-text'
          }`}
        >
          <svg
            className="h-5 w-5"
            fill={isAccountActive ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={isAccountActive ? 1.5 : 2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span
            className={`mt-1 text-[10px] leading-none tracking-tight ${
              isAccountActive ? 'font-bold' : 'font-medium'
            }`}
          >
            {user ? 'Account' : 'Sign In'}
          </span>
        </Link>
      </div>
    </nav>
  );
}
