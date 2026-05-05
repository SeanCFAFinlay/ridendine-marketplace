import { NextResponse } from 'next/server';
import { getChefActorContext, getEngine } from '@/lib/engine';

export async function POST(request: Request) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;
    const amountCents = Math.round(Number(amount) * 100);

    if (!Number.isInteger(amountCents) || amountCents < 1000) {
      return NextResponse.json(
        { error: 'Minimum payout amount is $10' },
        { status: 400 }
      );
    }

    const engine = getEngine();
    const scheduled = await engine.payoutAutomation.scheduleChefPayout({
      chefId: chefContext.chefId,
      storefrontId: chefContext.storefrontId,
      amountCents,
      actor: chefContext.actor,
    });

    if (scheduled.error) {
      return NextResponse.json({ error: scheduled.error }, { status: 400 });
    }

    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return NextResponse.json({
      payout: {
        id: scheduled.payoutId,
        chef_id: chefContext.chefId,
        amount: scheduled.amountCents,
        status: 'scheduled',
        created_at: now.toISOString(),
        paid_at: null,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error requesting payout:', error);
    return NextResponse.json(
      { error: 'Failed to request payout' },
      { status: 500 }
    );
  }
}
