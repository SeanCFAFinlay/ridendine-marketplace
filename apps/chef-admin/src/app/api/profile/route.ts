import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient, getChefById, updateChefProfile } from '@ridendine/db';
import { routeUpdateChefProfileSchema } from '@ridendine/validation';
import { getChefActorContext } from '@/lib/engine';

export async function GET(_request: NextRequest) {
  try {
    const ctx = await getChefActorContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createAdminClient();
    const chefProfile = await getChefById(adminClient, ctx.chefId);
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

    const adminClient = createAdminClient();
    const chefProfile = await getChefById(adminClient, ctx.chefId);
    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = routeUpdateChefProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid profile payload' },
        { status: 400 }
      );
    }
    const { display_name, bio, phone, profile_image_url } = parsed.data;

    const updates: any = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (phone !== undefined) updates.phone = phone;
    if (profile_image_url !== undefined) updates.profile_image_url = profile_image_url;

    const updatedProfile = await updateChefProfile(adminClient, chefProfile.id, updates);

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error('Error updating chef profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
