import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerClient,
  getOrdersByCustomer,
  createOrder,
  createOrderItems,
  getCartWithItems,
  clearCart,
  createDelivery,
} from '@ridendine/db';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';
import {
  generateOrderNumber,
  calculateOrderTotals,
  calculateCartSubtotal,
} from '@/lib/order-helpers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const orders = await getOrdersByCustomer(supabase, customer.id);

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storefrontId, deliveryAddressId, tip = 0 } = body;

    if (!storefrontId || !deliveryAddressId) {
      return NextResponse.json(
        { error: 'storefrontId and deliveryAddressId are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const cart = await getCartWithItems(
      supabase,
      customer.id,
      storefrontId
    );

    if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    const subtotal = calculateCartSubtotal(cart.cart_items);

    const { deliveryFee, serviceFee, tax, total } = calculateOrderTotals(
      subtotal,
      tip
    );

    const orderNumber = generateOrderNumber();

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
      tip,
      total,
      payment_status: 'pending',
      payment_intent_id: null,
      special_instructions: body.specialInstructions || null,
      estimated_ready_at: null,
      actual_ready_at: null,
    });

    const orderItems = cart.cart_items.map((item: any) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      special_instructions: item.special_instructions,
      selected_options: item.selected_options,
    }));

    await createOrderItems(supabase, orderItems);

    await clearCart(supabase, cart.id);

    // Get storefront address for pickup
    const { data: storefront } = await supabase
      .from('chef_storefronts')
      .select('address')
      .eq('id', storefrontId)
      .single();

    // Get delivery address
    const { data: deliveryAddress } = await supabase
      .from('customer_addresses')
      .select('street_address, city, state, postal_code')
      .eq('id', deliveryAddressId)
      .single();

    const pickupAddr = storefront?.address || 'Pickup address';
    const dropoffAddr = deliveryAddress
      ? `${deliveryAddress.street_address}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postal_code}`
      : 'Delivery address';

    const delivery = await createDelivery(supabase, {
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

    return NextResponse.json({
      success: true,
      data: {
        order,
        delivery,
      },
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
