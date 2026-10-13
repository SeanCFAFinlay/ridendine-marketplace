import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient, getActiveStorefronts } from '@ridendine/db';
import { Badge, Button, Card, EmptyState } from '@ridendine/ui';

interface FeaturedChefsProps {
  limit?: number;
}

export async function FeaturedChefs({ limit = 6 }: FeaturedChefsProps) {
  let chefs: Awaited<ReturnType<typeof getActiveStorefronts>> = [];

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    chefs = await getActiveStorefronts(supabase as any, { limit, featured: true });
    if (chefs.length === 0) {
      chefs = await getActiveStorefronts(supabase as any, { limit });
    }
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
                    <h3 className="font-bold leading-snug text-text transition-colors group-hover:text-primary">
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

              <div className="mt-3 flex items-center justify-between gap-1 border-t border-divider pt-2 text-sm text-textMuted">
                <div className="flex items-center gap-1">
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
                <span className="text-xs font-semibold text-primary group-hover:underline">
                  View Menu →
                </span>
              </div>
            </div>
          </Card>
        </Link>
      ))}

      {chefs.length === 1 && chefs[0] && (
        <>
          {/* Companion Card 1: Signature Dishes Spotlight */}
          <Link href={`/chefs/${chefs[0].slug}`} className="group block">
            <Card elevated interactive padding="md" className="flex h-full flex-col justify-between border border-border bg-surface transition-shadow hover:shadow-md">
              <div>
                <div className="flex items-center justify-between border-b border-divider pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Chef Specialties</span>
                    <h3 className="text-base font-bold text-text transition-colors group-hover:text-primary">
                      Signature Dishes
                    </h3>
                  </div>
                  <span className="rounded-full bg-accentSoft px-2 py-0.5 text-xs font-semibold text-accent">
                    55 Dishes Live
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3 rounded-lg bg-surfaceMuted/50 p-2 transition-colors group-hover:bg-surfaceMuted">
                    <img
                      src="/chefs/bep-ba-muoi/dishes/dish-7.jpg"
                      alt="Vietnamese Beef Stew"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text">Vietnamese Beef Stew (Bò kho)</p>
                      <p className="truncate text-[11px] text-textMuted">Slow-braised beef, carrots, lemongrass</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-primary">$45 (4 servings)</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-surfaceMuted/50 p-2 transition-colors group-hover:bg-surfaceMuted">
                    <img
                      src="/chefs/bep-ba-muoi/dishes/dish-6.jpg"
                      alt="Broken Rice with Pork Chop"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text">Rice with Grilled Pork Chop (Cơm sườn)</p>
                      <p className="truncate text-[11px] text-textMuted">Classic broken rice, pork skin & meatloaf</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-primary">$45 (4 servings)</span>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-surfaceMuted/50 p-2 transition-colors group-hover:bg-surfaceMuted">
                    <img
                      src="/chefs/bep-ba-muoi/dishes/dish-51.jpg"
                      alt="Peach Gum Dessert Soup"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-text">Peach Gum Sweet Soup (Chè dưỡng nhan)</p>
                      <p className="truncate text-[11px] text-textMuted">Collagen beauty dessert soup</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-primary">$25.00</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-divider pt-3 text-xs font-semibold text-primary">
                <span>Explore all 55 dishes</span>
                <span className="transition-transform group-hover:translate-x-0.5">Order Now →</span>
              </div>
            </Card>
          </Link>

          {/* Companion Card 2: Partner Kitchen Assurance & Chef Onboarding */}
          <Card elevated padding="md" className="flex h-full flex-col justify-between border border-[#57BBFF]/40 bg-gradient-to-b from-[#57BBFF]/5 to-surface">
            <div>
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#57BBFF]/40 bg-[#57BBFF]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#0369a1] dark:text-[#7dd3fc]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EE3985] animate-pulse" />
                  Official cooco.app Partner
                </span>
                <span className="text-xs text-textMuted">Hamilton, ON</span>
              </div>

              <div className="mt-3 space-y-2 text-xs leading-relaxed text-textMuted">
                <p className="text-sm font-semibold text-text">
                  Hand-crafted home food from verified Ontario kitchens.
                </p>
                <p>
                  Bếp Bà Muối is our premier Hamilton kitchen partner from <span className="font-bold text-[#0369a1] dark:text-[#7dd3fc]">cooco.app</span>, bringing authentic Vietnamese recipes directly to your door.
                </p>
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="flex items-center gap-1.5 text-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Verified local food safety standards
                  </span>
                  <span className="flex items-center gap-1.5 text-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Family-sized 4-portion feast dishes
                  </span>
                  <span className="flex items-center gap-1.5 text-text">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" /> Freshly made to order daily
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-divider pt-3">
              <a
                href="https://cooco.app/cooks/06b4462d-a5af-4c47-aa30-7ced490262c5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#0369a1] hover:underline"
              >
                cooco.app Profile ↗
              </a>
              <Link href="/chef-signup">
                <Button size="sm" variant="secondary">
                  Join as a Chef
                </Button>
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
