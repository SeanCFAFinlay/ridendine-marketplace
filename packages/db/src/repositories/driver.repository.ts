import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Driver = Tables<'drivers'>;
export interface OpsDriverListItem extends Driver {
  driver_presence: {
    status: 'offline' | 'online' | 'busy';
    updated_at: string;
  } | null;
}

export interface OpsDriverDetail extends Driver {
  driver_presence: {
    status: string;
    last_location_lat: number | null;
    last_location_lng: number | null;
    last_updated_at: string;
  } | null;
  recent_deliveries: Array<{
    id: string;
    status: string;
    driver_payout: number | null;
    created_at: string;
    actual_dropoff_at: string | null;
    order: {
      id: string;
      order_number: string;
      total: number;
    } | null;
  }>;
  stats: {
    completedDeliveries: number;
    activeDeliveries: number;
    totalEarnings: number;
  };
}

type DriverStatsRow = {
  status: string;
  driver_payout: number | null;
};

export async function getDriverByUserId(
  client: SupabaseClient,
  userId: string
): Promise<Driver | null> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getDriverById(
  client: SupabaseClient,
  id: string
): Promise<Driver | null> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createDriver(
  client: SupabaseClient,
  driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>
): Promise<Driver> {
  const { data, error } = await client
    .from('drivers')
    .insert(driver)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDriver(
  client: SupabaseClient,
  id: string,
  updates: Partial<Driver>
): Promise<Driver> {
  const { data, error } = await client
    .from('drivers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getApprovedDrivers(
  client: SupabaseClient
): Promise<Driver[]> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('status', 'approved');

  if (error) throw error;
  return data;
}

export async function listOpsDrivers(
  client: SupabaseClient,
  options: { status?: string } = {}
): Promise<OpsDriverListItem[]> {
  let query = client
    .from('drivers')
    .select(`
      *,
      driver_presence (
        status,
        updated_at
      )
    `)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as unknown as OpsDriverListItem[];
}

export async function getOpsDriverDetail(
  client: SupabaseClient,
  driverId: string
): Promise<OpsDriverDetail | null> {
  const { data: driver, error } = await client
    .from('drivers')
    .select(`
      *,
      driver_presence (
        status,
        last_location_lat,
        last_location_lng,
        last_updated_at
      )
    `)
    .eq('id', driverId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const { data: recentDeliveries, error: recentDeliveriesError } = await client
    .from('deliveries')
    .select(`
      id,
      status,
      driver_payout,
      created_at,
      actual_dropoff_at,
      order:orders (
        id,
        order_number,
        total
      )
    `)
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentDeliveriesError) throw recentDeliveriesError;

  const { data: deliveryStats, error: deliveryStatsError } = await client
    .from('deliveries')
    .select('status, driver_payout')
    .eq('driver_id', driverId);

  if (deliveryStatsError) throw deliveryStatsError;

  const deliveries = (recentDeliveries ?? []) as unknown as OpsDriverDetail['recent_deliveries'];
  const statsRows = (deliveryStats ?? []) as DriverStatsRow[];

  return {
    ...(driver as unknown as Omit<OpsDriverDetail, 'recent_deliveries' | 'stats'>),
    recent_deliveries: deliveries,
    stats: {
      completedDeliveries: statsRows.filter(
        (row: DriverStatsRow) => row.status === 'delivered'
      ).length,
      activeDeliveries: statsRows.filter((row: DriverStatsRow) =>
        ['assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff'].includes(row.status)
      ).length,
      totalEarnings: statsRows.reduce(
        (sum: number, row: DriverStatsRow) =>
          sum + (row.status === 'delivered' ? row.driver_payout ?? 0 : 0),
        0
      ),
    },
  };
}

export async function getPendingDriverApprovals(
  client: SupabaseClient
): Promise<Driver[]> {
  const { data, error } = await client
    .from('drivers')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function approveDriver(
  client: SupabaseClient,
  id: string
): Promise<Driver> {
  return updateDriver(client, id, { status: 'approved' });
}

export async function rejectDriver(
  client: SupabaseClient,
  id: string
): Promise<Driver> {
  return updateDriver(client, id, { status: 'rejected' });
}
