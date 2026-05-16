'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@ridendine/auth';
import { Header } from '@/components/layout/header';
import { Button, Card, EmptyState } from '@ridendine/ui';

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuthContext();

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text">
              My Favorites
            </h1>
            <p className="mt-1 text-base leading-relaxed text-textMuted">
              Chefs and dishes you&apos;ve saved for later
            </p>
          </div>
          <Link href="/account">
            <Button variant="secondary">Back to Account</Button>
          </Link>
        </div>

        <Card padding="lg">
          <EmptyState
            icon={
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            }
            title="No favorites yet"
            description="Save your favorite chefs and dishes to find them easily later"
            action={
              <Link href="/chefs">
                <Button variant="primary">Browse Chefs</Button>
              </Link>
            }
          />
        </Card>

        <Card padding="lg" className="mt-8">
          <h2 className="text-lg font-semibold text-text">How to save favorites</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-textMuted">
            <li className="flex gap-2">
              <span className="font-semibold text-primary">•</span>
              <span>Click the heart icon on any chef profile to save them</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">•</span>
              <span>Favorite dishes will appear here for quick reordering</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-primary">•</span>
              <span>Get notified when your favorite chefs add new menu items</span>
            </li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
