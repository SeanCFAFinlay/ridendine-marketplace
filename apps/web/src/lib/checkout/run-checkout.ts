// ==========================================
// SHARED CHECKOUT EXECUTION
// Single source of truth for: server quote -> risk -> idempotency -> order
// creation -> Stripe PaymentIntent -> cleanup. Called by the customer-facing
// /api/checkout route (session actor) and the partner /api/partner/checkout
// route (system actor). Auth, rate limiting and body validation stay in the
// routes; this function trusts (actor, customerId, input).
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  getStripeClient,
  evaluateCheckoutRisk,
  assertStripeConfigured,
  getOrCreateStripeCustomer,
  getStripePublishableKey,
  isStripeTestModeConfigured,
} from '@ridendine/engine';
import type { ActorContext } from '@ridendine/types';
import { getEngine, errorResponse, successResponse } from '@/lib/engine';
import { createHash } from 'crypto';
import { validateScheduledFor } from '@/lib/checkout/scheduling';
import { buildCheckoutQuote, roundMoney } from '@/lib/checkout/quote';

export interface CheckoutRequestInput {
  storefrontId: string;
  deliveryAddressId: string;
  tip: number;
  promoCode?: string;
  specialInstructions?: string;
  scheduledFor?: string | null;
  clientSubtotal?: number;
  clientDeliveryFee?: number;
  clientServiceFee?: number;
  clientTax?: number;
  clientTotal?: number;
  saveCard?: boolean;
  savedPaymentMethodId?: string | null;
}

export interface CheckoutResponsePayload {
  clientSecret: string | null;
  orderId: string;
  orderNumber: string;
  total: number;
  /**
   * True when the PaymentIntent was created in Stripe TEST mode (partner test
   * key). Test cards work; no money moves.
   */
  testMode?: boolean;
  /**
   * The publishable key the browser must init Stripe.js with to confirm THIS
   * clientSecret. A test-mode secret cannot be confirmed with the live
   * publishable key, so callers must read this rather than hard-code one.
   */
  publishableKey?: string | null;
  breakdown: {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    tax: number;
    tip: number;
    discount: number;
    deliveryDistanceKm?: number;
    surgeMultiplier?: number;
    surgeActive?: boolean;
  };
}

function hashPayload(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function deriveIdempotencyKey(
  request: Request,
  customerId: string,
  cartId: string,
  input: CheckoutRequestInput
): string {
  const headerKey = request.headers.get('Idempotency-Key')?.trim();
  if (headerKey) {
    return headerKey.slice(0, 128);
  }

  return hashPayload({
    customerId,
    cartId,
    storefrontId: input.storefrontId,
    deliveryAddressId: input.deliveryAddressId,
    tip: input.tip,
    promoCode: input.promoCode ?? null,
    specialInstructions: input.specialInstructions ?? null,
  }).slice(0, 64);
}

const IDEMPOTENCY_COLUMNS =
  'id, request_hash, status, response_payload, order_id, payment_intent_id, created_at, updated_at';

/**
 * A 'processing' row older than this window is considered abandoned (e.g. the
 * server crashed mid-checkout before flipping it to completed/failed) and may
 * be reclaimed by a retry. Genuine concurrent duplicates always have a fresh
 * timestamp and still get IDEMPOTENCY_CONFLICT.
 */
const IDEMPOTENCY_PROCESSING_STALE_MS = 2 * 60 * 1000;

interface IdempotencyRow {
  id: string;
  request_hash: string;
  status: 'processing' | 'completed' | 'failed';
  response_payload: unknown;
  order_id: string | null;
  payment_intent_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function isStaleProcessingRow(row: IdempotencyRow): boolean {
  if (row.status !== 'processing') return false;
  const claimedAt = row.updated_at ?? row.created_at;
  // Without a timestamp we cannot prove staleness — treat as an active claim.
  if (!claimedAt) return false;
  return Date.now() - new Date(claimedAt).getTime() > IDEMPOTENCY_PROCESSING_STALE_MS;
}

/**
 * Atomically re-claim a stale 'processing' row. The conditional update
 * (status still 'processing' AND still older than the staleness cutoff)
 * ensures only one concurrent retry wins the reclaim.
 */
async function reclaimStaleIdempotencyRow(
  adminClient: SupabaseClient,
  rowId: string
): Promise<IdempotencyRow | null> {
  const staleBefore = new Date(Date.now() - IDEMPOTENCY_PROCESSING_STALE_MS).toISOString();
  const result = await (adminClient as any)
    .from('checkout_idempotency_keys')
    .update({
      status: 'processing',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rowId)
    .eq('status', 'processing')
    .lt('updated_at', staleBefore)
    .select(IDEMPOTENCY_COLUMNS)
    .maybeSingle();

  if (result.error) return null;
  return (result.data as IdempotencyRow) ?? null;
}

async function markIdempotencyRecordFailed(
  adminClient: SupabaseClient,
  rowId: string,
  lastError: string
): Promise<void> {
  await (adminClient as any)
    .from('checkout_idempotency_keys')
    .update({
      status: 'failed',
      last_error: lastError.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('id', rowId);
}

async function upsertCheckoutIdempotencyRecord(
  adminClient: SupabaseClient,
  params: {
    customerId: string;
    idempotencyKey: string;
    requestHash: string;
  }
) {
  const idemClient = adminClient as any;

  const existingResult = await idemClient
    .from('checkout_idempotency_keys')
    .select(IDEMPOTENCY_COLUMNS)
    .eq('customer_id', params.customerId)
    .eq('idempotency_key', params.idempotencyKey)
    .maybeSingle();

  const existing = existingResult.data;
  if (existing) {
    return { row: existing as IdempotencyRow, created: false };
  }

  const insertResult = await idemClient
    .from('checkout_idempotency_keys')
    .insert({
      customer_id: params.customerId,
      idempotency_key: params.idempotencyKey,
      request_hash: params.requestHash,
      status: 'processing',
    })
    .select(IDEMPOTENCY_COLUMNS)
    .single();

  if (insertResult.error?.code === '23505') {
    const retryResult = await idemClient
      .from('checkout_idempotency_keys')
      .select(IDEMPOTENCY_COLUMNS)
      .eq('customer_id', params.customerId)
      .eq('idempotency_key', params.idempotencyKey)
      .maybeSingle();
    return { row: retryResult.data as IdempotencyRow | null, created: false };
  }

  if (insertResult.error) {
    throw insertResult.error;
  }

  return { row: insertResult.data as IdempotencyRow, created: true };
}

/**
 * Non-throwing checkout failure that still must mark the idempotency row
 * 'failed' (and cancel any created order) before responding. Thrown so every
 * failure path funnels through the single catch-side cleanup.
 */
class CheckoutFailure extends Error {
  constructor(
    public readonly code: string,
    public readonly publicMessage: string,
    public readonly status: number = 400
  ) {
    super(publicMessage);
    this.name = 'CheckoutFailure';
  }
}

export interface RunCheckoutParams {
  request: Request;
  actor: ActorContext;
  customerId: string;
  input: CheckoutRequestInput;
  /** Originating partner (partner API only); stamped on the order. */
  partnerId?: string | null;
  /** Test-mode order: recorded but kept out of kitchen/finance/loyalty. */
  isTest?: boolean;
}

/**
 * Execute checkout for an already-authenticated actor + resolved customerId.
 * Returns a fully-formed Response (success or error).
 */
export async function runCheckout({
  request,
  actor,
  customerId,
  input,
  partnerId = null,
  isTest = false,
}: RunCheckoutParams): Promise<Response> {
  try {
    const {
      storefrontId,
      deliveryAddressId,
      tip = 0,
      promoCode,
      specialInstructions,
      scheduledFor,
      clientSubtotal,
      clientDeliveryFee,
      clientServiceFee,
      clientTax,
      clientTotal,
      saveCard = false,
      savedPaymentMethodId = null,
    } = input;

    // Validate scheduled_for if provided
    const scheduleValidation = validateScheduledFor(scheduledFor ?? null);
    if (!scheduleValidation.valid) {
      return errorResponse('VALIDATION_ERROR', scheduleValidation.error, 400);
    }
    const resolvedScheduledFor = scheduleValidation.value;

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const engine = getEngine();

    const quoteResult = await buildCheckoutQuote({
      adminClient,
      customerId,
      storefrontId,
      deliveryAddressId,
      tip: Number(tip || 0),
      promoCode,
      clientSubtotal,
      clientDeliveryFee,
      clientServiceFee,
      clientTax,
      clientTotal,
    });
    if (!quoteResult.ok) {
      return errorResponse(
        quoteResult.error.code,
        quoteResult.error.message,
        quoteResult.error.status ?? 400
      );
    }

    const {
      cart,
      menuIds,
      items,
      quote: serverQuote,
      promoCodeId,
      deliveryDistanceKm,
      deliverySurgeMultiplier,
    } = quoteResult.value;
    const subtotalCents = Math.round(serverQuote.subtotal * 100);

    const tipCents = Math.round(Number(tip || 0) * 100);
    const risk = evaluateCheckoutRisk({
      customerId,
      cartId: cart.id,
      amountCents: subtotalCents + tipCents,
      currency: 'cad',
    });
    if (!risk.allowed) {
      await engine.audit.log({
        action: 'override',
        entityType: 'checkout',
        entityId: cart.id,
        actor,
        metadata: {
          code: 'RISK_BLOCKED',
          ...risk.auditPayload,
        },
      });
      return errorResponse(
        'RISK_BLOCKED',
        `Checkout blocked by risk policy: ${risk.reasons.join(', ')}`,
        403
      );
    }

    const readiness = await engine.kitchen.validateCustomerCheckoutReadiness(
      storefrontId,
      menuIds
    );
    if (!readiness.ok) {
      return errorResponse(readiness.code, readiness.message, 400);
    }

    const idempotencyKey = deriveIdempotencyKey(request, customerId, cart.id, {
      storefrontId,
      deliveryAddressId,
      tip: Number(tip || 0),
      promoCode,
      specialInstructions,
      clientSubtotal,
      clientDeliveryFee,
      clientServiceFee,
      clientTax,
      clientTotal,
    });
    const requestHash = hashPayload({
      storefrontId,
      deliveryAddressId,
      tip: Number(tip || 0),
      promoCode: promoCode ?? null,
      specialInstructions: specialInstructions ?? null,
      cartId: cart.id,
      serverQuote,
      items: (cart.cart_items as Array<{ menu_item_id: string; quantity: number; unit_price: number }>).map((item) => ({
        menuItemId: item.menu_item_id,
        quantity: item.quantity,
        unitPrice: roundMoney(item.unit_price),
      })),
    });

    const idemRecord = await upsertCheckoutIdempotencyRecord(adminClient, {
      customerId,
      idempotencyKey,
      requestHash,
    });

    if (!idemRecord.row) {
      return errorResponse('IDEMPOTENCY_CONFLICT', 'Unable to secure idempotency key', 409);
    }
    if (idemRecord.row.request_hash !== requestHash) {
      return errorResponse('IDEMPOTENCY_CONFLICT', 'Idempotency key reused with a different payload', 409);
    }
    if (idemRecord.row.status === 'completed' && idemRecord.row.response_payload) {
      return successResponse(idemRecord.row.response_payload as CheckoutResponsePayload);
    }
    if (idemRecord.row.status === 'processing' && !idemRecord.created) {
      // Crash recovery: a 'processing' row abandoned past the staleness window
      // (server died before flipping it to completed/failed) can be reclaimed.
      // Fresh rows are genuine concurrent duplicates and still conflict.
      const reclaimed = isStaleProcessingRow(idemRecord.row)
        ? await reclaimStaleIdempotencyRow(adminClient, idemRecord.row.id)
        : null;
      if (!reclaimed) {
        return errorResponse('IDEMPOTENCY_CONFLICT', 'Checkout request already in progress', 409);
      }
      idemRecord.row = reclaimed;
    }

    assertStripeConfigured();

    // Fail before an order exists rather than at PaymentIntent creation (which
    // would orphan the order and burn the idempotency key). A test-flagged order
    // must never silently fall back to the live client — that would put a real
    // card behind a transaction the caller asked to be fake.
    if (isTest && !isStripeTestModeConfigured()) {
      return errorResponse(
        'STRIPE_TEST_MODE_UNAVAILABLE',
        'This deployment cannot process test-mode payments (STRIPE_TEST_SECRET_KEY is not set). Contact RideNDine ops to enable test-card checkout for your test key.',
        503
      );
    }

    let createdOrderId: string | null = null;
    try {
      // Create order via engine
      const orderResult = await engine.orderCreation.createOrder(
        {
          customerId,
          storefrontId,
          deliveryAddressId,
          items,
          tip,
          promoCode: promoCode || undefined,
          specialInstructions,
        },
        actor
      );

      if (!orderResult.success) {
        // Thrown (not returned) so the catch below marks the idempotency row
        // 'failed' — otherwise it stays 'processing' and retries 409 forever.
        throw new CheckoutFailure(
          orderResult.error!.code,
          orderResult.error!.message,
          400
        );
      }

      const order = orderResult.data!;
      createdOrderId = order.id;

      // Persist the canonical checkout quote snapshot on the order record.
      const orderUpdate: Record<string, unknown> = {
        subtotal: serverQuote.subtotal,
        delivery_fee: serverQuote.deliveryFee,
        service_fee: serverQuote.serviceFee,
        tax: serverQuote.tax,
        tip: serverQuote.tip,
        total: serverQuote.total,
        updated_at: new Date().toISOString(),
      };
      // Attribute partner-originated orders + carry the test flag (columns added
      // in migration 00050; cast since generated types may not include them yet).
      if (partnerId) (orderUpdate as Record<string, unknown>).partner_id = partnerId;
      if (isTest) (orderUpdate as Record<string, unknown>).is_test = true;
      if (resolvedScheduledFor) {
        // scheduled_for column may not exist in generated types yet — use cast
        (orderUpdate as Record<string, unknown>).scheduled_for = resolvedScheduledFor;
        orderUpdate.status = 'scheduled';
      }

      const { error: syncTotalError } = await (adminClient as any)
        .from('orders')
        .update(orderUpdate)
        .eq('id', order.id);

      if (syncTotalError) {
        // Thrown so the catch below cancels the just-created order (otherwise
        // orphaned) and marks the idempotency row 'failed'.
        throw new CheckoutFailure('INTERNAL_ERROR', 'Failed to sync order record', 500);
      }

      // NOTE: Delivery record is created by dispatch engine when chef marks order ready
      // This ensures delivery is only created for orders that proceed past payment
      // Test-flagged orders transact against Stripe TEST mode on this same
      // deployment, so partners can run the 4242 card end to end without a
      // separate host. Live traffic is untouched.
      const stripe = getStripeClient({ testMode: isTest });
      const totalCents = Math.round(serverQuote.total * 100);

      // Resolve Stripe customer for saved payment method support
      const customerRecord = await (adminClient as any)
        .from('customers')
        .select('email, first_name, last_name')
        .eq('id', customerId)
        .maybeSingle();
      // Stripe customers are per-mode: a live customer id attached to a test
      // PaymentIntent fails with `resource_missing`.
      const stripeCustomerId = await getOrCreateStripeCustomer({
        ridendineCustomerId: customerId,
        email: customerRecord.data?.email ?? '',
        name:
          `${customerRecord.data?.first_name ?? ''} ${customerRecord.data?.last_name ?? ''}`.trim() ||
          undefined,
        testMode: isTest,
      }).catch(() => null);

      const piParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
        amount: totalCents,
        currency: 'cad',
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          customer_id: customerId,
          storefront_id: storefrontId,
          cart_id: cart.id,
          order_total_cents: String(totalCents),
          ...(promoCodeId && { promo_code_id: promoCodeId }),
          ...(partnerId && { partner_id: partnerId }),
          ...(isTest && { is_test: 'true' }),
        },
      };
      if (stripeCustomerId) piParams.customer = stripeCustomerId;
      if (savedPaymentMethodId) {
        piParams.payment_method = savedPaymentMethodId;
        piParams.confirm = true;
      } else {
        piParams.automatic_payment_methods = { enabled: true };
        if (saveCard && stripeCustomerId) {
          piParams.setup_future_usage = 'off_session';
        }
      }

      const paymentIntent = await stripe.paymentIntents.create(piParams, {
        idempotencyKey: `checkout:${customerId}:${idempotencyKey}`,
      });

      const responsePayload: CheckoutResponsePayload = {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        orderNumber: order.order_number,
        total: serverQuote.total,
        ...(isTest && {
          testMode: true,
          publishableKey: getStripePublishableKey({ testMode: true }),
        }),
        breakdown: {
          subtotal: serverQuote.subtotal,
          deliveryFee: serverQuote.deliveryFee,
          serviceFee: serverQuote.serviceFee,
          tax: serverQuote.tax,
          tip: serverQuote.tip,
          discount: serverQuote.discount,
          ...(deliveryDistanceKm !== null && {
            deliveryDistanceKm: Math.round(deliveryDistanceKm * 10) / 10,
          }),
          surgeMultiplier: deliverySurgeMultiplier,
          surgeActive: deliverySurgeMultiplier > 1.0,
        },
      };

      await (adminClient as any)
        .from('checkout_idempotency_keys')
        .update({
          status: 'completed',
          order_id: order.id,
          payment_intent_id: paymentIntent.id,
          response_payload: responsePayload,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', idemRecord.row.id);

      return successResponse(responsePayload);
    } catch (checkoutError) {
      // Single cleanup path for EVERY failure after the idempotency claim:
      // cancel any created order, then mark the row 'failed' so the customer's
      // retry is not stuck behind a permanent 'processing' 409.
      if (createdOrderId) {
        try {
          await engine.orders.cancelOrder({
            orderId: createdOrderId,
            actorId: actor.userId,
            actorType: actor.role,
            actorRole: actor.role,
            reason: 'payment_failed',
            notes:
              checkoutError instanceof CheckoutFailure
                ? `Checkout failed after order creation: ${checkoutError.code}`
                : 'Checkout payment initialization failed',
            actor,
          });
        } catch (cancelError) {
          // Never let order-cancel cleanup prevent releasing the idempotency row.
          console.error('Checkout cleanup: failed to cancel orphan order', cancelError);
        }
      }
      await markIdempotencyRecordFailed(
        adminClient,
        idemRecord.row.id,
        checkoutError instanceof Error ? checkoutError.message : 'payment_failed'
      );

      if (checkoutError instanceof CheckoutFailure) {
        return errorResponse(checkoutError.code, checkoutError.publicMessage, checkoutError.status);
      }
      return errorResponse('PAYMENT_FAILED', 'Unable to initialize payment for checkout', 500);
    }
  } catch (error) {
    console.error('Checkout error:', error);
    const isConfigError =
      error instanceof Error &&
      (error.message.includes('STRIPE_SECRET_KEY') || error.message.includes('Unsafe Stripe key'));
    if (isConfigError) {
      return errorResponse('PAYMENT_CONFIG_ERROR', 'Payment provider is misconfigured', 500);
    }
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
