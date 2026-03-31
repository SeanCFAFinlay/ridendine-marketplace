import { Header } from '@/components/layout/header';
import { Card } from '@ridendine/ui';
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
      description: 'Explore a variety of talented home chefs in your area. View their menus, read reviews, and find the perfect meal for any occasion.',
      icon: '🔍',
    },
    {
      number: '02',
      title: 'Choose Your Dishes',
      description: 'Add your favorite items to your cart. Customize your order with special instructions and dietary preferences.',
      icon: '🛒',
    },
    {
      number: '03',
      title: 'Place Your Order',
      description: 'Checkout securely with multiple payment options. Add a tip for your chef and delivery driver.',
      icon: '💳',
    },
    {
      number: '04',
      title: 'Track in Real-Time',
      description: 'Watch your order being prepared and follow your delivery driver live on the map.',
      icon: '📍',
    },
    {
      number: '05',
      title: 'Enjoy Your Meal',
      description: 'Receive hot, fresh food at your door. Rate your experience and support your favorite chefs!',
      icon: '🍽️',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold text-gray-900">How Ridendine Works</h1>
          <p className="mt-4 text-xl text-gray-600">
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
                <Card className="p-8">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{step.icon}</span>
                    <div>
                      <span className="text-sm font-medium text-[#E85D26]">Step {step.number}</span>
                      <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-600 leading-relaxed">{step.description}</p>
                </Card>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl">
                  {step.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Ready to Order?</h2>
          <p className="mt-2 text-gray-600">
            Join thousands of happy customers enjoying homemade meals.
          </p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/chefs"
              className="inline-block rounded-lg bg-[#E85D26] px-8 py-4 font-semibold text-white hover:bg-[#D04D16] transition-colors"
            >
              Browse Chefs
            </Link>
            <Link
              href="/auth/signup"
              className="inline-block rounded-lg border-2 border-[#E85D26] px-8 py-4 font-semibold text-[#E85D26] hover:bg-orange-50 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
