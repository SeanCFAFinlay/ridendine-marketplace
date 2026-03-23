import { Header } from '@/components/layout/header';
import { Card } from '@ridendine/ui';
import Link from 'next/link';

export const metadata = {
  title: 'About Us | Ridendine',
  description: 'Learn about Ridendine - the chef-first food delivery marketplace connecting home chefs with hungry customers.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900">About Ridendine</h1>

          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Our Mission</h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Ridendine is revolutionizing food delivery by connecting talented home chefs with
                customers who crave authentic, homemade meals. We believe that the best food comes
                from passionate cooks who pour their heart into every dish.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">How It Works</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                <Card className="p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl">
                    🍳
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">Chef Prepares</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Local chefs create delicious meals from their home kitchens
                  </p>
                </Card>
                <Card className="p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl">
                    📱
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">You Order</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Browse menus, place your order, and track delivery in real-time
                  </p>
                </Card>
                <Card className="p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl">
                    🚗
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">We Deliver</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Hot, fresh food delivered right to your door
                  </p>
                </Card>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">For Chefs</h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Are you a passionate cook looking to share your culinary creations? Join our
                platform and turn your kitchen into a business. Set your own menu, prices, and
                schedule. We handle the delivery and payments so you can focus on what you love - cooking!
              </p>
              <Link
                href="/chef-signup"
                className="mt-4 inline-block text-[#E85D26] font-medium hover:underline"
              >
                Become a Chef →
              </Link>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">Our Values</h2>
              <ul className="mt-4 space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="text-[#E85D26]">✓</span>
                  <span><strong>Quality First:</strong> We partner only with chefs who meet our high standards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E85D26]">✓</span>
                  <span><strong>Community:</strong> Supporting local culinary talent and food entrepreneurs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E85D26]">✓</span>
                  <span><strong>Transparency:</strong> Fair pricing with no hidden fees</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#E85D26]">✓</span>
                  <span><strong>Reliability:</strong> On-time delivery with real-time tracking</span>
                </li>
              </ul>
            </section>

            <section className="rounded-lg bg-[#E85D26] p-8 text-white text-center">
              <h2 className="text-2xl font-semibold">Ready to Try?</h2>
              <p className="mt-2 opacity-90">
                Discover amazing homemade food from talented chefs in your area.
              </p>
              <Link
                href="/chefs"
                className="mt-4 inline-block rounded-lg bg-white px-6 py-3 font-medium text-[#E85D26] hover:bg-gray-100 transition-colors"
              >
                Browse Chefs
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
