import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient, getActiveStorefronts, searchStorefronts } from '@ridendine/db';

interface ChefsListProps {
  search?: string;
  cuisines?: string[];
  minRating?: number;
}

export async function ChefsList({ search, cuisines, minRating }: ChefsListProps = {}) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  let chefs: Awaited<ReturnType<typeof getActiveStorefronts>> = [];

  try {
    if (search) {
      chefs = await searchStorefronts(supabase as any, search, 20);
    } else {
      chefs = await getActiveStorefronts(supabase as any, {
        limit: 20,
        cuisineTypes: cuisines && cuisines.length > 0 ? cuisines : undefined,
      });
    }

    if (minRating) {
      chefs = chefs.filter((c) => (c.average_rating ?? 0) >= minRating);
    }
  } catch (error) {
    console.error('Failed to fetch chefs:', error);
  }

  if (chefs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No chefs available yet</h3>
        <p className="mt-2 text-gray-500">Check back soon — more chefs are joining RideNDine!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {chefs.map((chef) => (
        <Link key={chef.id} href={`/chefs/${chef.slug}`} className="group">
          <div className="h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            {/* Cover Image */}
            <div
              className="relative h-44 bg-gradient-to-br from-[#fff0e8] to-[#fde8d8] overflow-hidden"
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
                <div className="absolute top-3 left-3 rounded-full bg-[#E85D26] px-3 py-1 text-xs font-semibold text-white shadow">
                  Featured
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="-mt-14 mb-4 flex items-end justify-between">
                {/* Chef Avatar */}
                <div className="h-16 w-16 rounded-2xl border-4 border-white bg-[#E85D26] flex items-center justify-center text-2xl font-bold text-white shadow-md overflow-hidden">
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
                <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm border border-gray-100">
                  <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs font-semibold text-gray-800">
                    {chef.average_rating?.toFixed(1) || 'New'}
                  </span>
                  {chef.total_reviews > 0 && (
                    <span className="text-xs text-gray-500">({chef.total_reviews})</span>
                  )}
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#E85D26] transition-colors">
                {chef.name}
              </h3>
              <p className="text-sm text-gray-500">
                by <span className="font-medium text-gray-700">{chef.chef_profiles?.display_name || 'Chef'}</span>
              </p>

              {chef.description && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{chef.description}</p>
              )}

              {chef.cuisine_types && chef.cuisine_types.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chef.cuisine_types.slice(0, 3).map((cuisine) => (
                    <span
                      key={cuisine}
                      className="rounded-full bg-[#fff0e8] px-2.5 py-0.5 text-xs font-medium text-[#E85D26]"
                    >
                      {cuisine}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{chef.estimated_prep_time_min || 20}–{chef.estimated_prep_time_max || 45} min</span>
                </div>
                {chef.min_order_amount > 0 && (
                  <span className="text-xs text-gray-400">
                    Min ${Number(chef.min_order_amount).toFixed(0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
