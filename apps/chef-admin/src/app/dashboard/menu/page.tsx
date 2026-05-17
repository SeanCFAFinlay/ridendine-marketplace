import { cookies } from 'next/headers';
import {
  createServerClient,
  getStorefrontByChefId,
  getStorefrontMenu,
} from '@ridendine/db';
import { MenuList } from '@/components/menu/menu-list';

export const dynamic = 'force-dynamic';

async function getChefStorefront() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: chefProfile }: any = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!chefProfile) return null;

  return await getStorefrontByChefId(supabase as any, chefProfile.id);
}

async function getMenuData(storefrontId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  return getStorefrontMenu(supabase as any, storefrontId, { includeUnavailable: true });
}

export default async function MenuPage() {
  const storefront = await getChefStorefront();

  if (!storefront) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-textMuted">No storefront found. Please complete your setup.</p>
      </div>
    );
  }

  const menuCategories = await getMenuData(storefront.id);
  const items = menuCategories.flatMap((category) => category.items);
  const availableItems = items.filter((item) => item.is_available && !item.is_sold_out).length;
  const soldOutItems = items.filter((item) => item.is_sold_out).length;
  const lowCapacityItems = items.filter((item) => (
    item.daily_limit != null &&
    Number(item.daily_limit) > 0 &&
    Number(item.daily_limit) - Number(item.daily_sold ?? 0) <= 3
  )).length;
  const missingSetupItems = items.filter((item) => (
    !item.image_url ||
    !item.description ||
    !item.prep_time_minutes ||
    item.daily_limit == null
  )).length;

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Menu Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text">Production menu control</h1>
          <p className="mt-1 max-w-3xl text-sm text-textMuted sm:text-base">
            Manage what customers can order, what the kitchen can produce today, and what ops can trust across storefront, admin, and delivery workflows.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white px-4 py-3 text-sm shadow-sm">
          <p className="font-semibold text-text">{storefront.name}</p>
          <p className="mt-0.5 text-textMuted">/{storefront.slug}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Sellable now', value: availableItems, helper: 'Available and not sold out' },
          { label: 'Sold out', value: soldOutItems, helper: 'Needs restock or hide' },
          { label: 'Low capacity', value: lowCapacityItems, helper: 'Three or fewer portions left' },
          { label: 'Needs setup', value: missingSetupItems, helper: 'Missing photo, prep, limit, or copy' },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-textMuted">{metric.label}</p>
            <p className="mt-2 text-3xl font-bold text-text">{metric.value}</p>
            <p className="mt-1 text-xs text-textMuted">{metric.helper}</p>
          </div>
        ))}
      </div>

      <MenuList categories={menuCategories} storefrontName={storefront.name} />
    </div>
  );
}
