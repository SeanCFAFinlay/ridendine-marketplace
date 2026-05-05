/**
 * TODO (LAUNCH BLOCKER): This privacy policy was auto-generated as a placeholder.
 * It has NOT been reviewed or approved by legal counsel.
 * Before launch, replace this content with legally reviewed text or use a service
 * such as Termly, Iubenda, or engage a lawyer.
 * See: docs/LAUNCH_CHECKLIST.md — item L2.
 */
import { Header } from '@/components/layout/header';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | RideNDine',
  description: 'RideNDine privacy policy - how we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-4 text-gray-600">Last updated: March 2024</p>

          <div className="mt-8 space-y-8 text-gray-600">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900">1. Information We Collect</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Personal Information</h3>
                  <p className="mt-2">
                    When you create an account, we collect your name, email address, phone number,
                    and delivery addresses. For chefs and drivers, we also collect additional
                    verification information including government ID and banking details.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Order Information</h3>
                  <p className="mt-2">
                    We collect information about your orders, including items purchased, delivery
                    addresses, payment methods, and order history.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Location Data</h3>
                  <p className="mt-2">
                    With your permission, we collect location data to provide delivery services,
                    show nearby chefs, and enable real-time order tracking.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">2. How We Use Your Information</h2>
              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>Process and deliver your orders</li>
                <li>Connect you with local chefs and delivery drivers</li>
                <li>Send order confirmations and delivery updates</li>
                <li>Process payments securely through Stripe</li>
                <li>Improve our services and user experience</li>
                <li>Prevent fraud and maintain platform security</li>
                <li>Send promotional communications (with your consent)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">3. Information Sharing</h2>
              <p className="mt-4">
                We share your information only as necessary to provide our services:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li><strong>Chefs:</strong> Receive your name and delivery address to prepare and label your order</li>
                <li><strong>Drivers:</strong> Receive pickup and delivery addresses, and your contact information for delivery coordination</li>
                <li><strong>Payment Processors:</strong> Stripe processes all payments securely</li>
                <li><strong>Service Providers:</strong> We use trusted partners for hosting, analytics, and customer support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">4. Data Security</h2>
              <p className="mt-4">
                We implement industry-standard security measures to protect your data, including:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Secure payment processing through PCI-compliant providers</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and employee training</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">5. Your Rights</h2>
              <p className="mt-4">
                You have the right to:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-6">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Opt out of marketing communications</li>
                <li>Export your data in a portable format</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">6. Cookies and Tracking</h2>
              <p className="mt-4">
                We use cookies and similar technologies to remember your preferences, maintain
                your session, and analyze how our service is used. You can control cookie
                settings through your browser.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">7. Children's Privacy</h2>
              <p className="mt-4">
                Ridendine is not intended for users under 18 years of age. We do not knowingly
                collect personal information from children.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">8. Changes to This Policy</h2>
              <p className="mt-4">
                We may update this privacy policy from time to time. We will notify you of
                significant changes by email or through the app.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900">9. Contact Us</h2>
              <p className="mt-4">
                If you have questions about this privacy policy or your personal data, please
                contact us at:
              </p>
              <div className="mt-4 rounded-lg bg-gray-100 p-4">
                <p><strong>Ridendine Privacy Team</strong></p>
                <p className="mt-1">Email: privacy@ridendine.ca</p>
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
