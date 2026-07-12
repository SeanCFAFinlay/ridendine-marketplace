import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { KitchenScopeProvider } from '@/components/layout/kitchen-scope-provider';
import { getKitchenScopeData } from '@/lib/kitchen-scope';

// NOTE: The redirect-based role check that briefly lived here (Phase C of
// the 2026-05-13 stabilization pass) caused a redirect loop on chef.ridendine.ca:
// /dashboard → /auth/login → middleware sees session → / → /dashboard → ...
// because chef-admin's root page (apps/chef-admin/src/app/page.tsx) redirects
// to /dashboard and the chef-admin middleware's authenticatedRedirect points
// at '/'. The dashboard page itself ([./page.tsx]) already renders a graceful
// state for "no chef profile / no storefront" via its own getChefContext
// helper, and every privileged API route enforces getChefActorContext which
// requires status='approved'. Role-gating belongs in Phase D — likely via a
// dedicated /onboarding entry route or a "you don't have a chef account" page,
// not via an in-layout redirect that fights the middleware.

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ghost-kitchen scope for the shell (null for independent/onboarding chefs —
  // the shell then renders exactly as before). Never throws the layout.
  const scope = await getKitchenScopeData().catch(() => null);

  return (
    <KitchenScopeProvider scope={scope}>
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </KitchenScopeProvider>
  );
}
