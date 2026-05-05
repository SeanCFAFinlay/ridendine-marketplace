import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getChefByUserId, updateChefProfile } from '@ridendine/db';
import { getChefActorContext } from '@/lib/engine';

export async function GET(_request: NextRequest) {
  try {
    const ctx = await getChefActorContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const chefProfile = await getChefByUserId(supabase as any, ctx.actor.userId);
    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: chefProfile });
  } catch (error) {
    console.error('Error fetching chef profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ctx = await getChefActorContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const chefProfile = await getChefByUserId(supabase as any, ctx.actor.userId);
    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { display_name, bio, phone, profile_image_url } = body;

    const updates: any = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (phone !== undefined) updates.phone = phone;
    if (profile_image_url !== undefined) updates.profile_image_url = profile_image_url;

    const updatedProfile = await updateChefProfile(supabase as any, chefProfile.id, updates);

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Error updating chef profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
