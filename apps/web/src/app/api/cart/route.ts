import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerClient,
  getCartByCustomer,
  getCartWithItems,
  createCart,
  addCartItem,
  updateCartItem,
  deleteCartItem,
} from '@ridendine/db';
import { addToCartSchema, updateCartItemSchema } from '@ridendine/validation';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';
import { getEngine } from '@/lib/engine';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const { searchParams } = new URL(request.url);
    const storefrontId = searchParams.get('storefrontId');

    if (!storefrontId) {
      return NextResponse.json(
        { error: 'storefrontId is required' },
        { status: 400 }
      );
    }

    const cart = await getCartWithItems(
      supabase,
      customer.id,
      storefrontId
    );

    return NextResponse.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const validated = addToCartSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    let cart = await getCartByCustomer(
      supabase,
      customer.id,
      validated.storefrontId
    );

    if (!cart) {
      cart = await createCart(supabase, {
        customer_id: customer.id,
        storefront_id: validated.storefrontId,
      });
    }

    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', validated.menuItemId)
      .single();

    if (!menuItem) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    if (menuItem.storefront_id !== validated.storefrontId) {
      return NextResponse.json(
        { error: 'Item does not belong to this storefront' },
        { status: 400 }
      );
    }

    const engine = getEngine();
    const ready = await engine.kitchen.validateCustomerCheckoutReadiness(
      validated.storefrontId,
      [validated.menuItemId]
    );
    if (!ready.ok) {
      return NextResponse.json({ error: ready.message }, { status: 400 });
    }

    const cartItem = await addCartItem(supabase, {
      cart_id: cart.id,
      menu_item_id: validated.menuItemId,
      quantity: validated.quantity,
      unit_price: menuItem.price,
      special_instructions: validated.specialInstructions || null,
      selected_options: validated.selectedOptions || [],
    });

    return NextResponse.json({
      success: true,
      data: cartItem,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const validated = updateCartItemSchema.parse(body);
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);
    const { data: existingCartItem } = await supabase
      .from('cart_items')
      .select('id, carts!inner(customer_id)')
      .eq('id', itemId)
      .eq('carts.customer_id', customer.id)
      .maybeSingle();

    if (!existingCartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    const updates: any = {};
    if (validated.quantity !== undefined) {
      updates.quantity = validated.quantity;
    }
    if (validated.specialInstructions !== undefined) {
      updates.special_instructions = validated.specialInstructions;
    }
    if (validated.selectedOptions !== undefined) {
      updates.selected_options = validated.selectedOptions;
    }

    const updatedItem = await updateCartItem(supabase, itemId, updates);

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);
    const { data: existingCartItem } = await supabase
      .from('cart_items')
      .select('id, carts!inner(customer_id)')
      .eq('id', itemId)
      .eq('carts.customer_id', customer.id)
      .maybeSingle();

    if (!existingCartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      );
    }

    await deleteCartItem(supabase, itemId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
