import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('customers')
      .select('*, orders(count)')
      .order('created_at', { ascending: false });

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

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    const { first_name, last_name, email, phone } = body;

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Generate a placeholder user_id for ops-admin created customers
    const placeholderUserId = `ops-created-${Date.now()}`;

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        user_id: placeholderUserId,
        first_name,
        last_name,
        email,
        phone: phone || null,
        profile_image_url: null,
      })
      .select()
      .single();

    if (customerError) {
      console.error('Failed to create customer:', customerError);
      return NextResponse.json(
        { error: customerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error) {
    console.error('Failed to create customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
