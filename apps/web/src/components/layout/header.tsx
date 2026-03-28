'use client';

import Link from 'next/link';
import { useAuthContext } from '@ridendine/auth';
import { Button, Avatar, Badge } from '@ridendine/ui';
import { useCart } from '@/contexts/cart-context';

export function Header() {
  const { user, loading } = useAuthContext();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold text-brand-600">Ridendine</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/chefs"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Browse Chefs
          </Link>
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            How It Works
          </Link>
        </nav>

        {/* Auth / User Menu */}
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-100" />
          ) : user ? (
            <>
              <Link href="/cart" className="relative">
                <svg
                  className="h-6 w-6 text-gray-600 hover:text-gray-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {itemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center bg-[#E85D26] text-white text-xs p-0 rounded-full">
                    {itemCount > 9 ? '9+' : itemCount}
                  </Badge>
                )}
              </Link>
              <Link href="/account">
                <Avatar
                  src={user.user_metadata?.avatar_url}
                  alt={user.email || 'User'}
                  fallback={user.email?.slice(0, 2) || 'U'}
                  size="sm"
                />
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
