import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId, type SupabaseClient } from '@ridendine/db';
import { StorefrontForm } from '@/components/storefront/storefront-form';
import { StorefrontSetupForm } from '@/components/storefront/storefront-setup-form';

export const dynamic = 'force-dynamic';

async function getChefData() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isAuthenticated: false, hasChefProfile: false, chefStatus: null, storefront: null };

    const { data: chefProfile, error } = await supabase
      .from('chef_profiles')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (error || !chefProfile) {
      return { isAuthenticated: true, hasChefProfile: false, chefStatus: null, storefront: null };
    }

    const storefront = await getStorefrontByChefId(
      supabase as unknown as SupabaseClient,
      chefProfile.id
    );
    return {
      isAuthenticated: true,
      hasChefProfile: true,
      chefStatus: chefProfile.status,
      storefront,
    };
  } catch (error) {
    console.error('Error getting chef data:', error);
    return { isAuthenticated: false, hasChefProfile: false, chefStatus: null, storefront: null };
  }
}

function ApprovalBanner({ chefStatus }: { chefStatus: string | null }) {
  if (!chefStatus || chefStatus === 'approved') {
    return null;
  }

  if (chefStatus === 'pending') {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Your chef account is pending ops review. You can complete your storefront setup now, but customers will not see it until ops approves your chef profile and publishes your storefront.
      </div>
    );
  }

  if (chefStatus === 'rejected') {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Your chef account has been rejected. Your storefront remains private. Contact ops support before making further launch changes.
      </div>
    );
  }

  if (chefStatus === 'suspended') {
    return (
      <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Your chef account is suspended. Your storefront is not visible to customers until ops restores access.
      </div>
    );
  }

  return null;
}

export default async function StorefrontPage() {
  try {
    const { isAuthenticated, hasChefProfile, chefStatus, storefront } = await getChefData();

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
      return (
        <div>
          <ApprovalBanner chefStatus={chefStatus} />
          <StorefrontSetupForm />
        </div>
      );
    }

    return (
      <div>
        <ApprovalBanner chefStatus={chefStatus} />
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
