import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { ChefsList } from '@/components/chefs/chefs-list';
import { ChefsFilters } from '@/components/chefs/chefs-filters';

export const metadata = {
  title: 'Browse Chefs - RideNDine',
  description: 'Discover local home chefs and explore their unique menus. Order fresh, home-cooked meals in Hamilton.',
};

// Opt out of static generation due to auth context requirements
export const dynamic = 'force-dynamic';

function ChefsLoadingSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="h-44 animate-pulse bg-gray-100" />
          <div className="p-5">
            <div className="-mt-10 mb-4 flex items-end justify-between">
              <div className="h-14 w-14 animate-pulse rounded-xl bg-gray-200" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
            </div>
            <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100 mb-2" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100 mb-3" />
            <div className="flex gap-2">
              <div className="h-5 w-20 animate-pulse rounded-full bg-gray-100" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ChefsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container py-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Browse Chefs</h1>
          <p className="mt-2 text-gray-600">
            Discover talented home chefs in Hamilton — order fresh, authentic meals delivered to your door.
          </p>
        </div>
      </div>

      <main className="container py-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <ChefsFilters />
          </aside>

          {/* Chefs Grid */}
          <div className="flex-1 min-w-0">
            <Suspense fallback={<ChefsLoadingSkeleton />}>
              <ChefsList />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
