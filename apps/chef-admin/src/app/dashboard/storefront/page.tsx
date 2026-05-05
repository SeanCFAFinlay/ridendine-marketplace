import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId, type SupabaseClient } from '@ridendine/db';
import { EmptyState } from '@ridendine/ui';
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
          <EmptyState
            className="border-amber-200 bg-amber-50"
            icon={
              <svg className="h-12 w-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            title="Sign in required"
            description="You need to be signed in to manage your storefront."
            action={
              <Link
                href="/auth/login"
                className="inline-flex rounded-lg bg-[#E85D26] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d44e1e]"
              >
                Sign In
              </Link>
            }
          />
        </div>
      );
    }

    // Authenticated but no chef profile
    if (!hasChefProfile) {
      return (
        <div className="flex h-96 items-center justify-center">
          <EmptyState
            className="border-gray-200 bg-white"
            icon={
              <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            title="Chef profile not found"
            description="Complete your chef registration to set up your storefront and start receiving orders."
            action={
              <Link
                href="/dashboard/storefront/setup"
                className="inline-flex rounded-lg bg-[#E85D26] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#d44e1e]"
              >
                Complete Setup
              </Link>
            }
          />
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

        <StorefrontForm
          storefront={{
            ...storefront,
            cuisine_types: storefront.cuisine_types ?? [],
          }}
        />
      </div>
    );
  } catch (error) {
    console.error('Storefront page error:', error);
    return (
      <div className="flex h-96 items-center justify-center">
        <EmptyState
          className="border-red-200 bg-red-50"
          icon={
            <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          }
          title="Unable to load storefront"
          description="Something went wrong. Please refresh the page or contact support."
        />
      </div>
    );
  }
}
