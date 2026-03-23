import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, createCustomer } from '@ridendine/db';
import { signupSchema } from '@ridendine/validation';
import { handleApiError } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validated = signupSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const customer = await createCustomer(supabase, {
      user_id: authData.user.id,
      first_name: validated.firstName,
      last_name: validated.lastName,
      email: validated.email,
      phone: validated.phone || null,
      profile_image_url: null,
    });

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        customer,
      },
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
