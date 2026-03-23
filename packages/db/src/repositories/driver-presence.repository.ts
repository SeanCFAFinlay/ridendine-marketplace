import type { SupabaseClient } from '../client/types';

export interface DriverPresence {
  id: string;
  driver_id: string;
  status: 'offline' | 'online' | 'busy';
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  current_shift_id: string | null;
  updated_at: string;
}

export async function getDriverPresence(
  client: SupabaseClient,
  driverId: string
): Promise<DriverPresence | null> {
  const { data, error } = await client
    .from('driver_presence')
    .select('*')
    .eq('driver_id', driverId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as DriverPresence;
}

export async function updateDriverStatus(
  client: SupabaseClient,
  driverId: string,
  status: 'offline' | 'online' | 'busy'
): Promise<DriverPresence> {
  const { data, error } = await client
    .from('driver_presence')
    .upsert({
      driver_id: driverId,
      status,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as DriverPresence;
}

export async function updateDriverLocation(
  client: SupabaseClient,
  driverId: string,
  lat: number,
  lng: number
): Promise<DriverPresence> {
  const { data, error } = await client
    .from('driver_presence')
    .update({
      current_lat: lat,
      current_lng: lng,
      last_location_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('driver_id', driverId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverPresence;
}
