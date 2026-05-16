import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { ChefsList } from '@/components/chefs/chefs-list';
import { ChefsFilters } from '@/components/chefs/chefs-filters';

export const metadata: Metadata = {
  title: 'Browse Local Chefs | RideNDine',
  description: 'Discover home chefs in your area. Browse menus, read reviews, and order chef-made meals delivered to your door on RideNDine.',
  openGraph: {
    title: 'Browse Local Chefs | RideNDine',
    description: 'Discover home chefs in your area. Chef-made meals delivered to your door.',
    type: 'website',
    siteName: 'RideNDine',
  },
};

// Opt out of static generation due to auth context requirements
export const dynamic = 'force-dynamic';

function ChefsLoadingSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="h-44 animate-pulse bg-surfaceMuted" />
          <div className="p-5">
            <div className="-mt-10 mb-4 flex items-end justify-between">
              <div className="h-14 w-14 animate-pulse rounded-xl bg-surfaceMuted" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-surfaceMuted" />
            </div>
            <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-surfaceMuted" />
            <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-surfaceMuted" />
            <div className="flex gap-2">
              <div className="h-5 w-20 animate-pulse rounded-full bg-surfaceMuted" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-surfaceMuted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ChefsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; cuisine?: string | string[]; rating?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const cuisines = params.cuisine
    ? Array.isArray(params.cuisine) ? params.cuisine : [params.cuisine]
    : [];
  const minRating = params.rating ? parseFloat(params.rating) : undefined;
  const sortBy = params.sort || 'default';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Closed-beta test-mode banner */}
      <div className="bg-warningSoft border-b border-warning/20 px-4 py-2.5 text-center text-sm text-warning">
        <span className="font-semibold">Closed Beta</span> — Test card{' '}
        <span className="rounded bg-surface/70 px-1.5 py-0.5 font-mono text-xs">4242 4242 4242 4242</span>{' '}
        (any future expiry, any CVC). No real money will be charged.
      </div>

      {/* Page Header */}
      <div className="border-b border-border bg-surface">
        <div className="container py-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Browse Chefs
          </h1>
          <p className="mt-2 text-textMuted">
            Discover talented home chefs in Hamilton — order fresh, authentic meals delivered to your door.
          </p>
        </div>
      </div>

      <main className="container py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full flex-shrink-0 lg:w-64">
            <Suspense fallback={<div />}>
              <ChefsFilters />
            </Suspense>
          </aside>

          <div className="min-w-0 flex-1">
            <Suspense fallback={<ChefsLoadingSkeleton />}>
              <ChefsList search={params.search} cuisines={cuisines} minRating={minRating} sortBy={sortBy} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
