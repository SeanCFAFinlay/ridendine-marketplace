import Image from 'next/image';
import Link from 'next/link';
import { Badge, Button, Card } from '@ridendine/ui';

const cuisineChips = [
  { label: '⭐ Little Saigon (Cooco)', href: '/chefs/little-saigon' },
  { label: '🔥 Bếp Bà Muối (Cooco)', href: '/chefs/bep-ba-muoi' },
  { label: 'Traditional Phở', href: '/chefs?search=pho' },
  { label: 'Vietnamese', href: '/chefs?cuisine=Vietnamese' },
  { label: 'Burgers', href: '/chefs?cuisine=American' },
  { label: 'Broken Rice (Cơm)', href: '/chefs?search=com' },
  { label: 'Party Trays & Catering', href: '/chefs?search=tray' },
];

export function CustomerMarketplaceHero({
  activeChefs,
  liveMenuItems,
}: {
  activeChefs: number;
  liveMenuItems: number;
}) {
  return (
    <section
      data-testid="customer-marketplace-hero"
      className="relative overflow-hidden bg-background py-10 sm:py-14"
    >
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
          <div className="min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <Image
                src="/logo-icon.png"
                alt=""
                width={52}
                height={52}
                className="h-12 w-12 rounded-lg object-contain"
                priority
              />
              <div>
                <Badge tone="accent">Hamilton marketplace</Badge>
                <p className="mt-1 text-sm text-textMuted">Local chefs, fresh meals, simple delivery.</p>
              </div>
            </div>

            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-text sm:text-5xl">
              Find chef-made meals near you.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-textMuted">
              Search local chefs, compare delivery windows, and order fresh food from Hamilton kitchens in a few taps.
            </p>

            <form
              data-testid="customer-marketplace-search-form"
              action="/chefs"
              className="mt-7 rounded-lg border border-border bg-surface p-2 shadow-md"
            >
              <label className="sr-only" htmlFor="marketplace-search">
                Search dishes, chefs, or cuisines
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="marketplace-search"
                  name="search"
                  type="search"
                  placeholder="Search dishes, chefs, or cuisines"
                  className="min-h-12 min-w-0 flex-1 rounded-md border border-border bg-background px-4 text-base text-text outline-none transition-colors placeholder:text-textSubtle focus:border-primary focus:shadow-focus"
                />
                <Button type="submit" size="lg" className="sm:w-auto">
                  Search
                </Button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2" aria-label="Popular cuisines">
              {cuisineChips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-textMuted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:shadow-focus whitespace-nowrap"
                >
                  {chip.label}
                </Link>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/chefs/little-saigon">
                <Button size="lg" className="font-bold">
                  Order from Little Saigon
                </Button>
              </Link>
              <Link href="/chefs/bep-ba-muoi">
                <Button variant="secondary" size="lg" className="font-bold">
                  Order from Bếp Bà Muối
                </Button>
              </Link>
              <Link href="/chefs">
                <Button variant="ghost" size="lg">
                  Browse All Chefs →
                </Button>
              </Link>
            </div>
          </div>

          <Card elevated padding="none" className="overflow-hidden border border-[#57BBFF]/40 bg-surface shadow-lg">
            {/* Visual Cover Banner */}
            <div className="relative h-36 w-full overflow-hidden bg-primarySoft">
              <img
                src="/chefs/little-saigon/cover.jpg"
                alt="Little Saigon signature Vietnamese kitchen"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-[#EE3985] animate-pulse" />
                  Featured Cooco Partner
                </span>
                <span className="rounded-full bg-success px-2.5 py-0.5 text-xs font-semibold text-white shadow-xs">
                  Open now
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <Link href="/chefs/little-saigon" className="group block">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-primary shadow-sm">
                    <img
                      src="/chefs/little-saigon/logo.jpg"
                      alt="Little Saigon Restaurant logo"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold leading-snug text-text group-hover:text-primary transition-colors">
                      Little Saigon Restaurant
                    </h3>
                    <p className="text-xs text-textMuted">Authentic Vietnamese Phở & Regional Food</p>
                    <p className="mt-0.5 text-xs font-medium text-[#EE3985]">891 Upper James St, Hamilton</p>
                  </div>
                </div>
              </Link>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-primarySoft p-3">
                  <p className="text-xl font-bold text-primary">
                    {activeChefs > 0 ? activeChefs : 2}
                  </p>
                  <p className="text-xs text-textMuted">Local Chefs</p>
                </div>
                <div className="rounded-lg bg-accentSoft p-3">
                  <p className="text-xl font-bold text-accent">
                    {liveMenuItems > 0 ? `${liveMenuItems}+` : '250+'}
                  </p>
                  <p className="text-xs text-textMuted">Live Dishes</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link href="/chefs/little-saigon" className="block w-full">
                  <Button variant="primary" size="md" className="w-full font-bold">
                    Little Saigon Menu (196 Dishes)
                  </Button>
                </Link>
                <Link href="/chefs/bep-ba-muoi" className="block w-full">
                  <Button variant="secondary" size="md" className="w-full font-bold text-xs">
                    Bếp Bà Muối Menu (55 Dishes) →
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
