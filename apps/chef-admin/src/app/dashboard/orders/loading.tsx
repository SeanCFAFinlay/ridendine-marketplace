export default function OrdersLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-24 rounded-lg bg-surfaceMuted" />
          <div className="mt-2 h-4 w-56 rounded bg-surfaceMuted" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 rounded-lg bg-surfaceMuted" />
        ))}
      </div>

      {/* Order cards */}
      <div className="mt-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-divider bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              {/* Left: order info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-24 rounded bg-surfaceMuted" />
                  <div className="h-5 w-20 rounded-full bg-surfaceMuted" />
                </div>
                <div className="h-4 w-40 rounded bg-surfaceMuted" />
                <div className="h-4 w-52 rounded bg-surfaceMuted" />
                <div className="h-4 w-36 rounded bg-surfaceMuted" />
              </div>
              {/* Right: action buttons */}
              <div className="flex flex-wrap justify-end gap-2">
                <div className="h-8 w-20 rounded-lg bg-surfaceMuted" />
                <div className="h-8 w-20 rounded-lg bg-surfaceMuted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
