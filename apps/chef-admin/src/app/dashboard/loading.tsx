export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Page header */}
      <div>
        <div className="h-8 w-56 rounded-lg bg-surfaceMuted" />
        <div className="mt-2 h-4 w-72 rounded bg-surfaceMuted" />
      </div>

      {/* Stats grid — 4 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-surfaceMuted" />
              <div className="h-9 w-9 rounded-xl bg-surfaceMuted" />
            </div>
            <div className="mt-3 h-8 w-20 rounded bg-surfaceMuted" />
            <div className="mt-1 h-3 w-24 rounded bg-surfaceMuted" />
          </div>
        ))}
      </div>

      {/* Quick actions — 3 cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-divider bg-white p-4 shadow-sm">
            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-surfaceMuted" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 rounded bg-surfaceMuted" />
              <div className="h-3 w-36 rounded bg-surfaceMuted" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders table */}
      <div className="rounded-2xl border border-divider bg-white shadow-sm">
        {/* Table header */}
        <div className="flex items-center justify-between border-b border-divider px-6 py-4">
          <div className="h-5 w-32 rounded bg-surfaceMuted" />
          <div className="h-4 w-16 rounded bg-surfaceMuted" />
        </div>
        {/* Column headers */}
        <div className="grid grid-cols-5 gap-4 border-b border-divider px-6 py-3">
          {[60, 80, 64, 48, 40].map((w, i) => (
            <div key={i} className={`h-3 w-${w < 80 ? `[${w}px]` : 'full'} rounded bg-surfaceMuted`} style={{ width: w }} />
          ))}
        </div>
        {/* Table rows */}
        <div className="divide-y divide-divider">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="grid grid-cols-5 gap-4 px-6 py-3.5">
              <div className="h-4 w-20 rounded bg-surfaceMuted" />
              <div className="h-4 w-28 rounded bg-surfaceMuted" />
              <div className="h-5 w-20 rounded-full bg-surfaceMuted" />
              <div className="h-4 w-14 rounded bg-surfaceMuted" />
              <div className="h-4 w-12 rounded bg-surfaceMuted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
