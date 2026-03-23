import { Header } from '@/components/layout/header';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | Ridendine',
  description: 'Ridendine terms of service - the rules and guidelines for using our platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-4 text-gray-600">Last updated: March 2024</p>

          <div className="mt-8 space-y-8 text-gray-600">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
              <p className="mt-4">
                By accessing or using Ridendine ("the Platform"), you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">2. Description of Service</h2>
              <p className="mt-4">
                Ridendine is a marketplace that connects customers with local home chefs. We facilitate
                ordering, payment processing, and delivery coordination. Ridendine is not a food
                producer or restaurant; we are a platform that enables transactions between independent
                chefs and customers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">3. User Accounts</h2>
              <div className="mt-4 space-y-4">
                <p>
                  To use certain features of the Platform, you must create an account. You agree to:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Accept responsibility for all activity under your account</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">4. Orders and Payments</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Pricing</h3>
                  <p className="mt-2">
                    Menu prices are set by individual chefs. Additional fees include:
                  </p>
                  <ul className="mt-2 list-disc pl-6">
                    <li>Service fee: 8% of order subtotal</li>
                    <li>Delivery fee: $3.99 (varies by distance)</li>
                    <li>HST: 13% (Ontario)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Payment Processing</h3>
                  <p className="mt-2">
                    All payments are processed securely through Stripe. By placing an order,
                    you authorize us to charge your selected payment method for the total amount.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Refunds</h3>
                  <p className="mt-2">
                    Refund requests are handled on a case-by-case basis. If there's an issue with
                    your order, please contact support within 24 hours of delivery.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">5. For Chefs</h2>
              <div className="mt-4 space-y-4">
                <p>Chefs using our platform agree to:</p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Maintain all required food safety certifications and permits</li>
                  <li>Accurately describe menu items and allergen information</li>
                  <li>Prepare food in a safe and sanitary environment</li>
                  <li>Accept orders promptly and meet estimated preparation times</li>
                  <li>Maintain a minimum 4.0 rating to remain on the platform</li>
                </ul>
                <p className="mt-4">
                  Ridendine charges a 15% platform fee on each order. Payments are processed weekly
                  via Stripe Connect.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">6. For Drivers</h2>
              <div className="mt-4 space-y-4">
                <p>Delivery drivers agree to:</p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Maintain valid driver's license and insurance</li>
                  <li>Complete deliveries in a timely manner</li>
                  <li>Handle food with care and maintain food safety</li>
                  <li>Provide professional and courteous service</li>
                  <li>Use insulated delivery bags for temperature control</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">7. Prohibited Conduct</h2>
              <p className="mt-4">Users may not:</p>
              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>Use the platform for any illegal purpose</li>
                <li>Harass, threaten, or abuse other users</li>
                <li>Submit false or misleading information</li>
                <li>Attempt to circumvent platform fees or payments</li>
                <li>Create multiple accounts for fraudulent purposes</li>
                <li>Scrape, harvest, or collect user data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">8. Intellectual Property</h2>
              <p className="mt-4">
                The Ridendine name, logo, and platform design are our intellectual property.
                Users retain ownership of content they create (such as menu items and reviews)
                but grant us a license to display and use this content on the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">9. Limitation of Liability</h2>
              <p className="mt-4">
                Ridendine is a platform that facilitates connections between users. We are not
                responsible for the quality, safety, or legality of food prepared by chefs.
                To the maximum extent permitted by law, Ridendine shall not be liable for any
                indirect, incidental, or consequential damages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">10. Dispute Resolution</h2>
              <p className="mt-4">
                Any disputes arising from the use of Ridendine shall be resolved through
                binding arbitration in Ontario, Canada, in accordance with Canadian law.
                You waive any right to participate in class action lawsuits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">11. Termination</h2>
              <p className="mt-4">
                We reserve the right to suspend or terminate accounts that violate these terms,
                engage in fraudulent activity, or receive consistently poor ratings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">12. Changes to Terms</h2>
              <p className="mt-4">
                We may update these terms at any time. Continued use of the platform after
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">13. Contact</h2>
              <p className="mt-4">
                For questions about these terms, contact us at:
              </p>
              <div className="mt-4 rounded-lg bg-gray-100 p-4">
                <p><strong>Ridendine Legal</strong></p>
                <p className="mt-1">Email: legal@ridendine.ca</p>
                <p>123 Main Street, Hamilton, ON L8P 1A1, Canada</p>
              </div>
            </section>
          </div>

          <div className="mt-12 border-t pt-8">
            <Link href="/" className="text-[#E85D26] hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
