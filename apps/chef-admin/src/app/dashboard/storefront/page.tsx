import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId } from '@ridendine/db';
import { StorefrontForm } from '@/components/storefront/storefront-form';
import { StorefrontSetupForm } from '@/components/storefront/storefront-setup-form';

export const dynamic = 'force-dynamic';

async function getChefData() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isAuthenticated: false, hasChefProfile: false, storefront: null };

    const result: any = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (result.error || !result.data) {
      return { isAuthenticated: true, hasChefProfile: false, storefront: null };
    }

    const storefront = await getStorefrontByChefId(supabase as any, result.data.id);
    return { isAuthenticated: true, hasChefProfile: true, storefront };
  } catch (error) {
    console.error('Error getting chef data:', error);
    return { isAuthenticated: false, hasChefProfile: false, storefront: null };
  }
}

export default async function StorefrontPage() {
  try {
    const { isAuthenticated, hasChefProfile, storefront } = await getChefData();

    // Not authenticated
    if (!isAuthenticated) {
      return (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <p className="text-gray-900 font-semibold">Please sign in</p>
            <p className="mt-2 text-gray-500 text-sm">You need to be signed in to manage your storefront.</p>
          </div>
        </div>
      );
    }

    // Authenticated but no chef profile
    if (!hasChefProfile) {
      return (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <p className="text-gray-900 font-semibold">Chef profile not found</p>
            <p className="mt-2 text-gray-500 text-sm">Please complete your chef registration first.</p>
          </div>
        </div>
      );
    }

    // Has chef profile but no storefront - show setup form
    if (!storefront) {
      return <StorefrontSetupForm />;
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
