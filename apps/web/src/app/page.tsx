import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@ridendine/ui';
import { Header } from '@/components/layout/header';
import { FeaturedChefs } from '@/components/home/featured-chefs';

// Opt out of static generation due to auth context requirements
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#fff8f4] via-white to-[#f0faf9] py-16 sm:py-24">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#E85D26]/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#1a7a6e]/5 blur-3xl" />
        </div>

        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <Image
                src="/logo.png"
                alt="RideNDine"
                width={200}
                height={260}
                className="h-auto w-40 sm:w-48"
                priority
              />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Home-Cooked Meals,{' '}
              <span className="text-[#E85D26]">Delivered Fresh</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 sm:text-xl">
              Discover authentic, home-cooked meals from talented local chefs in Hamilton.
              Support home chefs while enjoying delicious food delivered right to your door.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/chefs">
                <Button
                  size="lg"
                  className="w-full bg-[#E85D26] text-white hover:bg-[#d44e1e] sm:w-auto px-8 py-3 text-base font-semibold rounded-xl shadow-md"
                >
                  Browse Chefs
                </Button>
              </Link>
              <Link href="/auth/signup?role=chef">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-[#1a7a6e] text-[#1a7a6e] hover:bg-[#1a7a6e] hover:text-white sm:w-auto px-8 py-3 text-base font-semibold rounded-xl"
                >
                  Become a Chef
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-gray-100 pt-10">
              <div>
                <p className="text-2xl font-bold text-[#E85D26]">3</p>
                <p className="mt-1 text-sm text-gray-500">Local Chefs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E85D26]">15+</p>
                <p className="mt-1 text-sm text-gray-500">Unique Dishes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#E85D26]">Hamilton</p>
                <p className="mt-1 text-sm text-gray-500">Serving Area</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              How RideNDine Works
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From discovery to delivery in three simple steps
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="relative text-center rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0e8]">
                <svg className="h-8 w-8 text-[#E85D26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#E85D26] text-sm font-bold text-white">1</div>
              <h3 className="text-xl font-semibold text-gray-900">Discover</h3>
              <p className="mt-3 text-gray-600">
                Browse local home chefs and explore their unique menus and cuisines.
              </p>
            </div>
            <div className="relative text-center rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0e8]">
                <svg className="h-8 w-8 text-[#E85D26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#E85D26] text-sm font-bold text-white">2</div>
              <h3 className="text-xl font-semibold text-gray-900">Order</h3>
              <p className="mt-3 text-gray-600">
                Select your favourite dishes and place your order with just a few taps.
              </p>
            </div>
            <div className="relative text-center rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff0e8]">
                <svg className="h-8 w-8 text-[#E85D26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#E85D26] text-sm font-bold text-white">3</div>
              <h3 className="text-xl font-semibold text-gray-900">Enjoy</h3>
              <p className="mt-3 text-gray-600">
                Get fresh, home-cooked meals delivered right to your door by our drivers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Chefs */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Our Chefs</h2>
              <p className="mt-2 text-gray-600">Meet the talented home chefs behind RideNDine</p>
            </div>
            <Link
              href="/chefs"
              className="hidden text-sm font-medium text-[#E85D26] hover:text-[#d44e1e] sm:flex items-center gap-1"
            >
              View all chefs
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <FeaturedChefs />
          <div className="mt-8 text-center sm:hidden">
            <Link href="/chefs">
              <Button variant="outline" className="border-[#E85D26] text-[#E85D26]">
                View all chefs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Chef Spotlight */}
      <section className="py-20 bg-gradient-to-br from-[#1a7a6e] to-[#0d5c52]">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Sean */}
            <div className="rounded-2xl bg-white/10 p-8 text-white backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[#E85D26] flex items-center justify-center text-2xl font-bold text-white">S</div>
                <div>
                  <h3 className="text-xl font-bold">Sean</h3>
                  <p className="text-[#a8e6df]">Every Bite Yum</p>
                </div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                Bold comfort food made with love. Smash burgers, Nashville hot chicken, and creative Canadian-fusion dishes that make every bite count.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Comfort Food</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Canadian</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Fusion</span>
              </div>
              <Link href="/chefs/every-bite-yum" className="mt-6 inline-flex items-center text-sm font-medium text-[#E85D26] hover:text-orange-300">
                View menu →
              </Link>
            </div>

            {/* Tuan */}
            <div className="rounded-2xl bg-white/10 p-8 text-white backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[#E85D26] flex items-center justify-center text-2xl font-bold text-white">T</div>
                <div>
                  <h3 className="text-xl font-bold">Tuan</h3>
                  <p className="text-[#a8e6df]">HOÀNG GIA PHỞ</p>
                </div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                Authentic Vietnamese royal cuisine from Huế. Slow-cooked broths, hand-crafted noodle soups, and traditional dishes that bring Vietnam to your door.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Vietnamese</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Phở</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Noodle Soups</span>
              </div>
              <Link href="/chefs/hoang-gia-pho" className="mt-6 inline-flex items-center text-sm font-medium text-[#E85D26] hover:text-orange-300">
                View menu →
              </Link>
            </div>

            {/* Ryo */}
            <div className="rounded-2xl bg-white/10 p-8 text-white backdrop-blur-sm">
              <div className="mb-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-[#E85D26] flex items-center justify-center text-2xl font-bold text-white">R</div>
                <div>
                  <h3 className="text-xl font-bold">Ryo</h3>
                  <p className="text-[#a8e6df]">COOCO</p>
                </div>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                Japanese home cooking elevated. Osaka-trained precision meets Hamilton hospitality — tonkotsu ramen, gyudon, and chicken katsu curry crafted with care.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Japanese</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Ramen</span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Katsu</span>
              </div>
              <Link href="/chefs/cooco" className="mt-6 inline-flex items-center text-sm font-medium text-[#E85D26] hover:text-orange-300">
                View menu →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="rounded-3xl bg-gradient-to-br from-[#E85D26] to-[#d44e1e] px-8 py-16 text-center text-white md:px-16 md:py-20">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to Share Your Cooking?</h2>
            <p className="mt-4 text-lg text-orange-100">
              Join our community of home chefs in Hamilton and start earning doing what you love.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/signup?role=chef">
                <Button
                  size="lg"
                  className="w-full bg-white text-[#E85D26] hover:bg-orange-50 sm:w-auto px-8 py-3 font-semibold rounded-xl"
                >
                  Apply to Become a Chef
                </Button>
              </Link>
              <Link href="/chef-resources">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white text-white hover:bg-white/10 sm:w-auto px-8 py-3 font-semibold rounded-xl"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Image src="/logo-icon.png" alt="RideNDine" width={32} height={32} className="rounded-lg" />
                <span className="text-lg font-bold">
                  <span className="text-[#1a7a6e]">RideN</span>
                  <span className="text-[#E85D26]">Dine</span>
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Connecting food lovers with talented home chefs in Hamilton, ON.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">For Customers</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/chefs" className="hover:text-[#E85D26] transition-colors">Browse Chefs</Link></li>
                <li><Link href="/how-it-works" className="hover:text-[#E85D26] transition-colors">How It Works</Link></li>
                <li><Link href="/account/orders" className="hover:text-[#E85D26] transition-colors">My Orders</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">For Chefs</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/auth/signup?role=chef" className="hover:text-[#E85D26] transition-colors">Become a Chef</Link></li>
                <li><Link href="/chef-resources" className="hover:text-[#E85D26] transition-colors">Chef Resources</Link></li>
                <li><Link href="/chef-signup" className="hover:text-[#E85D26] transition-colors">Apply Now</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-[#E85D26] transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-[#E85D26] transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-[#E85D26] transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#E85D26] transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} RideNDine. All rights reserved. Hamilton, ON.
            </p>
            <p className="text-sm text-gray-400">
              Powered by local chefs, delivered with care.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
