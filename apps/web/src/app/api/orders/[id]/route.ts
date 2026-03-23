import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        ),
        chef_storefronts (
          id,
          name,
          slug,
          logo_url
        ),
        customer_addresses (*)
      `)
      .eq('id', id)
      .eq('customer_id', customer.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
