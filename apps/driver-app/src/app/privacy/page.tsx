import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | RideNDine Driver',
};

export default function DriverPrivacyPage() {
  return (
    <main className="min-h-screen bg-opsCanvas px-4 py-12">
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <Link href="/auth/signup" className="text-sm font-semibold text-primary hover:text-primaryHover">
          Back to driver signup
        </Link>
        <h1 className="mt-6 text-3xl font-bold text-text">Driver Privacy Policy</h1>
        <p className="mt-3 text-sm text-textMuted">RideNDine driver app privacy summary.</p>

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
              We collect driver account, vehicle, payout, location, delivery, offer response, proof-of-delivery, support, and compliance information needed to operate the delivery workflow.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Location data</h2>
            <p className="mt-2">
              Location data is used for dispatch, route tracking, ETA updates, delivery verification, customer support, safety review, and operations monitoring while you are online or assigned to a delivery.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Sharing</h2>
            <p className="mt-2">
              Delivery and location information may be shared with customers, chefs, RideNDine ops, payment processors, and service providers as needed to complete deliveries and resolve issues.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text">Main customer policy</h2>
            <p className="mt-2">
              The customer-facing policy remains available at{' '}
              <a href="https://ridendine.ca/privacy" className="font-semibold text-primary hover:text-primaryHover">
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
