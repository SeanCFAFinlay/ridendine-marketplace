import type { SupabaseClient } from '@supabase/supabase-js';
import type { RoutingProvider } from './provider';
import { computeProgressPct, estimateRemainingSeconds } from './progress';
import type { Point } from './types';

const PROVIDER_TAG = 'osrm';

function toPoint(lat: unknown, lng: unknown): Point | null {
  const la = typeof lat === 'number' ? lat : typeof lat === 'string' ? Number.parseFloat(lat) : Number.NaN;
  const ln = typeof lng === 'number' ? lng : typeof lng === 'string' ? Number.parseFloat(lng) : Number.NaN;
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  return { lat: la, lng: ln };
}

function addSecondsIso(seconds: number): string {
  const ms = Date.now() + Math.max(0, Math.round(seconds)) * 1000;
  return new Date(ms).toISOString();
}

export class EtaService {
  constructor(
    private readonly provider: RoutingProvider,
    private readonly db: SupabaseClient
  ) {}

  /**
   * Kitchen / storefront pickup → customer dropoff (initial promise-time route).
   * Writes only dropoff leg columns on `deliveries` (Phase 0 contract).
   */
  async computeInitial(orderId: string): Promise<void> {
    const { data: order, error: oErr } = await this.db
      .from('orders')
      .select('id, storefront_id, delivery_address_id')
      .eq('id', orderId)
      .maybeSingle();

    if (oErr || !order) return;

    const { data: delivery, error: dErr } = await this.db
      .from('deliveries')
      .select('id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng')
      .eq('order_id', orderId)
      .maybeSingle();

    if (dErr || !delivery?.id) return;

    const pickup = await this.resolvePickupPoint(order.storefront_id as string, delivery);
    const dropoff =
      toPoint(delivery.dropoff_lat, delivery.dropoff_lng) ??
      (await this.loadAddressPoint(order.delivery_address_id as string));

    if (!pickup || !dropoff) return;

    const route = await this.provider.route(pickup, dropoff);
    await this.db
      .from('deliveries')
      .update({
        route_to_dropoff_polyline: route.polyline,
        route_to_dropoff_meters: Math.round(route.meters),
        route_to_dropoff_seconds: Math.round(route.seconds),
        eta_dropoff_at: addSecondsIso(route.seconds),
        routing_provider: PROVIDER_TAG,
        routing_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', delivery.id);
  }

  /**
   * After driver assignment: driver → pickup, pickup → dropoff.
   */
  async computeFullOnAssign(deliveryId: string): Promise<void> {
    const { data: delivery, error } = await this.db
      .from('deliveries')
      .select(
        'id, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, order_id'
      )
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !delivery?.id) return;

    const driverPoint = delivery.driver_id
      ? await this.loadDriverPoint(delivery.driver_id as string)
      : null;

    const pickup = toPoint(delivery.pickup_lat, delivery.pickup_lng);
    const dropoff = toPoint(delivery.dropoff_lat, delivery.dropoff_lng);
    if (!pickup || !dropoff) return;

    let pickupRouteSeconds = 0;
    let pickupMeters = 0;
    let pickupPoly = '';

    if (driverPoint) {
      const leg1 = await this.provider.route(driverPoint, pickup);
      pickupPoly = leg1.polyline;
      pickupMeters = Math.round(leg1.meters);
      pickupRouteSeconds = Math.round(leg1.seconds);
    }

    const leg2 = await this.provider.route(pickup, dropoff);
    const dropPoly = leg2.polyline;
    const dropMeters = Math.round(leg2.meters);
    const dropSeconds = Math.round(leg2.seconds);

    const totalToDropoff = pickupRouteSeconds + dropSeconds;

    await this.db
      .from('deliveries')
      .update({
        route_to_pickup_polyline: pickupPoly || null,
        route_to_pickup_meters: driverPoint ? pickupMeters : null,
        route_to_pickup_seconds: driverPoint ? pickupRouteSeconds : null,
        eta_pickup_at: driverPoint ? addSecondsIso(pickupRouteSeconds) : null,
        route_to_dropoff_polyline: dropPoly,
        route_to_dropoff_meters: dropMeters,
        route_to_dropoff_seconds: dropSeconds,
        eta_dropoff_at: addSecondsIso(totalToDropoff),
        routing_provider: PROVIDER_TAG,
        routing_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);
  }

  /**
   * After pickup: driver → customer (refresh dropoff leg only).
   */
  async computeDropLegOnPickup(deliveryId: string): Promise<void> {
    const { data: delivery, error } = await this.db
      .from('deliveries')
      .select('id, driver_id, dropoff_lat, dropoff_lng')
      .eq('id', deliveryId)
      .maybeSingle();

    if (error || !delivery?.id) return;

    const driverPoint = delivery.driver_id
      ? await this.loadDriverPoint(delivery.driver_id as string)
      : null;
    const dropoff = toPoint(delivery.dropoff_lat, delivery.dropoff_lng);
    if (!driverPoint || !dropoff) return;

    const leg = await this.provider.route(driverPoint, dropoff);
    await this.db
      .from('deliveries')
      .update({
        route_to_dropoff_polyline: leg.polyline,
        route_to_dropoff_meters: Math.round(leg.meters),
        route_to_dropoff_seconds: Math.round(leg.seconds),
        eta_dropoff_at: addSecondsIso(leg.seconds),
        route_progress_pct: 0,
        routing_provider: PROVIDER_TAG,
        routing_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);
  }

  async refreshFromDriverPing(
    deliveryId: string,
    driverPos: Point
  ): Promise<{ progressPct: number; remainingSeconds: number; etaDropoffAt: Date }> {
    const { data: row } = await this.db
      .from('deliveries')
      .select('route_to_dropoff_polyline, route_to_dropoff_seconds')
      .eq('id', deliveryId)
      .maybeSingle();

    const poly = (row?.route_to_dropoff_polyline as string | null) ?? '';
    const totalSeconds =
      typeof row?.route_to_dropoff_seconds === 'number' && row.route_to_dropoff_seconds > 0
        ? row.route_to_dropoff_seconds
        : 0;

    const progressPct = computeProgressPct(driverPos, poly);
    const remainingSeconds = estimateRemainingSeconds(progressPct, totalSeconds);
    const etaDropoffAt = new Date(Date.now() + remainingSeconds * 1000);

    await this.db
      .from('deliveries')
      .update({
        route_progress_pct: progressPct,
        route_to_dropoff_seconds: remainingSeconds,
        eta_dropoff_at: etaDropoffAt.toISOString(),
        routing_computed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    return { progressPct, remainingSeconds, etaDropoffAt };
  }

  async rankDrivers(
    deliveryId: string,
    candidates: Array<{ driverId: string; point: Point }>
  ): Promise<Array<{ driverId: string; seconds: number }>> {
    if (!candidates.length) return [];

    const { data: delivery } = await this.db
      .from('deliveries')
      .select('pickup_lat, pickup_lng')
      .eq('id', deliveryId)
      .maybeSingle();

    const pickup = toPoint(delivery?.pickup_lat, delivery?.pickup_lng);
    if (!pickup) {
      return candidates.map((c) => ({ driverId: c.driverId, seconds: Number.MAX_SAFE_INTEGER }));
    }

    const sources = candidates.map((c) => c.point);
    const targets = [pickup];

    try {
      const m = await this.provider.matrix(sources, targets);
      const out: Array<{ driverId: string; seconds: number }> = [];
      for (let i = 0; i < candidates.length; i++) {
        const sec = m.durations[i]?.[0];
        out.push({
          driverId: candidates[i]!.driverId,
          seconds: typeof sec === 'number' && Number.isFinite(sec) ? sec : Number.MAX_SAFE_INTEGER,
        });
      }
      out.sort((a, b) => a.seconds - b.seconds);
      return out;
    } catch {
      const timed: Array<{ driverId: string; seconds: number }> = [];
      for (const c of candidates) {
        try {
          const r = await this.provider.route(c.point, pickup);
          timed.push({ driverId: c.driverId, seconds: Math.round(r.seconds) });
        } catch {
          timed.push({ driverId: c.driverId, seconds: Number.MAX_SAFE_INTEGER });
        }
      }
      timed.sort((a, b) => a.seconds - b.seconds);
      return timed;
    }
  }

  private async resolvePickupPoint(
    storefrontId: string,
    delivery: { pickup_lat: unknown; pickup_lng: unknown }
  ): Promise<Point | null> {
    const fromDelivery = toPoint(delivery.pickup_lat, delivery.pickup_lng);
    if (fromDelivery) return fromDelivery;

    const { data: sf } = await this.db
      .from('chef_storefronts')
      .select('kitchen_id')
      .eq('id', storefrontId)
      .maybeSingle();

    if (!sf?.kitchen_id) return null;

    const { data: kitchen } = await this.db
      .from('chef_kitchens')
      .select('lat, lng')
      .eq('id', sf.kitchen_id as string)
      .maybeSingle();

    return toPoint(kitchen?.lat, kitchen?.lng);
  }

  private async loadAddressPoint(addressId: string): Promise<Point | null> {
    const { data: addr } = await this.db
      .from('customer_addresses')
      .select('lat, lng')
      .eq('id', addressId)
      .maybeSingle();

    return toPoint(addr?.lat, addr?.lng);
  }

  private async loadDriverPoint(driverId: string): Promise<Point | null> {
    const { data: presence } = await this.db
      .from('driver_presence')
      .select('current_lat, current_lng, last_location_lat, last_location_lng')
      .eq('driver_id', driverId)
      .maybeSingle();

    if (!presence) return null;
    return (
      toPoint(presence.current_lat, presence.current_lng) ??
      toPoint(presence.last_location_lat, presence.last_location_lng)
    );
  }
}
