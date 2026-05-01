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
        <p className="text-gray-500">No storefront found. Please complete your setup.</p>
      </div>
    );
  }

  const menuCategories = await getMenuData(storefront.id);

  return (
    <div className="min-w-0 max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            Manage your menu categories and items
          </p>
        </div>
      </div>

      <MenuList categories={menuCategories} />
    </div>
  );
}
