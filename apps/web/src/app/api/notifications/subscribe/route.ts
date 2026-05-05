import { NextResponse } from 'next/server';
import { createServerClient } from '@ridendine/db';
import { cookies } from 'next/headers';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const body = await request.json();
    const { subscription } = body;

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: customer.user_id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const body = await request.json();
    const { endpoint } = body;

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', customer.user_id)
      .eq('endpoint', endpoint);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
