export function ReviewsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading reviews">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border border-divider bg-white p-4">
          {/* Top row: avatar + name/stars + date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Avatar circle */}
              <div className="h-8 w-8 rounded-full bg-surfaceMuted" />
              <div className="space-y-1">
                {/* Name bar */}
                <div className="h-3 w-24 rounded bg-surfaceMuted" />
                {/* Stars bar */}
                <div className="h-3 w-16 rounded bg-surfaceMuted" />
              </div>
            </div>
            {/* Date pill */}
            <div className="h-3 w-14 rounded bg-surfaceMuted" />
          </div>
          {/* Comment text lines */}
          <div className="mt-3 space-y-2">
            <div className="h-2 w-full rounded bg-surfaceMuted" />
            <div className="h-2 w-5/6 rounded bg-surfaceMuted" />
          </div>
        </div>
      ))}
    </div>
  );
}
