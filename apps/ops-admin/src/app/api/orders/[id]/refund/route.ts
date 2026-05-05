import { NextResponse } from 'next/server';
import { refundSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  finalizeOpsActor,
  getOpsActorContext,
  getEngine,
  guardPlatformApi,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    const opsActor = finalizeOpsActor(
      actor,
      guardPlatformApi(actor, 'finance_refunds_sensitive')
    );
    if (opsActor instanceof Response) return opsActor;

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.opsAdminMutation,
      namespace: 'ops-order-refund-post',
      userId: opsActor.userId,
      routeKey: 'POST:/api/orders/[id]/refund',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid refund payload' },
        { status: 400 }
      );
    }

    const engine = getEngine();
    const amountCents = Math.round(parsed.data.amount);
    const refundReason =
      parsed.data.reason === 'fraudulent'
        ? 'fraudulent'
        : parsed.data.reason === 'duplicate'
          ? 'duplicate_charge'
          : 'customer_requested';

    const requested = await engine.operations.execute(
      {
        action: 'request_refund',
        orderId: id,
        amountCents,
        reason: refundReason,
        notes: parsed.data.reason || 'Ops refund requested',
      },
      opsActor
    );
    const refundCase = requested.data as { id?: string } | undefined;
    if (!requested.success || !refundCase?.id) {
      return NextResponse.json(
        { error: requested.error?.message || 'Refund request failed' },
        { status: 400 }
      );
    }

    const approved = await engine.operations.execute(
      {
        action: 'approve_refund',
        refundCaseId: refundCase.id,
        approvedAmountCents: amountCents,
      },
      opsActor
    );
    if (!approved.success) {
      return NextResponse.json(
        { error: approved.error?.message || 'Refund approval failed' },
        { status: 400 }
      );
    }

    const processed = await engine.operations.execute(
      {
        action: 'process_refund',
        refundCaseId: refundCase.id,
      },
      opsActor
    );
    if (!processed.success) {
      return NextResponse.json(
        { error: processed.error?.message || 'Refund processing failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: processed.data,
    });
  } catch (error) {
    console.error('Refund error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
