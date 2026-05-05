import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { finalizeOpsActor, getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'customers_write'));
  if (opsActor instanceof Response) return opsActor;

  const { id: customerId } = await params;
  const { title, body } = await request.json();

  if (!title || !body) {
    return NextResponse.json({ error: 'title and body required' }, { status: 400 });
  }

  const client = createAdminClient() as any;

  const { data: customer } = await client
    .from('customers')
    .select('user_id')
    .eq('id', customerId)
    .single();

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  await client.from('notifications').insert({
    user_id: customer.user_id,
    type: 'ops_message',
    title,
    body,
    message: body,
    data: { from: 'ops', sentBy: opsActor.userId },
  });

  return NextResponse.json({ success: true });
}
