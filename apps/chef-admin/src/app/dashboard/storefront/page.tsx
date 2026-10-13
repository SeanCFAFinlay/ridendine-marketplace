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
      <div className="mb-6 rounded-xl border border-warning/30 bg-warningSoft p-4 text-sm text-warning">
        Your chef account is pending ops review. You can complete your storefront setup now, but customers will not see it until ops approves your chef profile and publishes your storefront.
      </div>
    );
  }

  if (chefStatus === 'rejected') {
    return (
      <div className="mb-6 rounded-xl border border-danger/30 bg-dangerSoft p-4 text-sm text-danger">
        Your chef account has been rejected. Your storefront remains private. Contact ops support before making further launch changes.
      </div>
    );
  }

  if (chefStatus === 'suspended') {
    return (
      <div className="mb-6 rounded-xl border border-danger/30 bg-dangerSoft p-4 text-sm text-danger">
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
            className="border-warning/30 bg-warningSoft"
            icon={
              <svg className="h-12 w-12 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            title="Sign in required"
            description="You need to be signed in to manage your storefront."
            action={
              <Link
                href="/auth/login"
                className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
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
            className="border-border bg-white"
            icon={
              <svg className="h-12 w-12 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            title="Chef profile not found"
            description="Complete your chef registration to set up your storefront and start receiving orders."
            action={
              <Link
                href="/dashboard/storefront/setup"
                className="inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
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
        <div className="mb-6 rounded-xl border border-[#57BBFF]/40 bg-gradient-to-r from-[#57BBFF]/10 via-surface to-[#EE3985]/10 p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-[#57BBFF] to-[#EE3985] text-lg font-bold text-white shadow-sm">
                C
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-text">Cooco Partner Kitchen</h3>
                  <span className="rounded-full bg-[#57BBFF]/20 px-2 py-0.5 text-[10px] font-bold text-[#0284c7] dark:text-[#7dd3fc]">
                    Active Onboarding
                  </span>
                </div>
                <p className="text-xs text-textMuted">
                  Integrated with partner profile <code className="font-mono text-[11px] text-text">06b4462d-a5af-4c47-aa30-7ced490262c5</code> (Bếp Bà Muối · Hamilton, ON)
                </p>
              </div>
            </div>
            <a
              href="https://cooco.app/cooks/06b4462d-a5af-4c47-aa30-7ced490262c5"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#57BBFF]/40 bg-surface px-3 py-1.5 text-xs font-semibold text-text shadow-xs transition-colors hover:bg-[#57BBFF]/10 sm:self-auto"
            >
              <span>View on cooco.app</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-text">Storefront</h1>
          <p className="mt-1 text-textMuted">Customize how customers see your kitchen</p>
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
          className="border-danger/30 bg-dangerSoft"
          icon={
            <svg className="h-12 w-12 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
