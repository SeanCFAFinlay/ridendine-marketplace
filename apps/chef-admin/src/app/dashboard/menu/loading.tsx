export default function MenuLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="h-8 w-20 rounded-lg bg-surfaceMuted" />
          <div className="mt-2 h-4 w-56 rounded bg-surfaceMuted" />
        </div>
      </div>

      {/* Action buttons row */}
      <div className="mt-6 flex gap-2">
        <div className="h-10 w-32 rounded-lg bg-surfaceMuted" />
        <div className="h-10 w-24 rounded-lg bg-surfaceMuted" />
      </div>

      {/* Category cards */}
      <div className="mt-6 space-y-6">
        {[1, 2].map((cat) => (
          <div key={cat} className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            {/* Category header */}
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <div>
                <div className="h-5 w-32 rounded bg-surfaceMuted" />
                <div className="mt-1.5 h-3 w-48 rounded bg-surfaceMuted" />
              </div>
              <div className="h-10 w-20 rounded-lg bg-surfaceMuted" />
            </div>

            {/* Menu item rows */}
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex flex-col gap-3 rounded-lg border border-divider p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-surfaceMuted" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 rounded bg-surfaceMuted" />
                      <div className="h-3 w-52 rounded bg-surfaceMuted" />
                      <div className="h-3 w-16 rounded bg-surfaceMuted" />
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-20 rounded-full bg-surfaceMuted" />
                    <div className="h-8 w-14 rounded-lg bg-surfaceMuted" />
                    <div className="h-8 w-16 rounded-lg bg-surfaceMuted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
