import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('orders')
      .select('*, customers(first_name, last_name, email), chef_storefronts(name)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
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
