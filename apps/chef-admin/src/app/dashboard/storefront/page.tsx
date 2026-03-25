import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId } from '@ridendine/db';
import { StorefrontForm } from '@/components/storefront/storefront-form';

export const dynamic = 'force-dynamic';

async function getChefStorefront() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const result: any = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (result.error || !result.data) return null;

    return await getStorefrontByChefId(supabase as any, result.data.id);
  } catch (error) {
    console.error('Error getting chef storefront:', error);
    return null;
  }
}

export default async function StorefrontPage() {
  try {
    const storefront = await getChefStorefront();

    if (!storefront) {
      return (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">No storefront found. Please complete your setup.</p>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storefront</h1>
          <p className="mt-1 text-gray-500">Customize how customers see your kitchen</p>
        </div>

        <StorefrontForm storefront={storefront} />
      </div>
    );
  } catch (error) {
    console.error('Storefront page error:', error);
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 font-semibold">Unable to load storefront</p>
          <p className="mt-2 text-gray-500 text-sm">Please refresh the page or contact support.</p>
        </div>
      </div>
    );
  }
}
