import { Header } from '@/components/layout/header';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-24">
        <div className="mx-auto max-w-lg text-center">
          <div className="text-8xl">🍽️</div>
          <h1 className="mt-8 text-4xl font-bold text-gray-900">Page Not Found</h1>
          <p className="mt-4 text-xl text-gray-600">
            Oops! This page seems to have been eaten already.
          </p>
          <p className="mt-2 text-gray-500">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-block rounded-lg bg-[#E85D26] px-8 py-4 font-semibold text-white hover:bg-[#D04D16] transition-colors"
            >
              Go Home
            </Link>
            <Link
              href="/chefs"
              className="inline-block rounded-lg border-2 border-[#E85D26] px-8 py-4 font-semibold text-[#E85D26] hover:bg-orange-50 transition-colors"
            >
              Browse Chefs
            </Link>
          </div>

          <div className="mt-12 rounded-lg bg-gray-100 p-6">
            <h2 className="font-semibold text-gray-900">Looking for something specific?</h2>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>
                <Link href="/how-it-works" className="text-[#E85D26] hover:underline">
                  How Ridendine Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-[#E85D26] hover:underline">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-[#E85D26] hover:underline">
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
