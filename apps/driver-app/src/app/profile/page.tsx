import { cookies } from 'next/headers';
import { createServerClient, getDriverByUserId } from '@ridendine/db';
import ProfileView from './components/ProfileView';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Please sign in</h2>
          <p className="mt-2 text-textMuted">You need to be signed in to view your profile</p>
        </div>
      </div>
    );
  }

  const driver = await getDriverByUserId(supabase as any, user.id);

  if (!driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Driver profile not found</h2>
          <p className="mt-2 text-textMuted">Please contact support</p>
        </div>
      </div>
    );
  }

  return <ProfileView driver={driver} />;
}
