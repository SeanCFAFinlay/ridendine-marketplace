import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId } from '@ridendine/db';
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

  const { data: menuItems }: any = await supabase
    .from('menu_items')
    .select('*')
    .eq('storefront_id', storefrontId)
    .order('sort_order', { ascending: true });

  const { data: categories }: any = await supabase
    .from('menu_categories')
    .select('*')
    .eq('storefront_id', storefrontId)
    .order('sort_order', { ascending: true });

  const grouped = categories?.map((category: any) => ({
    ...category,
    items: menuItems?.filter((item: any) => item.category_id === category.id) || [],
  })) || [];

  return grouped;
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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="mt-1 text-gray-500">Manage your menu categories and items</p>
        </div>
      </div>

      <MenuList categories={menuCategories} />
    </div>
  );
}
