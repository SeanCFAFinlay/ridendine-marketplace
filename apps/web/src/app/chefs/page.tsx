import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { ChefsList } from '@/components/chefs/chefs-list';
import { ChefsFilters } from '@/components/chefs/chefs-filters';
import { PageLoader } from '@ridendine/ui';

export const metadata = {
  title: 'Browse Chefs - Ridendine',
  description: 'Discover local home chefs and explore their unique menus.',
};

export default function ChefsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Chefs</h1>
          <p className="mt-2 text-gray-600">
            Discover talented home chefs in your area
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64">
            <ChefsFilters />
          </aside>

          {/* Chefs Grid */}
          <div className="flex-1">
            <Suspense fallback={<PageLoader />}>
              <ChefsList />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
