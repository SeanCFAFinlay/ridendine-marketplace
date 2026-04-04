import { NextResponse } from 'next/server';
import { createAdminClient, listOpsCustomers, type SupabaseClient } from '@ridendine/db';
import { getOpsActorContext, errorResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify ops user is authenticated
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const data = await listOpsCustomers(supabase);

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify ops user is authenticated
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const supabase = createAdminClient();
    const body = await request.json();

    const { first_name, last_name, email, phone } = body;

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Create customer (user_id is null for admin-created customers)
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        user_id: null,
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
