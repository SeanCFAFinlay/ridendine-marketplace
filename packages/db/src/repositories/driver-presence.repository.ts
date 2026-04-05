import type { SupabaseClient } from '../client/types';

// REPAIRED: Includes all field aliases after 00010_contract_drift_repair migration
export interface DriverPresence {
  id: string;
  driver_id: string;
  status: 'offline' | 'online' | 'busy';
  current_lat: number | null;
  current_lng: number | null;
  // Alias fields added in 00010 migration (kept in sync by trigger)
  last_location_lat: number | null;
  last_location_lng: number | null;
  last_location_update: string | null; // canonical field name in original schema
  last_location_at: string | null;     // alias used by some code paths
  last_updated_at: string | null;      // alias used by generated types
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
    }, { onConflict: 'driver_id' })
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
  // Write both canonical and alias field names so all consumers work correctly
  const timestamp = new Date().toISOString();
  const { data, error } = await client
    .from('driver_presence')
    .update({
      current_lat: lat,
      current_lng: lng,
      last_location_lat: lat,
      last_location_lng: lng,
      last_location_update: timestamp,
      last_location_at: timestamp,
      last_updated_at: timestamp,
      updated_at: timestamp,
    })
    .eq('driver_id', driverId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverPresence;
}

export async function upsertDriverPresence(
  client: SupabaseClient,
  driverId: string,
  updates: Partial<DriverPresence>
): Promise<DriverPresence> {
  const { data, error } = await client
    .from('driver_presence')
    .upsert(
      { driver_id: driverId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'driver_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as DriverPresence;
}
