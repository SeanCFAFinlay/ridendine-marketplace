import { NextRequest } from 'next/server';
import { createAdminClient, createServerClient } from '@ridendine/db';
import { cookies } from 'next/headers';
import { isUuid } from '@ridendine/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient() as any;
  const { data: customer } = await adminClient.from('customers').select('id').eq('user_id', user.id).single();
  if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

  const { data: favorites, error } = await adminClient
    .from('favorites')
    .select(`
      id, created_at,
      storefront:chef_storefronts(id, slug, name, cuisine_types, average_rating, total_reviews, logo_url, cover_image_url)
    `)
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data: favorites });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { storefrontId } = await request.json();
  if (!storefrontId || typeof storefrontId !== 'string') {
    return Response.json({ error: 'storefrontId required' }, { status: 400 });
  }
  if (!isUuid(storefrontId)) {
    return Response.json({ error: 'Invalid storefrontId' }, { status: 400 });
  }

  const adminClient = createAdminClient() as any;
  const { data: customer } = await adminClient.from('customers').select('id').eq('user_id', user.id).single();
  if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

  // Toggle: if already favorited, remove. If not, add.
  const { data: existing } = await adminClient
    .from('favorites')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('storefront_id', storefrontId)
    .single();

  if (existing) {
    await adminClient.from('favorites').delete().eq('id', existing.id);
    return Response.json({ success: true, action: 'removed' });
  }

  const { error } = await adminClient.from('favorites').insert({
    customer_id: customer.id,
    storefront_id: storefrontId,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, action: 'added' });
}
