export default function StorefrontLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="h-8 w-32 rounded-lg bg-surfaceMuted" />
      <div className="mt-2 h-4 w-64 rounded bg-surfaceMuted" />

      <div className="mt-6 space-y-6">
        {/* Cover image + logo upload area */}
        <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
          <div className="h-5 w-32 rounded bg-surfaceMuted" />
          <div className="mt-4 h-40 w-full rounded-xl bg-surfaceMuted" />
          <div className="mt-3 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-surfaceMuted" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-surfaceMuted" />
              <div className="h-3 w-40 rounded bg-surfaceMuted" />
            </div>
          </div>
        </div>

        {/* Basic info form fields */}
        <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
          <div className="h-5 w-28 rounded bg-surfaceMuted" />
          <div className="mt-4 space-y-4">
            {/* Storefront name */}
            <div>
              <div className="h-4 w-32 rounded bg-surfaceMuted" />
              <div className="mt-1.5 h-10 w-full rounded-lg bg-surfaceMuted" />
            </div>
            {/* Description */}
            <div>
              <div className="h-4 w-24 rounded bg-surfaceMuted" />
              <div className="mt-1.5 h-24 w-full rounded-lg bg-surfaceMuted" />
            </div>
            {/* Cuisine types */}
            <div>
              <div className="h-4 w-28 rounded bg-surfaceMuted" />
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-8 w-24 rounded-full bg-surfaceMuted" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Order settings */}
        <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
          <div className="h-5 w-32 rounded bg-surfaceMuted" />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-4 w-28 rounded bg-surfaceMuted" />
                <div className="mt-1.5 h-10 w-full rounded-lg bg-surfaceMuted" />
              </div>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end">
          <div className="h-10 w-32 rounded-lg bg-surfaceMuted" />
        </div>
      </div>
    </div>
  );
}
