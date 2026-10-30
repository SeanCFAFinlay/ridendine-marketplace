import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  getStorefrontByChefId,
  getStorefrontById,
  getChefById,
} from '@ridendine/db';
import type { Tables } from '@ridendine/db';

export type ChefProfile = Pick<
  Tables<'chef_profiles'>,
  'id' | 'display_name' | 'status' | 'phone' | 'bio'
>;

export type StorefrontRow = Tables<'chef_storefronts'> | null;

export async function getChefStorefrontContext(): Promise<{
  user: any;
  chef: ChefProfile | null;
  storefront: StorefrontRow;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, chef: null, storefront: null };
    }

    const adminClient = createAdminClient();

    // 1. Direct chef profile link
    let { data: chef } = await adminClient
      .from('chef_profiles')
      .select('id, display_name, status, phone, bio')
      .eq('user_id', user.id)
      .maybeSingle();

    let storefront: StorefrontRow = null;

    if (chef) {
      storefront = await getStorefrontByChefId(adminClient as any, chef.id);
    }

    // 2. Kitchen staff operator link (e.g. Ryo at Ba Muoi Kitchen)
    if (!storefront) {
      const { data: staffMember } = await adminClient
        .from('kitchen_staff')
        .select('storefront_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (staffMember?.storefront_id) {
        storefront = await getStorefrontById(adminClient as any, staffMember.storefront_id);
        if (storefront?.chef_id && !chef) {
          chef = await getChefById(adminClient, storefront.chef_id);
        }
      }
    }

    // 3. Super admin fallback
    if (!storefront) {
      const isSuperAdmin =
        user.app_metadata?.role === 'super_admin' ||
        user.user_metadata?.role === 'super_admin' ||
        user.email === 'sean@ridendine.ca';

      if (isSuperAdmin) {
        const { data: primaryChef } = await adminClient
          .from('chef_profiles')
          .select('id, display_name, status, phone, bio')
          .eq('status', 'approved')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (primaryChef) {
          chef = primaryChef;
          storefront = await getStorefrontByChefId(adminClient as any, primaryChef.id);
        }
      }
    }

    return {
      user,
      chef: (chef as ChefProfile) || null,
      storefront,
    };
  } catch (err) {
    console.error('[getChefStorefrontContext] error:', err);
    return { user: null, chef: null, storefront: null };
  }
}
