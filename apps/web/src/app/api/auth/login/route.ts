import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getCustomerByUserId } from '@ridendine/db';
import { loginSchema } from '@ridendine/validation';
import { handleApiError } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validated = loginSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const customer = await getCustomerByUserId(
      supabase,
      authData.user.id
    );

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        customer,
        session: authData.session,
      },
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
