export function CheckoutSkeleton() {
  return (
    <main className="container py-8">
      {/* Page title bar */}
      <div className="h-8 w-40 animate-pulse rounded bg-surfaceMuted" />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left column: form cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery address card */}
          <div className="animate-pulse rounded-lg border border-divider bg-white p-6">
            <div className="h-4 w-36 rounded bg-surfaceMuted" />
            <div className="mt-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border-2 border-divider p-4">
                  <div className="mt-1 h-4 w-4 rounded-full bg-surfaceMuted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 rounded bg-surfaceMuted" />
                    <div className="h-3 w-48 rounded bg-surfaceMuted" />
                  </div>
                </div>
              ))}
              {/* Instructions field */}
              <div className="h-10 w-full rounded bg-surfaceMuted" />
            </div>
          </div>

          {/* Tip card */}
          <div className="animate-pulse rounded-lg border border-divider bg-white p-6">
            <div className="h-4 w-48 rounded bg-surfaceMuted" />
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-surfaceMuted" />
              ))}
            </div>
          </div>

          {/* Order items card */}
          <div className="animate-pulse rounded-lg border border-divider bg-white p-6">
            <div className="h-4 w-28 rounded bg-surfaceMuted" />
            <div className="mt-4 divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-surfaceMuted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-surfaceMuted" />
                    <div className="h-3 w-16 rounded bg-surfaceMuted" />
                  </div>
                  <div className="h-3 w-12 rounded bg-surfaceMuted" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          <div className="animate-pulse sticky top-24 rounded-lg border border-divider bg-white p-6">
            <div className="h-4 w-32 rounded bg-surfaceMuted" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-20 rounded bg-surfaceMuted" />
                  <div className="h-3 w-12 rounded bg-surfaceMuted" />
                </div>
              ))}
              <div className="border-t border-divider pt-3">
                <div className="h-10 w-full rounded bg-surfaceMuted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
