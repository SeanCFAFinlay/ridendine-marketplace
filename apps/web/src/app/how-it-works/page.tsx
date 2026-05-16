import { Header } from '@/components/layout/header';
import { Card, Button } from '@ridendine/ui';
import Link from 'next/link';

export const metadata = {
  title: 'How It Works | RideNDine',
  description: 'Learn how to order delicious homemade food from local chefs on RideNDine.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      number: '01',
      title: 'Browse Local Chefs',
      description:
        'Explore a variety of talented home chefs in your area. View their menus, read reviews, and find the perfect meal for any occasion.',
      icon: '🔍',
    },
    {
      number: '02',
      title: 'Choose Your Dishes',
      description:
        'Add your favorite items to your cart. Customize your order with special instructions and dietary preferences.',
      icon: '🛒',
    },
    {
      number: '03',
      title: 'Place Your Order',
      description:
        'Checkout securely with multiple payment options. Add a tip for your chef and delivery driver.',
      icon: '💳',
    },
    {
      number: '04',
      title: 'Track in Real-Time',
      description:
        'Watch your order being prepared and follow your delivery driver live on the map.',
      icon: '📍',
    },
    {
      number: '05',
      title: 'Enjoy Your Meal',
      description:
        'Receive hot, fresh food at your door. Rate your experience and support your favorite chefs!',
      icon: '🍽️',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-text">
            How RideNDine Works
          </h1>
          <p className="mt-4 text-xl text-textMuted">
            Delicious homemade food, delivered to your door in 5 simple steps
          </p>
        </div>

        <div className="mt-16 space-y-12">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`flex flex-col gap-8 md:flex-row md:items-center ${
                index % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-1">
                <Card padding="lg" elevated>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{step.icon}</span>
                    <div>
                      <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Step {step.number}
                      </span>
                      <h2 className="text-2xl font-bold text-text">{step.title}</h2>
                    </div>
                  </div>
                  <p className="mt-4 leading-relaxed text-textMuted">{step.description}</p>
                </Card>
              </div>
              <div className="flex flex-1 justify-center">
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-primarySoft text-6xl">
                  {step.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-text">
            Ready to Order?
          </h2>
          <p className="mt-2 text-textMuted">
            Join thousands of happy customers enjoying homemade meals.
          </p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/chefs">
              <Button variant="primary" size="lg">
                Browse Chefs
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button variant="secondary" size="lg">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
