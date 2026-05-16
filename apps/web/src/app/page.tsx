import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, Logo } from '@ridendine/ui';
import { Header } from '@/components/layout/header';
import { FeaturedChefs } from '@/components/home/featured-chefs';
import { ScrollRevealSection } from '@/components/home/scroll-reveal-section';
import { createAdminClient } from '@ridendine/db';

// Opt out of static generation due to auth context requirements
export const dynamic = 'force-dynamic';

async function fetchHomeStats(): Promise<{ activeChefs: number; liveMenuItems: number }> {
  try {
    const admin = createAdminClient();

    const [chefsRes, menuRes] = await Promise.all([
      admin
        .from('chef_storefronts')
        .select('id, chef_profiles!inner(status)', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('chef_profiles.status', 'approved'),
      admin
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_available', true)
        .eq('is_sold_out', false),
    ]);

    return {
      activeChefs: chefsRes.count ?? 0,
      liveMenuItems: menuRes.count ?? 0,
    };
  } catch {
    return { activeChefs: 0, liveMenuItems: 0 };
  }
}

export const metadata: Metadata = {
  title: 'RideNDine - Chef-First Food Delivery',
  description: 'Order delicious home-cooked meals from local chefs in Hamilton, ON. RideNDine connects you with talented home chefs for authentic, chef-made food delivered to your door.',
  openGraph: {
    title: 'RideNDine - Chef-First Food Delivery',
    description: 'Home-cooked meals from local chefs, delivered to your door.',
    type: 'website',
    siteName: 'RideNDine',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RideNDine - Chef-First Food Delivery',
    description: 'Home-cooked meals from local chefs, delivered to your door.',
  },
};

export default async function HomePage() {
  const { activeChefs, liveMenuItems } = await fetchHomeStats();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Closed-beta test-mode banner */}
      <div className="bg-warningSoft border-b border-warning/20 px-4 py-2.5 text-center text-sm text-warning">
        <span className="font-semibold">Closed Beta</span> — This is a test environment. To place a test order, use the demo card{' '}
        <span className="rounded bg-surface/70 px-1.5 py-0.5 font-mono text-xs">4242 4242 4242 4242</span>{' '}
        (any future expiry, any CVC). No real money will be charged.
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
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

            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-text sm:text-5xl md:text-6xl">
              Home-Cooked Meals,{' '}
              <span className="text-primary">Delivered Fresh</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-textMuted sm:text-xl">
              Discover authentic, home-cooked meals from talented local chefs in Hamilton.
              Support home chefs while enjoying delicious food delivered right to your door.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/chefs">
                <Button variant="primary" size="lg" className="sm:w-auto w-full">
                  Browse Chefs
                </Button>
              </Link>
              <Link href="/auth/signup?role=chef">
                <Button variant="secondary" size="lg" className="sm:w-auto w-full">
                  Become a Chef
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-divider pt-10">
              <div>
                <p className="font-display text-3xl font-extrabold text-primary">
                  {activeChefs > 0 ? activeChefs : '—'}
                </p>
                <p className="mt-1 text-sm text-textMuted">Local Chefs</p>
              </div>
              <div>
                <p className="font-display text-3xl font-extrabold text-primary">
                  {liveMenuItems > 0 ? `${liveMenuItems}+` : '—'}
                </p>
                <p className="mt-1 text-sm text-textMuted">Unique Dishes</p>
              </div>
              <div>
                <p className="font-display text-3xl font-extrabold text-primary">Hamilton</p>
                <p className="mt-1 text-sm text-textMuted">Serving Area</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-surfaceSubtle">
        <div className="container">
          <ScrollRevealSection className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
              How RideNDine Works
            </h2>
            <p className="mt-4 text-lg text-textMuted">
              From discovery to delivery in three simple steps
            </p>
          </ScrollRevealSection>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Discover',
                description: 'Browse local home chefs and explore their unique menus and cuisines.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                ),
              },
              {
                step: '2',
                title: 'Order',
                description: 'Select your favourite dishes and place your order with just a few taps.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                ),
              },
              {
                step: '3',
                title: 'Enjoy',
                description: 'Get fresh, home-cooked meals delivered right to your door by our drivers.',
                icon: (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                ),
              },
            ].map((item, idx) => (
              <ScrollRevealSection key={item.step} delay={idx * 100}>
                <Card elevated padding="lg" className="relative text-center h-full">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primarySoft">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {item.icon}
                    </svg>
                  </div>
                  <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primaryFg">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-text">{item.title}</h3>
                  <p className="mt-3 text-textMuted">{item.description}</p>
                </Card>
              </ScrollRevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Chefs */}
      <section className="py-20 bg-background">
        <div className="container">
          <ScrollRevealSection className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
                Our Chefs
              </h2>
              <p className="mt-2 text-textMuted">Meet the talented home chefs behind RideNDine</p>
            </div>
            <Link
              href="/chefs"
              className="hidden text-sm font-semibold text-primary transition-colors hover:text-primaryHover sm:flex items-center gap-1"
            >
              View all chefs
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </ScrollRevealSection>
          <FeaturedChefs limit={3} />
          <div className="mt-8 text-center sm:hidden">
            <Link href="/chefs">
              <Button variant="secondary">View all chefs</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Community Banner */}
      <section className="py-16 bg-accent text-white">
        <div className="container">
          <ScrollRevealSection className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Real Chefs. Real Kitchens.
            </h2>
            <p className="mt-4 text-lg text-white/85">
              Every meal on RideNDine is crafted by a verified home chef in Hamilton. No ghost kitchens. No mass production. Just authentic, home-cooked food made with care.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/chefs">
                <Button
                  size="lg"
                  className="bg-surface text-accent hover:bg-surface/90 sm:w-auto w-full"
                >
                  Meet Our Chefs
                </Button>
              </Link>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background">
        <div className="container">
          <ScrollRevealSection>
            <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primaryFg md:px-16 md:py-20">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to Share Your Cooking?
              </h2>
              <p className="mt-4 text-lg text-primaryFg/85">
                Join our community of home chefs in Hamilton and start earning doing what you love.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/signup?role=chef">
                  <Button
                    size="lg"
                    className="bg-surface text-primary hover:bg-surface/90 sm:w-auto w-full"
                  >
                    Apply to Become a Chef
                  </Button>
                </Link>
                <Link href="/chef-resources">
                  <Button
                    size="lg"
                    className="bg-transparent border border-primaryFg text-primaryFg hover:bg-primaryFg/10 sm:w-auto w-full"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollRevealSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-surfaceMuted py-16">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="mb-3 inline-flex items-center">
              <Logo height={28} />
            </div>
            <p className="text-sm text-textMuted">
              Connecting food lovers with talented home chefs in Hamilton, ON.
            </p>
          </div>
          <FooterColumn
            title="For Customers"
            links={[
              { href: '/chefs', label: 'Browse Chefs' },
              { href: '/how-it-works', label: 'How It Works' },
              { href: '/account/orders', label: 'My Orders' },
            ]}
          />
          <FooterColumn
            title="For Chefs"
            links={[
              { href: '/auth/signup?role=chef', label: 'Become a Chef' },
              { href: '/chef-resources', label: 'Chef Resources' },
              { href: '/chef-signup', label: 'Apply Now' },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { href: '/about', label: 'About Us' },
              { href: '/contact', label: 'Contact' },
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/terms', label: 'Terms of Service' },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-divider pt-8 sm:flex-row">
          <p className="text-sm text-textMuted">
            © {new Date().getFullYear()} RideNDine. All rights reserved. Hamilton, ON.
          </p>
          <p className="text-sm text-textSubtle">
            Powered by local chefs, delivered with care.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h4 className="mb-3 font-semibold text-text">{title}</h4>
      <ul className="space-y-2 text-sm text-textMuted">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition-colors hover:text-primary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
