import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId, getOrdersByStorefront } from '@ridendine/db';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: chefProfile }: any = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    const storefront = await getStorefrontByChefId(supabase as any, chefProfile.id);
    if (!storefront) {
      return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });
    }

    const orders = await getOrdersByStorefront(supabase as any, storefront.id);

    const { data: customers }: any = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email')
      .in('id', orders.map((o: any) => o.customer_id));

    const { data: addresses }: any = await supabase
      .from('delivery_addresses')
      .select('id, street_address, city, state, postal_code')
      .in('id', orders.map((o: any) => o.delivery_address_id).filter(Boolean));

    const ordersWithCustomers = orders.map((order: any) => ({
      ...order,
      customer: customers?.find((c: any) => c.id === order.customer_id),
      address: addresses?.find((a: any) => a.id === order.delivery_address_id),
    }));

    return NextResponse.json({ orders: ordersWithCustomers });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
