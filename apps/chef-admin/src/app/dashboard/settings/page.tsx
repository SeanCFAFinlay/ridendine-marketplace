import { cookies } from 'next/headers';
import { createServerClient, getChefByUserId } from '@ridendine/db';
import { ProfileForm } from '@/components/profile/profile-form';
import { NotificationPreferences } from '@/components/settings/notification-preferences';

export const dynamic = 'force-dynamic';

async function getChefProfile() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return await getChefByUserId(supabase as any, user.id);
}

export default async function SettingsPage() {
  const profile = await getChefProfile();

  if (!profile) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">No profile found. Please complete your setup.</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-1 text-gray-500">Manage your chef profile information</p>
      </div>

      <ProfileForm profile={profile} />
      <NotificationPreferences />
    </div>
  );
}
