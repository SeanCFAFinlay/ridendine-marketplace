import { cookies } from 'next/headers';
import { createServerClient, createAdminClient, getChefById } from '@ridendine/db';
import { ProfileForm } from '@/components/profile/profile-form';
import { FoodSafetyCompliance } from '@/components/profile/food-safety-compliance';
import { NotificationPreferences } from '@/components/settings/notification-preferences';
import { ChangePasswordForm } from '@/components/settings/change-password-form';

export const dynamic = 'force-dynamic';

async function getChefProfile() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  let { data: profile } = await adminClient
    .from('chef_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    const { data: staffMember } = await adminClient
      .from('kitchen_staff')
      .select('storefront_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (staffMember?.storefront_id) {
      const { data: staffStorefront } = await adminClient
        .from('chef_storefronts')
        .select('chef_id')
        .eq('id', staffMember.storefront_id)
        .maybeSingle();
      if (staffStorefront?.chef_id) {
        profile = await getChefById(adminClient, staffStorefront.chef_id);
      }
    }
  }

  if (!profile) {
    const isSuperAdmin =
      user.app_metadata?.role === 'super_admin' ||
      user.user_metadata?.role === 'super_admin' ||
      user.email === 'sean@ridendine.ca';
    if (isSuperAdmin) {
      const { data: primaryChef } = await adminClient
        .from('chef_profiles')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (primaryChef) profile = primaryChef;
    }
  }

  return profile;
}

export default async function SettingsPage() {
  const profile = await getChefProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Account & Profile Settings</h1>
        <p className="mt-1 text-textMuted">Manage your chef credentials, kitchen profile information, and food safety compliance</p>
      </div>

      <ChangePasswordForm />

      {profile ? (
        <>
          <ProfileForm profile={profile} />
          <FoodSafetyCompliance chefId={profile.id} />
          <NotificationPreferences />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-textMuted">No chef bio configured yet. Contact your kitchen administrator to update public details.</p>
        </div>
      )}
    </div>
  );
}
