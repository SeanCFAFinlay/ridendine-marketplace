import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerClient,
  getAddressesByCustomer,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '@ridendine/db';
import {
  createCustomerAddressSchema,
  updateCustomerAddressSchema,
} from '@ridendine/validation';
import { getCurrentCustomer, handleApiError } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const addresses = await getAddressesByCustomer(supabase, customer.id);

    return NextResponse.json({
      success: true,
      data: addresses,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validated = createCustomerAddressSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const address = await createAddress(supabase, {
      customer_id: customer.id,
      label: validated.label,
      street_address: validated.addressLine1,
      city: validated.city,
      state: validated.state,
      postal_code: validated.postalCode,
      country: validated.country || 'US',
      lat: validated.lat || null,
      lng: validated.lng || null,
      delivery_instructions: validated.deliveryInstructions || null,
      is_default: validated.isDefault || false,
    });

    if (validated.isDefault) {
      await setDefaultAddress(supabase, customer.id, address.id);
    }

    return NextResponse.json({
      success: true,
      data: address,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const validated = updateCustomerAddressSchema.parse(body);
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address id is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const customer = await getCurrentCustomer(supabase);

    const updates: any = {};
    if (validated.label !== undefined) {
      updates.label = validated.label;
    }
    if (validated.addressLine1 !== undefined) {
      updates.street_address = validated.addressLine1;
    }
    if (validated.city !== undefined) {
      updates.city = validated.city;
    }
    if (validated.state !== undefined) {
      updates.state = validated.state;
    }
    if (validated.postalCode !== undefined) {
      updates.postal_code = validated.postalCode;
    }
    if (validated.country !== undefined) {
      updates.country = validated.country;
    }
    if (validated.lat !== undefined) {
      updates.lat = validated.lat;
    }
    if (validated.lng !== undefined) {
      updates.lng = validated.lng;
    }
    if (validated.deliveryInstructions !== undefined) {
      updates.delivery_instructions = validated.deliveryInstructions;
    }
    if (validated.isDefault !== undefined) {
      updates.is_default = validated.isDefault;
    }

    const updatedAddress = await updateAddress(supabase, addressId, updates);

    if (validated.isDefault) {
      await setDefaultAddress(supabase, customer.id, addressId);
    }

    return NextResponse.json({
      success: true,
      data: updatedAddress,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address id is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    await getCurrentCustomer(supabase);

    await deleteAddress(supabase, addressId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
