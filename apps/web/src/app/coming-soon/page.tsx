import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { LaunchSignupForm } from '@/components/home/launch-signup-form';

export const metadata: Metadata = {
  title: 'Coming soon to Hamilton | RideNDine',
  description:
    'Home cooked meals from Hamilton kitchens, delivered. Leave your email and we will tell you when ordering opens.',
};

const dishes = [
  { id: 6, name: 'Cơm sườn bì chả', english: 'Grilled pork chop on broken rice' },
  { id: 31, name: 'Phở bò / Phở gà', english: 'Beef pho or chicken pho' },
  { id: 54, name: 'Chả giò', english: 'Crispy spring rolls' },
];

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
            Home cooked. Coming soon.
          </h1>
          <p className="mb-8 mt-4 text-lg text-textMuted">
            RideNDine is bringing meals from Hamilton kitchens to your door. Leave your email and
            we&apos;ll tell you when ordering opens.
          </p>
          <LaunchSignupForm source="coming-soon" />
        </div>

        <ul className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-3">
          {dishes.map((dish) => (
            <li key={dish.id}>
              <img
                src={`/chefs/bep-ba-muoi/dishes/dish-${dish.id}.jpg`}
                alt={dish.english}
                width={800}
                height={800}
                className="aspect-square w-full rounded-2xl border border-border bg-white object-cover"
              />
              <p className="mt-3 font-semibold text-text">{dish.name}</p>
              <p className="text-sm text-textMuted">{dish.english}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center">
          <Link href="/chefs/bep-ba-muoi" className="font-semibold text-primary hover:text-primaryHover">
            See the Bếp Bà Muối menu
          </Link>
        </p>
      </main>
    </div>
  );
}
