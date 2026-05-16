import { Header } from '@/components/layout/header';
import { Card, Button } from '@ridendine/ui';
import Link from 'next/link';

export const metadata = {
  title: 'About Us | RideNDine',
  description:
    'Learn about RideNDine — the chef-first food delivery marketplace connecting home chefs with hungry customers.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-text">
            About RideNDine
          </h1>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-text">Our Mission</h2>
              <p className="mt-4 leading-relaxed text-textMuted">
                RideNDine is revolutionizing food delivery by connecting talented home chefs with
                customers who crave authentic, homemade meals. We believe that the best food comes
                from passionate cooks who pour their heart into every dish.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text">How It Works</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                {[
                  { icon: '🍳', title: 'Chef Prepares', text: 'Local chefs create delicious meals from their home kitchens' },
                  { icon: '📱', title: 'You Order', text: 'Browse menus, place your order, and track delivery in real-time' },
                  { icon: '🚗', title: 'We Deliver', text: 'Hot, fresh food delivered right to your door' },
                ].map((step) => (
                  <Card key={step.title} padding="lg" className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primarySoft text-2xl">
                      {step.icon}
                    </div>
                    <h3 className="mt-4 font-semibold text-text">{step.title}</h3>
                    <p className="mt-2 text-sm text-textMuted">{step.text}</p>
                  </Card>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text">For Chefs</h2>
              <p className="mt-4 leading-relaxed text-textMuted">
                Are you a passionate cook looking to share your culinary creations? Join our
                platform and turn your kitchen into a business. Set your own menu, prices, and
                schedule. We handle the delivery and payments so you can focus on what you love — cooking!
              </p>
              <Link
                href="/chef-signup"
                className="mt-4 inline-block font-medium text-primary hover:underline"
              >
                Become a Chef →
              </Link>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-text">Our Values</h2>
              <ul className="mt-4 space-y-3 text-textMuted">
                {[
                  ['Quality First', 'We partner only with chefs who meet our high standards'],
                  ['Community', 'Supporting local culinary talent and food entrepreneurs'],
                  ['Transparency', 'Fair pricing with no hidden fees'],
                  ['Reliability', 'On-time delivery with real-time tracking'],
                ].map(([title, body]) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="text-primary" aria-hidden="true">✓</span>
                    <span>
                      <strong className="text-text">{title}:</strong> {body}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl bg-primary p-8 text-center text-primaryFg">
              <h2 className="font-display text-2xl font-bold">Ready to Try?</h2>
              <p className="mt-2 opacity-90">
                Discover amazing homemade food from talented chefs in your area.
              </p>
              <Link href="/chefs" className="mt-4 inline-block">
                <Button className="bg-surface text-primary hover:bg-surface/90">Browse Chefs</Button>
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
