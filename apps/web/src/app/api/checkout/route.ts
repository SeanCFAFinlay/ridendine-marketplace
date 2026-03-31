// ==========================================
// WEB CHECKOUT API
// Powered by Central Engine
// ==========================================

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient, getCartWithItems, clearCart } from '@ridendine/db';
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

    const adminClient = createAdminClient();

    // Get cart with items
    const cart = await getCartWithItems(adminClient as any, customerContext.customerId, storefrontId);

    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
      return errorResponse('EMPTY_CART', 'Cart is empty');
    }

    // Validate promo code if provided
    let promoDiscount = 0;
    let promoCodeId: string | null = null;
    if (promoCode) {
      const { data: promo } = await (adminClient as any)
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (promo) {
        // Check validity
        const now = new Date();
        if (promo.valid_from && new Date(promo.valid_from) > now) {
          return errorResponse('PROMO_NOT_ACTIVE', 'Promo code is not yet active');
        }
        if (promo.valid_until && new Date(promo.valid_until) < now) {
          return errorResponse('PROMO_EXPIRED', 'Promo code has expired');
        }
        if (promo.max_uses && promo.times_used >= promo.max_uses) {
          return errorResponse('PROMO_EXHAUSTED', 'Promo code has reached maximum uses');
        }

        promoCodeId = promo.id;
        if (promo.discount_type === 'percentage') {
          const subtotal = cart.cart_items.reduce(
            (sum: number, item: { unit_price: number; quantity: number }) =>
              sum + item.unit_price * item.quantity,
            0
          );
          promoDiscount = Math.round(subtotal * (promo.discount_value / 100));
        } else {
          promoDiscount = promo.discount_value;
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

    // Create delivery record
    const { data: storefront } = await adminClient
      .from('chef_storefronts')
      .select(`
        name,
        kitchen:chef_kitchens (address, lat, lng)
      `)
      .eq('id', storefrontId)
      .single();

    const { data: deliveryAddress } = await adminClient
      .from('customer_addresses')
      .select('address_line1, address_line2, city, state, postal_code, lat, lng')
      .eq('id', deliveryAddressId)
      .single();

    const kitchen = storefront?.kitchen as { address?: string; lat?: number; lng?: number } | null;
    const pickupAddr = kitchen?.address || 'Pickup address';
    const dropoffAddr = deliveryAddress
      ? `${deliveryAddress.address_line1}${deliveryAddress.address_line2 ? ', ' + deliveryAddress.address_line2 : ''}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postal_code}`
      : 'Delivery address';

    await adminClient.from('deliveries').insert({
      order_id: order.id,
      status: 'pending',
      driver_id: null,
      pickup_address: pickupAddr,
      pickup_lat: kitchen?.lat || null,
      pickup_lng: kitchen?.lng || null,
      dropoff_address: dropoffAddr,
      dropoff_lat: deliveryAddress?.lat || null,
      dropoff_lng: deliveryAddress?.lng || null,
      estimated_pickup_at: null,
      actual_pickup_at: null,
      estimated_dropoff_at: null,
      actual_dropoff_at: null,
      estimated_distance_km: null,
      delivery_fee: order.delivery_fee,
      driver_payout: Math.round(order.delivery_fee * 0.8 * 100) / 100,
    });

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
      await (adminClient as any).rpc('increment_promo_usage', { promo_id: promoCodeId });
    }

    // Clear the cart
    await clearCart(adminClient as any, customerContext.customerId);

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
