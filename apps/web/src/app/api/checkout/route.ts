// ==========================================
// WEB CHECKOUT API
// Powered by Central Engine
// ==========================================

import { createAdminClient, getCartWithItems, clearCart, type SupabaseClient } from '@ridendine/db';
import {
  getStripeClient,
  evaluateCheckoutRisk,
  assertStripeConfigured,
  BASE_DELIVERY_FEE,
  SERVICE_FEE_PERCENT,
  HST_RATE,
} from '@ridendine/engine';
import { checkoutSchema } from '@ridendine/validation';
import {
  getEngine,
  getCustomerActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { createHash } from 'crypto';

interface PromoCodeRow {
  id: string;
  code: string;
  is_active: boolean;
  // Schema columns (canonical)
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  // Alias columns added by migration 00010 (kept for backwards compat)
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  times_used: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

interface MenuItemRow {
  id: string;
  storefront_id: string;
  price: number;
  is_available: boolean;
  is_sold_out: boolean;
}

interface CheckoutRequestInput {
  storefrontId: string;
  deliveryAddressId: string;
  tip: number;
  promoCode?: string;
  specialInstructions?: string;
  clientSubtotal?: number;
  clientDeliveryFee?: number;
  clientServiceFee?: number;
  clientTax?: number;
  clientTotal?: number;
}

interface CheckoutResponsePayload {
  clientSecret: string | null;
  orderId: string;
  orderNumber: string;
  total: number;
  breakdown: {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    tax: number;
    tip: number;
    discount: number;
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
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

function computeServerQuote(subtotal: number, tip: number, promoDiscount: number) {
  const deliveryFee = BASE_DELIVERY_FEE / 100;
  const serviceFee = roundMoney(subtotal * (SERVICE_FEE_PERCENT / 100));
  const tax = roundMoney((subtotal + deliveryFee + serviceFee) * (HST_RATE / 100));
  const preDiscountTotal = subtotal + deliveryFee + serviceFee + tax + tip;
  const total = roundMoney(Math.max(preDiscountTotal - promoDiscount, 0));

  return {
    subtotal: roundMoney(subtotal),
    deliveryFee,
    serviceFee,
    tax,
    tip: roundMoney(tip),
    discount: roundMoney(promoDiscount),
    total,
  };
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
    .select('id, request_hash, status, response_payload, order_id, payment_intent_id')
    .eq('customer_id', params.customerId)
    .eq('idempotency_key', params.idempotencyKey)
    .maybeSingle();

  const existing = existingResult.data;
  if (existing) {
    return { row: existing, created: false };
  }

  const insertResult = await idemClient
    .from('checkout_idempotency_keys')
    .insert({
      customer_id: params.customerId,
      idempotency_key: params.idempotencyKey,
      request_hash: params.requestHash,
      status: 'processing',
    })
    .select('id, request_hash, status, response_payload, order_id, payment_intent_id')
    .single();

  if (insertResult.error?.code === '23505') {
    const retryResult = await idemClient
      .from('checkout_idempotency_keys')
      .select('id, request_hash, status, response_payload, order_id, payment_intent_id')
      .eq('customer_id', params.customerId)
      .eq('idempotency_key', params.idempotencyKey)
      .maybeSingle();
    return { row: retryResult.data, created: false };
  }

  if (insertResult.error) {
    throw insertResult.error;
  }

  return { row: insertResult.data, created: true };
}

export async function POST(request: Request): Promise<Response> {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.checkout,
    namespace: 'web-checkout',
    routeKey: 'POST:/api/checkout',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const customerContext = await getCustomerActorContext();
    if (!customerContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const validationResult = checkoutSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse('VALIDATION_ERROR', validationResult.error.issues[0]?.message || 'Invalid request body', 400);
    }
    const {
      storefrontId,
      deliveryAddressId,
      tip = 0,
      promoCode,
      specialInstructions,
      clientSubtotal,
      clientDeliveryFee,
      clientServiceFee,
      clientTax,
      clientTotal,
    } = validationResult.data as CheckoutRequestInput;

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const engine = getEngine();

    // Get cart with items
    const cart = await getCartWithItems(adminClient, customerContext.customerId, storefrontId);

    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
      return errorResponse('EMPTY_CART', 'Cart is empty');
    }

    const menuItemIds = Array.from(
      new Set(
        (cart.cart_items as Array<{ menu_item_id: string }>).map((item) => item.menu_item_id)
      )
    );

    const { data: menuItems, error: menuItemsError } = await adminClient
      .from('menu_items')
      .select('id, storefront_id, price, is_available, is_sold_out')
      .in('id', menuItemIds);

    if (menuItemsError || !menuItems) {
      return errorResponse('VALIDATION_ERROR', 'Unable to verify menu items', 400);
    }

    const menuById = new Map<string, MenuItemRow>(
      (menuItems as MenuItemRow[]).map((item) => [item.id, item])
    );

    let authoritativeSubtotal = 0;
    for (const cartItem of cart.cart_items as Array<{
      menu_item_id: string;
      quantity: number;
      unit_price: number;
    }>) {
      const menu = menuById.get(cartItem.menu_item_id);
      if (!menu) {
        return errorResponse('VALIDATION_ERROR', 'Cart contains stale items. Please refresh cart.', 400);
      }
      if (menu.storefront_id !== storefrontId) {
        return errorResponse('VALIDATION_ERROR', 'Cart contains items from a different storefront.', 400);
      }
      if (!menu.is_available || menu.is_sold_out) {
        return errorResponse('VALIDATION_ERROR', 'Cart contains unavailable items. Please refresh cart.', 400);
      }
      if (roundMoney(menu.price) !== roundMoney(cartItem.unit_price)) {
        return errorResponse('VALIDATION_ERROR', 'Cart pricing is stale. Please refresh cart.', 400);
      }
      authoritativeSubtotal += menu.price * cartItem.quantity;
    }

    const serverQuoteNoPromo = computeServerQuote(authoritativeSubtotal, Number(tip || 0), 0);
    const clientSuppliedAnyTotals =
      clientSubtotal !== undefined ||
      clientDeliveryFee !== undefined ||
      clientServiceFee !== undefined ||
      clientTax !== undefined ||
      clientTotal !== undefined;
    if (clientSuppliedAnyTotals) {
      const totalsMatch =
        (clientSubtotal === undefined || roundMoney(clientSubtotal) === roundMoney(serverQuoteNoPromo.subtotal)) &&
        (clientDeliveryFee === undefined || roundMoney(clientDeliveryFee) === roundMoney(serverQuoteNoPromo.deliveryFee)) &&
        (clientServiceFee === undefined || roundMoney(clientServiceFee) === roundMoney(serverQuoteNoPromo.serviceFee)) &&
        (clientTax === undefined || roundMoney(clientTax) === roundMoney(serverQuoteNoPromo.tax)) &&
        (clientTotal === undefined || roundMoney(clientTotal) === roundMoney(serverQuoteNoPromo.total));

      if (!totalsMatch) {
        return errorResponse('VALIDATION_ERROR', 'Client totals mismatch server quote', 400);
      }
    }

    const subtotalCents = Math.round(
      authoritativeSubtotal * 100
    );
    const tipCents = Math.round(Number(tip || 0) * 100);
    const risk = evaluateCheckoutRisk({
      customerId: customerContext.customerId,
      cartId: cart.id,
      amountCents: subtotalCents + tipCents,
      currency: 'cad',
    });
    if (!risk.allowed) {
      await engine.audit.log({
        action: 'override',
        entityType: 'checkout',
        entityId: cart.id,
        actor: customerContext.actor,
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

    const menuIds = (cart.cart_items as { menu_item_id: string }[]).map((ci) => ci.menu_item_id);
    const readiness = await engine.kitchen.validateCustomerCheckoutReadiness(
      storefrontId,
      menuIds
    );
    if (!readiness.ok) {
      return errorResponse(readiness.code, readiness.message, 400);
    }

    // Validate promo code if provided
    let promoDiscount = 0;
    let promoCodeId: string | null = null;
    if (promoCode) {
      const { data: promo } = await adminClient
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      const typedPromo = promo as PromoCodeRow | null;

      if (typedPromo) {
        // Check validity — use canonical schema columns with alias fallback
        const now = new Date();
        const activeFrom = typedPromo.starts_at ?? typedPromo.valid_from;
        const activeUntil = typedPromo.expires_at ?? typedPromo.valid_until;
        const maxUses = typedPromo.usage_limit ?? typedPromo.max_uses;
        const usedCount = typedPromo.usage_count ?? typedPromo.times_used;
        if (activeFrom && new Date(activeFrom) > now) {
          return errorResponse('PROMO_NOT_ACTIVE', 'Promo code is not yet active');
        }
        if (activeUntil && new Date(activeUntil) < now) {
          return errorResponse('PROMO_EXPIRED', 'Promo code has expired');
        }
        if (maxUses && usedCount >= maxUses) {
          return errorResponse('PROMO_EXHAUSTED', 'Promo code has reached maximum uses');
        }

        promoCodeId = typedPromo.id;
        if (typedPromo.discount_type === 'percentage') {
          promoDiscount = roundMoney(authoritativeSubtotal * (typedPromo.discount_value / 100));
        } else {
          promoDiscount = roundMoney(typedPromo.discount_value);
        }
      } else {
        return errorResponse('INVALID_PROMO', 'Invalid or inactive promo code');
      }
    }

    const serverQuote = computeServerQuote(authoritativeSubtotal, Number(tip || 0), promoDiscount);
    const idempotencyKey = deriveIdempotencyKey(request, customerContext.customerId, cart.id, {
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
      customerId: customerContext.customerId,
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
      return errorResponse('IDEMPOTENCY_CONFLICT', 'Checkout request already in progress', 409);
    }

    assertStripeConfigured();

    // Transform cart items to engine input format
    const items = cart.cart_items.map((item: {
      menu_item_id: string;
      quantity: number;
      special_instructions?: string;
      selected_options?: Array<{ optionId: string; valueId: string; priceAdjustment: number }>;
    }) => ({
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      specialInstructions: item.special_instructions,
      modifiers: item.selected_options || [],
    }));

    let createdOrderId: string | null = null;
    try {
      // Create order via engine
      const orderResult = await engine.orderCreation.createOrder(
        {
          customerId: customerContext.customerId,
          storefrontId,
          deliveryAddressId,
          items,
          tip,
          promoCode: promoCode || undefined,
          specialInstructions,
        },
        customerContext.actor
      );

      if (!orderResult.success) {
        return errorResponse(orderResult.error!.code, orderResult.error!.message);
      }

      const order = orderResult.data!;
      createdOrderId = order.id;

      // Persist promo-adjusted total in order record to keep payment/order reconciliation consistent.
      if (serverQuote.total !== roundMoney(order.total)) {
        const { error: syncTotalError } = await adminClient
          .from('orders')
          .update({
            total: serverQuote.total,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (syncTotalError) {
          return errorResponse('INTERNAL_ERROR', 'Failed to sync order totals', 500);
        }
      }

      // NOTE: Delivery record is created by dispatch engine when chef marks order ready
      // This ensures delivery is only created for orders that proceed past payment
      const stripe = getStripeClient();
      const totalCents = Math.round(serverQuote.total * 100);
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: totalCents,
          currency: 'cad',
          automatic_payment_methods: { enabled: true },
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            customer_id: customerContext.customerId,
            storefront_id: storefrontId,
            ...(promoCodeId && { promo_code_id: promoCodeId }),
          },
        },
        {
          idempotencyKey: `checkout:${customerContext.customerId}:${idempotencyKey}`,
        }
      );

      // Authorize payment via engine
      const authResult = await engine.orderCreation.authorizePayment(
        order.id,
        paymentIntent.id,
        customerContext.actor
      );
      if (!authResult.success) {
        return errorResponse('PAYMENT_FAILED', authResult.error?.message || 'Failed to authorize payment', 500);
      }

      // Update promo code usage if applicable
      if (promoCodeId) {
        await adminClient.rpc('increment_promo_usage', { promo_id: promoCodeId });
      }

      // Clear the cart
      await clearCart(adminClient, cart.id);

      const responsePayload: CheckoutResponsePayload = {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        orderNumber: order.order_number,
        total: serverQuote.total,
        breakdown: {
          subtotal: serverQuote.subtotal,
          deliveryFee: serverQuote.deliveryFee,
          serviceFee: serverQuote.serviceFee,
          tax: serverQuote.tax,
          tip: serverQuote.tip,
          discount: serverQuote.discount,
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
    } catch (paymentError) {
      if (createdOrderId) {
        await engine.orders.cancelOrder({
          orderId: createdOrderId,
          actorId: customerContext.actor.userId,
          actorType: customerContext.actor.role,
          actorRole: customerContext.actor.role,
          reason: 'payment_failed',
          notes: 'Checkout payment initialization failed',
          actor: customerContext.actor,
        });
      }
      await (adminClient as any)
        .from('checkout_idempotency_keys')
        .update({
          status: 'failed',
          last_error: paymentError instanceof Error ? paymentError.message.slice(0, 500) : 'payment_failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', idemRecord.row.id);

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
