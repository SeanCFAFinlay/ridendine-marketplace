// ==========================================
// GEOCODING SERVICE
// Uses Nominatim (OSM) — free, no API key
// Hamilton-area delivery zone validation
// ==========================================

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Ridendine/1.0 (food-delivery-marketplace; contact@ridendine.com)';

// Hamilton, ON city center
const HAMILTON_CENTER_LAT = 43.2557;
const HAMILTON_CENTER_LNG = -79.8711;
const DELIVERY_RADIUS_KM = 25;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

/**
 * Nominatim has no timeout by default, so a slow upstream could stall a
 * checkout indefinitely — geocoding sits inline in the checkout quote. 5s is
 * generous for this endpoint and well inside any serverless function budget.
 */
const GEOCODE_TIMEOUT_MS = 5_000;

/**
 * In-memory cache: address string -> coordinates or null.
 *
 * Bounded. This was previously an unbounded Map that was never evicted, so a
 * long-lived warm instance accumulated one entry per distinct address string
 * forever. Simple FIFO eviction — recency matters little here because a given
 * address's coordinates do not change.
 */
export const geocodingCache = new Map<string, Coordinates | null>();

const GEOCODE_CACHE_MAX = 5_000;

function cacheGeocode(address: string, value: Coordinates | null): void {
  if (geocodingCache.size >= GEOCODE_CACHE_MAX) {
    // Map preserves insertion order, so the first key is the oldest.
    const oldest = geocodingCache.keys().next();
    if (!oldest.done) geocodingCache.delete(oldest.value);
  }
  geocodingCache.set(address, value);
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  if (geocodingCache.has(address)) {
    return geocodingCache.get(address) ?? null;
  }

  try {
    const url = new URL(NOMINATIM_BASE_URL);
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
    });

    if (!response.ok) {
      cacheGeocode(address, null);
      return null;
    }

    const results: NominatimResult[] = await response.json();

    const firstResult = results[0];
    if (!firstResult) {
      cacheGeocode(address, null);
      return null;
    }

    const coords: Coordinates = {
      latitude: parseFloat(firstResult.lat),
      longitude: parseFloat(firstResult.lon),
    };

    cacheGeocode(address, coords);
    return coords;
  } catch {
    cacheGeocode(address, null);
    return null;
  }
}

function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function isWithinDeliveryZone(
  latitude: number,
  longitude: number
): Promise<boolean> {
  const distanceKm = haversineDistanceKm(
    HAMILTON_CENTER_LAT,
    HAMILTON_CENTER_LNG,
    latitude,
    longitude
  );
  return distanceKm <= DELIVERY_RADIUS_KM;
}

export function buildAddressString(parts: {
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  return `${parts.streetAddress}, ${parts.city}, ${parts.state} ${parts.postalCode}, ${parts.country}`;
}
