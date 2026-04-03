// ==========================================
// WEB CHECKOUT API
// Powered by Central Engine
// ==========================================

import Stripe from 'stripe';
import { createAdminClient, getCartWithItems, clearCart, type SupabaseClient } from '@ridendine/db';
import {
  getEngine,
  getCustomerActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
  });
}

interface PromoCodeRow {
  id: string;
  code: string;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  times_used: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const customerContext = await getCustomerActorContext();
    if (!customerContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const { storefrontId, deliveryAddressId, tip = 0, promoCode, specialInstructions } = body;

    if (!storefrontId || !deliveryAddressId) {
      return errorResponse('MISSING_FIELDS', 'storefrontId and deliveryAddressId are required');
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;

    // Get cart with items
    const cart = await getCartWithItems(adminClient, customerContext.customerId, storefrontId);

    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
      return errorResponse('EMPTY_CART', 'Cart is empty');
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
        // Check validity
        const now = new Date();
        if (typedPromo.valid_from && new Date(typedPromo.valid_from) > now) {
          return errorResponse('PROMO_NOT_ACTIVE', 'Promo code is not yet active');
        }
        if (typedPromo.valid_until && new Date(typedPromo.valid_until) < now) {
          return errorResponse('PROMO_EXPIRED', 'Promo code has expired');
        }
        if (typedPromo.max_uses && typedPromo.times_used >= typedPromo.max_uses) {
          return errorResponse('PROMO_EXHAUSTED', 'Promo code has reached maximum uses');
        }

        promoCodeId = typedPromo.id;
        if (typedPromo.discount_type === 'percentage') {
          const subtotal = cart.cart_items.reduce(
            (sum: number, item: { unit_price: number; quantity: number }) =>
              sum + item.unit_price * item.quantity,
            0
          );
          promoDiscount = Math.round(subtotal * (typedPromo.discount_value / 100));
        } else {
          promoDiscount = typedPromo.discount_value;
        }
      } else {
        return errorResponse('INVALID_PROMO', 'Invalid or inactive promo code');
      }
    }

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

    const engine = getEngine();

    // Create order via engine
    const orderResult = await engine.orders.createOrder(
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

    // NOTE: Delivery record is created by dispatch engine when chef marks order ready
    // This ensures delivery is only created for orders that proceed past payment

    // Create Stripe PaymentIntent
    const stripe = getStripe();
    const totalCents = Math.round(order.total * 100);
    const discountedTotal = Math.max(totalCents - promoDiscount, 0);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: discountedTotal,
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        customer_id: customerContext.customerId,
        storefront_id: storefrontId,
        ...(promoCodeId && { promo_code_id: promoCodeId }),
      },
    });

    // Authorize payment via engine
    await engine.orders.authorizePayment(order.id, paymentIntent.id, customerContext.actor);

    // Update promo code usage if applicable
    if (promoCodeId) {
      await adminClient.rpc('increment_promo_usage', { promo_id: promoCodeId });
    }

    // Clear the cart
    await clearCart(adminClient, cart.id);

    return successResponse({
      clientSecret: paymentIntent.client_secret,
      orderId: order.id,
      orderNumber: order.order_number,
      total: discountedTotal / 100,
      breakdown: {
        subtotal: order.subtotal,
        deliveryFee: order.delivery_fee,
        serviceFee: order.service_fee,
        tax: order.tax,
        tip: order.tip,
        discount: promoDiscount / 100,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
