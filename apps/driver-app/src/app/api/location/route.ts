import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerClient,
  getDriverByUserId,
  updateDriverLocation,
  createDeliveryTrackingEvent,
  getDeliveryById,
  type SupabaseClient,
} from '@ridendine/db';
import { locationUpdateSchema } from '@ridendine/validation';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_MS = 5000;
const locationUpdateTimestamps = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore) as unknown as SupabaseClient;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const driver = await getDriverByUserId(supabase, user.id);

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    const lastUpdate = locationUpdateTimestamps.get(driver.id);
    const now = Date.now();
    if (lastUpdate && now - lastUpdate < RATE_LIMIT_MS) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending another update.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validationResult = locationUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { lat, lng, accuracy, heading, speed, deliveryId } = validationResult.data;

    await updateDriverLocation(supabase, driver.id, lat, lng);

    await (supabase as any).from('driver_locations').insert({
      driver_id: driver.id,
      lat,
      lng,
      recorded_at: new Date().toISOString(),
    });

    if (deliveryId) {
      const delivery = await getDeliveryById(supabase, deliveryId);
      if (delivery && delivery.driver_id === driver.id) {
        await createDeliveryTrackingEvent(supabase, {
          delivery_id: deliveryId,
          driver_id: driver.id,
          lat,
          lng,
          accuracy,
        });
      }
    }

    locationUpdateTimestamps.set(driver.id, now);

    return NextResponse.json({
      success: true,
      data: {
        lat,
        lng,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
