import { Header } from '@/components/layout/header';
import Link from 'next/link';
import { Button } from '@ridendine/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-24">
        <div className="mx-auto max-w-lg text-center">
          <div className="text-8xl">🍽️</div>
          <h1 className="mt-8 font-display text-4xl font-bold tracking-tight text-text">
            Page Not Found
          </h1>
          <p className="mt-4 text-xl text-textMuted">
            Oops! This page seems to have been eaten already.
          </p>
          <p className="mt-2 text-textSubtle">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/">
              <Button variant="primary" size="lg">
                Go Home
              </Button>
            </Link>
            <Link href="/chefs">
              <Button variant="secondary" size="lg">
                Browse Chefs
              </Button>
            </Link>
          </div>

          <div className="mt-12 rounded-lg bg-surfaceMuted p-6 text-left">
            <h2 className="font-semibold text-text">Looking for something specific?</h2>
            <ul className="mt-4 space-y-2 text-textMuted">
              <li>
                <Link href="/how-it-works" className="text-primary transition-colors hover:underline">
                  How RideNDine Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-primary transition-colors hover:underline">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-primary transition-colors hover:underline">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
