import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient, getActiveStorefronts } from '@ridendine/db';
import { Badge, Button, Card, EmptyState } from '@ridendine/ui';

interface FeaturedChefsProps {
  limit?: number;
}

export async function FeaturedChefs({ limit = 6 }: FeaturedChefsProps) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  let chefs: Awaited<ReturnType<typeof getActiveStorefronts>> = [];

  try {
    chefs = await getActiveStorefronts(supabase as any, { limit, featured: true });
  } catch (error) {
    console.error('Failed to fetch featured chefs:', error);
  }

  if (chefs.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        }
        title="More chefs joining soon"
        description="Our chefs are getting ready to cook for you. Check back soon for amazing home-cooked meals!"
        action={
          <Link href="/chef-signup">
            <Button variant="primary">Are you a chef? Join us</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {chefs.map((chef) => (
        <Link key={chef.id} href={`/chefs/${chef.slug}`} className="group block">
          <Card elevated interactive padding="none" className="h-full overflow-hidden">
            {/* Cover */}
            <div className="relative aspect-[16/9] overflow-hidden bg-primarySoft">
              {chef.cover_image_url && (
                <img
                  src={chef.cover_image_url}
                  alt={`${chef.name} cover`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-text/20 to-transparent" />
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {/* Avatar */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-primary text-lg font-bold text-primaryFg shadow-sm">
                    {chef.logo_url ? (
                      <img
                        src={chef.logo_url}
                        alt={`${chef.name} logo`}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      chef.name.charAt(0)
                    )}
                  </div>

                  <div className="min-w-0">
                    {(chef.slug === 'bep-ba-muoi' ||
                      chef.slug === 'cooco' ||
                      chef.name.toLowerCase().includes('muối') ||
                      chef.name.toLowerCase().includes('cooco')) && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-[#57BBFF]/40 bg-gradient-to-r from-[#57BBFF]/15 to-[#EE3985]/15 px-2 py-0.5 text-[10px] font-bold text-[#0369a1] dark:text-[#7dd3fc]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#EE3985]" />
                        Cooco Partner
                      </span>
                    )}
                    <h3 className="truncate font-bold text-text transition-colors group-hover:text-primary">
                      {chef.name}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-textMuted">
                      by{' '}
                      <span className="font-medium text-text">
                        {chef.chef_profiles?.display_name || 'Chef'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 shadow-sm">
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

              {chef.cuisine_types && chef.cuisine_types.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {chef.cuisine_types.slice(0, 3).map((cuisine) => (
                    <Badge key={cuisine} tone="accent" size="sm">
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-1 text-sm text-textMuted">
                <svg
                  className="h-4 w-4 text-textSubtle"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  {chef.estimated_prep_time_min || 20}–{chef.estimated_prep_time_max || 45} min
                </span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
