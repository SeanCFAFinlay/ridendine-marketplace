import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('deliveries')
      .select('*, orders(order_number, total), drivers(first_name, last_name)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
