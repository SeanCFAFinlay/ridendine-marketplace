import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, updateCustomer } from '@ridendine/db';
import { updateCustomerProfileSchema } from '@ridendine/validation';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const validated = updateCustomerProfileSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const updates: any = {};
    if (validated.firstName !== undefined) {
      updates.first_name = validated.firstName;
    }
    if (validated.lastName !== undefined) {
      updates.last_name = validated.lastName;
    }
    if (validated.phone !== undefined) {
      updates.phone = validated.phone;
    }
    if (validated.profileImageUrl !== undefined) {
      updates.profile_image_url = validated.profileImageUrl;
    }

    const updatedCustomer = await updateCustomer(
      supabase,
      customer.id,
      updates
    );

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
