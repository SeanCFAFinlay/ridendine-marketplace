import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Stripe from 'stripe';
import { createServerClient, getCartWithItems, createOrder, createOrderItems, clearCart, createDelivery, validatePromoCode } from '@ridendine/db';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';
import { generateOrderNumber } from '@/lib/order-helpers';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
  });
}

// Platform fee constants
const PLATFORM_FEE_PERCENT = 15;
const SERVICE_FEE_PERCENT = 8;
const HST_RATE = 13;
const DELIVERY_FEE = 399; // $3.99 in cents

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { storefrontId, deliveryAddressId, tip = 0, promoCode } = body;

    if (!storefrontId || !deliveryAddressId) {
      return NextResponse.json(
        { error: 'storefrontId and deliveryAddressId are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const customer = await getCurrentCustomer(supabase);

    // Get cart with items
    const cart = await getCartWithItems(supabase, customer.id, storefrontId);

    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Calculate subtotal
    const subtotal = cart.cart_items.reduce(
      (sum: number, item: any) => sum + item.unit_price * item.quantity,
      0
    );

    // Apply promo code discount
    let discount = 0;
    let promoCodeId: string | null = null;
    if (promoCode) {
      const validation = await validatePromoCode(supabase as any, promoCode, subtotal);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      discount = validation.discount ?? 0;
      promoCodeId = validation.promoId ?? null;
    }

    // Calculate fees
    const deliveryFee = DELIVERY_FEE;
    const serviceFee = Math.round(subtotal * (SERVICE_FEE_PERCENT / 100));
    const taxableAmount = subtotal + serviceFee;
    const tax = Math.round(taxableAmount * (HST_RATE / 100));
    const tipAmount = tip;
    const total = subtotal + deliveryFee + serviceFee + tax + tipAmount - discount;

    // Get storefront for pickup address
    const { data: storefront } = await supabase
      .from('chef_storefronts')
      .select('name, address')
      .eq('id', storefrontId)
      .single();

    // Get delivery address
    const { data: deliveryAddress } = await supabase
      .from('customer_addresses')
      .select('street_address, city, state, postal_code')
      .eq('id', deliveryAddressId)
      .single();

    const orderNumber = generateOrderNumber();

    // Create order with pending payment status
    const order = await createOrder(supabase, {
      order_number: orderNumber,
      customer_id: customer.id,
      storefront_id: storefrontId,
      delivery_address_id: deliveryAddressId,
      status: 'pending',
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tax,
      tip: tipAmount,
      total,
      payment_status: 'processing',
      payment_intent_id: null,
      special_instructions: body.specialInstructions || null,
      estimated_ready_at: null,
      actual_ready_at: null,
    });

    // Create order items
    const orderItems = cart.cart_items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      special_instructions: item.special_instructions,
      selected_options: item.selected_options || [],
    }));
    await createOrderItems(supabase, orderItems);

    // Create delivery record
    const pickupAddr = storefront?.address || 'Pickup address';
    const dropoffAddr = deliveryAddress
      ? `${deliveryAddress.street_address}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postal_code}`
      : 'Delivery address';

    await createDelivery(supabase, {
      order_id: order.id,
      status: 'pending',
      driver_id: null,
      pickup_address: pickupAddr,
      pickup_lat: null,
      pickup_lng: null,
      dropoff_address: dropoffAddr,
      dropoff_lat: null,
      dropoff_lng: null,
      estimated_pickup_at: null,
      actual_pickup_at: null,
      estimated_dropoff_at: null,
      actual_dropoff_at: null,
      distance_km: null,
      delivery_fee: deliveryFee,
      driver_payout: Math.round(deliveryFee * 0.8),
      pickup_photo_url: null,
      dropoff_photo_url: null,
      customer_signature_url: null,
      notes: null,
    });

    // Create Stripe PaymentIntent
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'cad',
      automatic_payment_methods: { enabled: true },
      metadata: {
        order_id: order.id,
        order_number: orderNumber,
        customer_id: customer.id,
        storefront_id: storefrontId,
        ...(promoCodeId && { promo_code_id: promoCodeId }),
      },
    });

    // Update order with payment intent ID
    await supabase
      .from('orders')
      .update({ payment_intent_id: paymentIntent.id })
      .eq('id', order.id);

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        orderNumber,
        total,
        breakdown: {
          subtotal,
          deliveryFee,
          serviceFee,
          tax,
          tip: tipAmount,
          discount,
        },
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
