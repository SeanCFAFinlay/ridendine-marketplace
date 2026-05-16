import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | RideNDine Chef',
};

export default function ChefPrivacyPage() {
  return (
    <main className="min-h-screen bg-primarySoft px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-primary/15 bg-white p-8 shadow-sm">
        <Link href="/auth/signup" className="text-sm font-semibold text-primary hover:text-[#D04D16]">
          Back to chef signup
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-text">Chef Privacy Policy</h1>
        <p className="mt-3 text-sm text-textMuted">RideNDine chef portal privacy summary.</p>

        <div
          role="alert"
          className="mt-6 rounded-lg border-2 border-warning/40 bg-warningSoft p-4 text-sm text-warning"
        >
          <p className="font-semibold">⚠️ DRAFT — Pending Legal Review</p>
          <p className="mt-1">
            This document is a working draft prepared by the RideNDine team and has{' '}
            <strong>not</strong> been reviewed by qualified legal counsel. It does not
            constitute legal advice, is not a binding contract, and is provided for
            informational purposes only during our closed beta. Final terms will be posted
            before public launch. Questions: legal@ridendine.ca.
          </p>
        </div>

        <div className="mt-8 space-y-6 text-sm leading-6 text-text">
          <section>
            <h2 className="text-lg font-semibold text-text">Information we collect</h2>
            <p className="mt-2">
              We collect account, kitchen, menu, payout, availability, order, support, and compliance information needed to operate your storefront and process marketplace activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">How it is used</h2>
            <p className="mt-2">
              Chef data is used for onboarding, storefront display, customer ordering, kitchen operations, payouts, fraud prevention, support, compliance, analytics, and platform safety.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Sharing</h2>
            <p className="mt-2">
              Public storefront details may be shown to customers. Operational details may be shared with RideNDine ops, drivers, payment processors, and service providers when required to fulfill orders and payouts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Main customer policy</h2>
            <p className="mt-2">
              The customer-facing policy remains available at{' '}
              <a href="https://ridendine.ca/privacy" className="font-semibold text-primary hover:text-[#D04D16]">
                ridendine.ca/privacy
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
