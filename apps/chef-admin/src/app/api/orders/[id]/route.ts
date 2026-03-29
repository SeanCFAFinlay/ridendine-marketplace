import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getOrderById, updateOrderStatus, getStorefrontByChefId } from '@ridendine/db';
import { dispatchOrder } from '@ridendine/engine';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await getOrderById(supabase as any, params.id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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
    if (!storefront || storefront.id !== order.storefront_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: customer }: any = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email')
      .eq('id', order.customer_id)
      .single();

    const { data: address }: any = order.delivery_address_id
      ? await supabase
          .from('delivery_addresses')
          .select('id, street_address, city, state, postal_code')
          .eq('id', order.delivery_address_id)
          .single()
      : { data: null };

    return NextResponse.json({
      order: {
        ...order,
        customer,
        address,
      },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await getOrderById(supabase as any, params.id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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
    if (!storefront || storefront.id !== order.storefront_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status } = body;

    const validStatuses = ['accepted', 'rejected', 'preparing', 'ready_for_pickup'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedOrder = await updateOrderStatus(supabase as any, params.id, status);

    // Dispatch to driver when order is ready for pickup
    if (status === 'ready_for_pickup') {
      const dispatchResult = await dispatchOrder(supabase as any, params.id);
      if (dispatchResult.success) {
        console.log(`Order ${params.id} dispatched to driver ${dispatchResult.driverId}`);
      } else {
        console.log(`Dispatch pending for order ${params.id}: ${dispatchResult.error}`);
      }
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
