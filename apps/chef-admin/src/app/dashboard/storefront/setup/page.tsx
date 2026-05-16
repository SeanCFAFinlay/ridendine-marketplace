import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, getStorefrontByChefId, type SupabaseClient } from '@ridendine/db';
import { EmptyState } from '@ridendine/ui';
import { StorefrontSetupForm } from '@/components/storefront/storefront-setup-form';

export const dynamic = 'force-dynamic';

async function getSetupContext() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
  } catch {
    return { isAuthenticated: false, hasChefProfile: false, chefStatus: null, storefront: null };
  }
}

function ApprovalBanner({ chefStatus }: { chefStatus: string | null }) {
  if (!chefStatus || chefStatus === 'approved') return null;

  const message =
    chefStatus === 'pending'
      ? 'Your chef account is pending ops review. You can complete storefront setup now, but customers will not see it until ops approves and publishes your storefront.'
      : 'Your chef account is not currently approved. You can review setup details, but customers will not see the storefront until access is restored.';

  return (
    <div className="mb-6 rounded-xl border border-warning/30 bg-warningSoft p-4 text-sm text-warning">
      {message}
    </div>
  );
}

export default async function StorefrontSetupPage() {
  const { isAuthenticated, hasChefProfile, chefStatus, storefront } = await getSetupContext();

  if (!isAuthenticated) {
    return (
      <div className="flex h-96 items-center justify-center">
        <EmptyState
          className="border-warning/30 bg-warningSoft"
          title="Sign in required"
          description="You need to be signed in to complete storefront setup."
          action={
            <Link
              href="/auth/login?redirect=/dashboard/storefront/setup"
              className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
            >
              Sign in
            </Link>
          }
        />
      </div>
    );
  }

  if (!hasChefProfile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <EmptyState
          className="border-border bg-white"
          title="Chef profile required"
          description="Create your chef profile before opening storefront setup."
          action={
            <Link
              href="/auth/signup"
              className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
            >
              Create chef profile
            </Link>
          }
        />
      </div>
    );
  }

  if (storefront) {
    redirect('/dashboard/storefront');
  }

  return (
    <div>
      <ApprovalBanner chefStatus={chefStatus} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Storefront setup</h1>
        <p className="mt-1 text-textMuted">Create the storefront customers will see on RideNDine.</p>
      </div>
      <StorefrontSetupForm />
    </div>
  );
}
