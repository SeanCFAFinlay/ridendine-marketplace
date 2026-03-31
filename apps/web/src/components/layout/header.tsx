'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuthContext } from '@ridendine/auth';
import { Button, Avatar, Badge } from '@ridendine/ui';
import { useCart } from '@/contexts/cart-context';
import { useState } from 'react';

export function Header() {
  const { user, loading } = useAuthContext();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-icon.png"
            alt="RideNDine"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <span className="hidden text-xl font-bold sm:block">
            <span className="text-[#1a7a6e]">RideN</span>
            <span className="text-[#E85D26]">Dine</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/chefs"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-[#E85D26]"
          >
            Browse Chefs
          </Link>
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-[#E85D26]"
          >
            How It Works
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-[#E85D26]"
          >
            About
          </Link>
        </nav>

        {/* Auth / User Menu */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-100" />
          ) : user ? (
            <>
              <Link href="/cart" className="relative p-2">
                <svg
                  className="h-6 w-6 text-gray-600 hover:text-[#E85D26] transition-colors"
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
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E85D26] text-xs font-bold text-white">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
              <Link href="/account">
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
                <Button size="sm" className="bg-[#E85D26] hover:bg-[#d44e1e] text-white">
                  Sign up
                </Button>
              </Link>
            </>
          )}

          {/* Mobile menu button */}
          <button
            className="ml-1 rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link
              href="/chefs"
              className="text-sm font-medium text-gray-700 hover:text-[#E85D26]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse Chefs
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm font-medium text-gray-700 hover:text-[#E85D26]"
              onClick={() => setMobileMenuOpen(false)}
            >
              How It Works
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-gray-700 hover:text-[#E85D26]"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            {!user && (
              <Link
                href="/auth/login"
                className="text-sm font-medium text-gray-700 hover:text-[#E85D26]"
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
