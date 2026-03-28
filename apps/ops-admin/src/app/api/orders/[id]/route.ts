import { NextResponse } from 'next/server';
import { createAdminClient, getOrderById, updateOrderStatus, type SupabaseClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient() as unknown as SupabaseClient;

    const order = await getOrderById(supabase, id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;

    if (body.status) {
      const order = await updateOrderStatus(supabase, id, body.status);
      return NextResponse.json({ data: order });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
