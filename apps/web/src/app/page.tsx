import Link from 'next/link';
import { Button } from '@ridendine/ui';
import { Header } from '@/components/layout/header';
import { FeaturedChefs } from '@/components/home/featured-chefs';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-brand-50 to-brand-100 py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Home-Cooked Meals,{' '}
              <span className="text-brand-600">Delivered Fresh</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600">
              Discover authentic, home-cooked meals from talented local chefs in your
              neighborhood. Support home chefs while enjoying delicious food.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/chefs">
                <Button size="lg">Browse Chefs</Button>
              </Link>
              <Link href="/auth/signup?role=chef">
                <Button size="lg" variant="outline">
                  Become a Chef
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            How Ridendine Works
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-semibold">Discover</h3>
              <p className="mt-2 text-gray-600">
                Browse local home chefs and explore their unique menus and cuisines.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-semibold">Order</h3>
              <p className="mt-2 text-gray-600">
                Select your favorite dishes and place your order with just a few taps.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-semibold">Enjoy</h3>
              <p className="mt-2 text-gray-600">
                Get fresh, home-cooked meals delivered right to your door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Chefs */}
      <section className="bg-gray-100 py-20">
        <div className="container">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-gray-900">Featured Chefs</h2>
            <Link href="/chefs" className="text-brand-600 hover:text-brand-700">
              View all chefs →
            </Link>
          </div>
          <div className="mt-8">
            <FeaturedChefs />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="rounded-2xl bg-brand-600 px-8 py-12 text-center text-white md:px-16 md:py-20">
            <h2 className="text-3xl font-bold">Ready to Share Your Cooking?</h2>
            <p className="mt-4 text-lg text-brand-100">
              Join our community of home chefs and start earning doing what you love.
            </p>
            <Link href="/auth/signup?role=chef">
              <Button size="lg" variant="secondary" className="mt-8">
                Apply to Become a Chef
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-lg font-semibold text-brand-600">Ridendine</h3>
              <p className="mt-2 text-sm text-gray-600">
                Connecting food lovers with talented home chefs.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">For Customers</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                <li><Link href="/chefs" className="hover:text-brand-600">Browse Chefs</Link></li>
                <li><Link href="/how-it-works" className="hover:text-brand-600">How It Works</Link></li>
                <li><Link href="/account/orders" className="hover:text-brand-600">My Orders</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">For Chefs</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                <li><Link href="/auth/signup?role=chef" className="hover:text-brand-600">Become a Chef</Link></li>
                <li><Link href="/chef-resources" className="hover:text-brand-600">Chef Resources</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Company</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-brand-600">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-brand-600">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-brand-600">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-brand-600">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Ridendine. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
