import { cookies } from 'next/headers';
import { createServerClient, createAdminClient, getChefById } from '@ridendine/db';
import { ProfileForm } from '@/components/profile/profile-form';
import { FoodSafetyCompliance } from '@/components/profile/food-safety-compliance';
import { NotificationPreferences } from '@/components/settings/notification-preferences';

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

  if (!profile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-textMuted">No profile found. Please complete your setup.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Profile Settings</h1>
        <p className="mt-1 text-textMuted">Manage your chef profile information and Ontario food safety compliance</p>
      </div>

      <ProfileForm profile={profile} />
      <FoodSafetyCompliance chefId={profile.id} />
      <NotificationPreferences />
    </div>
  );
}
