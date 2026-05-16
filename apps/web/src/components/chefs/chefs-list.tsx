import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient, getActiveStorefronts, searchStorefronts } from '@ridendine/db';
import type { StorefrontSortBy, ChefAvailabilityRow } from '@ridendine/db';
import { Badge, Card } from '@ridendine/ui';

interface ChefsListProps {
  search?: string;
  cuisines?: string[];
  minRating?: number;
  sortBy?: string;
}

function isOpenNow(availability?: ChefAvailabilityRow[]): boolean {
  if (!availability || availability.length === 0) return false;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const todaySlots = availability.filter((a) => a.day_of_week === dayOfWeek && a.is_available);
  if (todaySlots.length === 0) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return todaySlots.some((slot) => {
    const [openH, openM] = slot.start_time.split(':').map(Number);
    const [closeH, closeM] = slot.end_time.split(':').map(Number);
    const openMinutes = (openH ?? 0) * 60 + (openM ?? 0);
    const closeMinutes = (closeH ?? 0) * 60 + (closeM ?? 0);
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  });
}

const hasActiveFilters = (
  search?: string,
  cuisines?: string[],
  minRating?: number,
  sortBy?: string,
): boolean =>
  Boolean(search || (cuisines && cuisines.length > 0) || minRating || (sortBy && sortBy !== 'default'));

export async function ChefsList({ search, cuisines, minRating, sortBy = 'default' }: ChefsListProps = {}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const sort = (sortBy as StorefrontSortBy) || 'default';

  let chefs: Awaited<ReturnType<typeof getActiveStorefronts>> = [];

  try {
    if (search) {
      chefs = await searchStorefronts(supabase as any, search, 20, sort);
    } else {
      chefs = await getActiveStorefronts(supabase as any, {
        limit: 20,
        cuisineTypes: cuisines && cuisines.length > 0 ? cuisines : undefined,
        sortBy: sort,
      });
    }

    if (minRating) {
      chefs = chefs.filter((c) => (c.average_rating ?? 0) >= minRating);
    }
  } catch (error) {
    console.error('Failed to fetch chefs:', error);
  }

  const filtersActive = hasActiveFilters(search, cuisines, minRating, sortBy);

  if (chefs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surfaceMuted">
          <svg className="h-8 w-8 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            {filtersActive ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            )}
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text">
          {filtersActive ? 'No chefs match your search' : 'No chefs available yet'}
        </h3>
        <p className="mt-2 text-textMuted">
          {filtersActive
            ? 'Try adjusting your filters or search terms.'
            : 'Check back soon — more chefs are joining RideNDine!'}
        </p>
        {filtersActive && (
          <Link
            href="/chefs"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primaryFg transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:shadow-focus"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {chefs.map((chef, index) => (
        <Link
          key={chef.id}
          href={`/chefs/${chef.slug}`}
          className="group block animate-fade-in-up"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <Card elevated interactive padding="none" className="h-full overflow-hidden">
            {/* Cover */}
            <div
              className="relative h-44 overflow-hidden bg-primarySoft"
              style={
                chef.cover_image_url
                  ? {
                      backgroundImage: `url(${chef.cover_image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              {chef.is_featured && (
                <div className="absolute top-3 left-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primaryFg shadow">
                  Featured
                </div>
              )}
              {isOpenNow(chef.chef_availability) ? (
                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-white shadow">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                  Open
                </div>
              ) : (
                <div className="absolute top-3 right-3 rounded-full bg-text/70 px-2.5 py-1 text-xs font-medium text-white shadow">
                  Closed
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-text/20 to-transparent" />
            </div>

            <div className="p-5">
              <div className="-mt-14 mb-4 flex items-end justify-between">
                {/* Avatar */}
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-surface bg-primary text-2xl font-bold text-primaryFg shadow-md">
                  {chef.logo_url ? (
                    <img
                      src={chef.logo_url}
                      alt={chef.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    chef.name.charAt(0)
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 shadow-sm">
                  <svg className="h-3.5 w-3.5 text-warning" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs font-semibold text-text">
                    {chef.average_rating?.toFixed(1) || 'New'}
                  </span>
                  {chef.total_reviews > 0 && (
                    <span className="text-xs text-textMuted">({chef.total_reviews})</span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-text transition-colors group-hover:text-primary">
                {chef.name}
              </h3>
              <p className="text-sm text-textMuted">
                by{' '}
                <span className="font-medium text-text">
                  {chef.chef_profiles?.display_name || 'Chef'}
                </span>
              </p>

              {chef.description && (
                <p className="mt-2 text-sm text-textMuted line-clamp-2">{chef.description}</p>
              )}

              {chef.cuisine_types && chef.cuisine_types.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chef.cuisine_types.slice(0, 3).map((cuisine) => (
                    <Badge key={cuisine} tone="accent" size="sm">
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-divider pt-3">
                <div className="flex items-center gap-1 text-sm text-textMuted">
                  <svg className="h-4 w-4 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {chef.estimated_prep_time_min || 20}–{chef.estimated_prep_time_max || 45} min
                  </span>
                </div>
                {chef.min_order_amount > 0 && (
                  <span className="text-xs text-textSubtle">
                    Min ${Number(chef.min_order_amount).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
