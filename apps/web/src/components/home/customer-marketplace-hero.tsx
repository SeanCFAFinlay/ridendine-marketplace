import Image from 'next/image';
import Link from 'next/link';
import { Badge, Button, Card } from '@ridendine/ui';

const cuisineChips = [
  { label: '🔥 Bếp Bà Muối (Cooco)', href: '/chefs/bep-ba-muoi' },
  { label: 'Vietnamese', href: '/chefs?cuisine=Vietnamese' },
  { label: 'Beef Stew (Bò Kho)', href: '/chefs?search=bo+kho' },
  { label: 'Broken Rice (Cơm Tấm)', href: '/chefs?search=com+tam' },
  { label: 'Noodles & Soups', href: '/chefs?search=noodles' },
  { label: 'Burgers', href: '/chefs?cuisine=American' },
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

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/chefs/bep-ba-muoi">
                <Button size="lg" className="w-full sm:w-auto font-bold">
                  Order from Bếp Bà Muối
                </Button>
              </Link>
              <Link href="/chefs">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Browse All Chefs
                </Button>
              </Link>
            </div>
          </div>

          <Card elevated padding="none" className="overflow-hidden border border-[#57BBFF]/40 bg-surface shadow-lg">
            {/* Visual Cover Banner */}
            <div className="relative h-36 w-full overflow-hidden bg-primarySoft">
              <img
                src="/chefs/bep-ba-muoi/cover.png"
                alt="Bếp Bà Muối signature cooking"
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
              <Link href="/chefs/bep-ba-muoi" className="group block">
                <div className="flex items-start gap-3">
                  <div className="-mt-8 h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-surface bg-primary shadow-md">
                    <img
                      src="/chefs/bep-ba-muoi/avatar.png"
                      alt="Bếp Bà Muối logo"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="text-base font-bold leading-snug text-text group-hover:text-primary transition-colors">
                      Bếp Bà Muối (Ba Muoi Kitchen)
                    </h3>
                    <p className="text-xs text-textMuted">Authentic Vietnamese Home Cooking</p>
                    <p className="mt-0.5 text-xs font-medium text-[#EE3985]">Pick up near Eastgate Square, Hamilton</p>
                  </div>
                </div>
              </Link>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-primarySoft p-3">
                  <p className="text-xl font-bold text-primary">
                    {activeChefs > 0 ? activeChefs : 1}
                  </p>
                  <p className="text-xs text-textMuted">Local Chefs</p>
                </div>
                <div className="rounded-lg bg-accentSoft p-3">
                  <p className="text-xl font-bold text-accent">
                    {liveMenuItems > 0 ? `${liveMenuItems}+` : '55+'}
                  </p>
                  <p className="text-xs text-textMuted">Live Dishes</p>
                </div>
              </div>

              <Link href="/chefs/bep-ba-muoi" className="block w-full">
                <Button variant="primary" size="md" className="w-full font-bold">
                  View Full Menu & Order (55 Dishes)
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
