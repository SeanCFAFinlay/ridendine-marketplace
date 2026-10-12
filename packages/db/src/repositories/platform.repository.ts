import type { SupabaseClient } from '../client/types';
import type { PlatformRuleSet } from '@ridendine/types';

type PlatformSettingsRow = {
  id: string;
  platform_fee_percent: number;
  service_fee_percent: number;
  hst_rate: number;
  min_order_amount: number;
  dispatch_radius_km?: number | null;
  max_delivery_distance_km?: number | null;
  max_delivery_radius_km?: number | null;
  default_prep_time_minutes?: number | null;
  offer_timeout_seconds?: number | null;
  max_assignment_attempts?: number | null;
  auto_assign_enabled?: boolean | null;
  refund_auto_review_threshold_cents?: number | null;
  support_sla_warning_minutes?: number | null;
  support_sla_breach_minutes?: number | null;
  storefront_throttle_order_limit?: number | null;
  storefront_throttle_window_minutes?: number | null;
  storefront_auto_pause_enabled?: boolean | null;
  storefront_pause_on_sla_breach?: boolean | null;
  setting_value?: Record<string, unknown> | null;
  updated_at: string;
  updated_by?: string | null;
};

type PlatformSettingsErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  status?: number;
};

export function createDefaultPlatformRuleSet(
  overrides: Partial<PlatformRuleSet> = {}
): PlatformRuleSet {
  return {
    id: 'platform-settings-default',
    platformFeePercent: 15,
    serviceFeePercent: 8,
    hstRate: 13,
    minOrderAmount: 10,
    dispatchRadiusKm: 10,
    maxDeliveryDistanceKm: 15,
    defaultPrepTimeMinutes: 20,
    offerTimeoutSeconds: 60,
    maxAssignmentAttempts: 5,
    autoAssignEnabled: true,
    refundAutoReviewThresholdCents: 2500,
    supportSlaWarningMinutes: 15,
    supportSlaBreachMinutes: 60,
    storefrontThrottleOrderLimit: 0,
    storefrontThrottleWindowMinutes: 30,
    storefrontAutoPauseEnabled: false,
    storefrontPauseOnSlaBreach: true,
    craBusinessNumber: 'BN 789123456 RT0001',
    supportPhoneNumber: '+1 (888) 555-RIDE',
    emergencyDispatchHotline: '+1 (905) 555-0199',
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

export function shouldFallbackToDefaultPlatformSettings(
  error: PlatformSettingsErrorLike | null | undefined
): boolean {
  if (!error) return false;
  const haystack = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    error.code === 'PGRST116' ||
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    error.status === 404 ||
    haystack.includes('platform_settings') &&
      (haystack.includes('not found') ||
        haystack.includes('could not find') ||
        haystack.includes('does not exist') ||
        haystack.includes('relation'))
  );
}

function logPlatformSettingsFallback(
  source: string,
  error: PlatformSettingsErrorLike
): void {
  console.error('[ridendine][platform-settings][fallback]', {
    source,
    code: error.code ?? null,
    status: error.status ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
  });
}

function mapPlatformSettings(row: PlatformSettingsRow): PlatformRuleSet {
  return {
    id: row.id,
    platformFeePercent: Number(row.platform_fee_percent ?? 15),
    serviceFeePercent: Number(row.service_fee_percent ?? 8),
    hstRate: Number(row.hst_rate ?? 13),
    minOrderAmount: Number(row.min_order_amount ?? 10),
    dispatchRadiusKm: Number(row.dispatch_radius_km ?? 10),
    maxDeliveryDistanceKm: Number(
      row.max_delivery_distance_km ?? row.max_delivery_radius_km ?? 15
    ),
    defaultPrepTimeMinutes: Number(row.default_prep_time_minutes ?? 20),
    offerTimeoutSeconds: Number(row.offer_timeout_seconds ?? 60),
    maxAssignmentAttempts: Number(row.max_assignment_attempts ?? 5),
    autoAssignEnabled: Boolean(row.auto_assign_enabled ?? true),
    refundAutoReviewThresholdCents: Number(
      row.refund_auto_review_threshold_cents ?? 2500
    ),
    supportSlaWarningMinutes: Number(row.support_sla_warning_minutes ?? 15),
    supportSlaBreachMinutes: Number(row.support_sla_breach_minutes ?? 60),
    storefrontThrottleOrderLimit: Number(
      row.storefront_throttle_order_limit ?? 0
    ),
    storefrontThrottleWindowMinutes: Number(
      row.storefront_throttle_window_minutes ?? 30
    ),
    storefrontAutoPauseEnabled: Boolean(
      row.storefront_auto_pause_enabled ?? false
    ),
    storefrontPauseOnSlaBreach: Boolean(
      row.storefront_pause_on_sla_breach ?? true
    ),
    craBusinessNumber:
      typeof row.setting_value?.cra_business_number === 'string'
        ? (row.setting_value.cra_business_number as string)
        : 'BN 789123456 RT0001',
    supportPhoneNumber:
      typeof row.setting_value?.support_phone_number === 'string'
        ? (row.setting_value.support_phone_number as string)
        : '+1 (888) 555-RIDE',
    emergencyDispatchHotline:
      typeof row.setting_value?.emergency_dispatch_hotline === 'string'
        ? (row.setting_value.emergency_dispatch_hotline as string)
        : '+1 (905) 555-0199',
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? undefined,
  };
}

export async function getPlatformSettings(
  client: SupabaseClient
): Promise<PlatformRuleSet> {
  const { data, error } = await client
    .from('platform_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (shouldFallbackToDefaultPlatformSettings(error)) {
      logPlatformSettingsFallback('getPlatformSettings', error);
      return createDefaultPlatformRuleSet();
    }
    throw error;
  }

  if (!data) {
    console.error('[ridendine][platform-settings][fallback]', {
      source: 'getPlatformSettings',
      reason: 'empty-data',
    });
    return createDefaultPlatformRuleSet();
  }

  return mapPlatformSettings(data as PlatformSettingsRow);
}

export async function updatePlatformSettings(
  client: SupabaseClient,
  input: Omit<PlatformRuleSet, 'id' | 'updatedAt'> & { id?: string },
  actorUserId: string
): Promise<PlatformRuleSet> {
  const current = await getPlatformSettings(client);
  if (current.id === 'platform-settings-default') {
    throw new Error(
      'Platform settings table is missing. Apply migrations before editing settings.'
    );
  }
  const targetId = input.id ?? current.id;
  const currentSettingValue =
    ((await getPlatformSettingValue(client)) as Record<string, unknown>) || {};
  const updatedSettingValue = {
    ...currentSettingValue,
    ...(input.craBusinessNumber !== undefined
      ? { cra_business_number: input.craBusinessNumber }
      : {}),
    ...(input.supportPhoneNumber !== undefined
      ? { support_phone_number: input.supportPhoneNumber }
      : {}),
    ...(input.emergencyDispatchHotline !== undefined
      ? { emergency_dispatch_hotline: input.emergencyDispatchHotline }
      : {}),
  };

  const payload = {
    platform_fee_percent: input.platformFeePercent,
    service_fee_percent: input.serviceFeePercent,
    hst_rate: input.hstRate,
    min_order_amount: input.minOrderAmount,
    dispatch_radius_km: input.dispatchRadiusKm,
    max_delivery_distance_km: input.maxDeliveryDistanceKm,
    default_prep_time_minutes: input.defaultPrepTimeMinutes,
    offer_timeout_seconds: input.offerTimeoutSeconds,
    max_assignment_attempts: input.maxAssignmentAttempts,
    auto_assign_enabled: input.autoAssignEnabled,
    refund_auto_review_threshold_cents: input.refundAutoReviewThresholdCents,
    support_sla_warning_minutes: input.supportSlaWarningMinutes,
    support_sla_breach_minutes: input.supportSlaBreachMinutes,
    storefront_throttle_order_limit: input.storefrontThrottleOrderLimit,
    storefront_throttle_window_minutes: input.storefrontThrottleWindowMinutes,
    storefront_auto_pause_enabled: input.storefrontAutoPauseEnabled,
    storefront_pause_on_sla_breach: input.storefrontPauseOnSlaBreach,
    setting_value: updatedSettingValue,
    updated_at: new Date().toISOString(),
    updated_by: actorUserId,
  };

  const { data, error } = await client
    .from('platform_settings')
    .update(payload)
    .eq('id', targetId)
    .select('*')
    .single();

  if (error) {
    if (shouldFallbackToDefaultPlatformSettings(error)) {
      logPlatformSettingsFallback('updatePlatformSettings', error);
      throw new Error(
        'Platform settings table is missing. Apply migrations before editing settings.'
      );
    }
    throw error;
  }
  return mapPlatformSettings(data as PlatformSettingsRow);
}

// ==========================================
// RAW SETTINGS ROW (maintenance / automation rules JSON)
// ==========================================

/**
 * The first platform_settings row, unmapped. Maintenance mode and
 * automation rules live in its `setting_value` JSON blob. Returns null
 * when the table has no rows.
 */
export async function getRawPlatformSettingsRow(
  client: SupabaseClient
): Promise<Record<string, any> | null> {
  const { data, error } = await client
    .from('platform_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as Record<string, any>;
}

/** Just the `setting_value` JSON of the first platform_settings row, or null. */
export async function getPlatformSettingValue(
  client: SupabaseClient
): Promise<Record<string, any> | null> {
  const { data, error } = await client
    .from('platform_settings')
    .select('setting_value')
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return ((data as unknown as { setting_value?: Record<string, any> | null })?.setting_value ?? null);
}

// ==========================================
// SERVICE AREAS (surge pricing)
// ==========================================

export interface ServiceAreaSurgeRow {
  id: string;
  name: string;
  surge_multiplier: number | null;
  is_active: boolean;
  dispatch_radius_km: number | null;
}

/** All service areas with surge state, ordered by name. */
export async function listServiceAreas(
  client: SupabaseClient
): Promise<ServiceAreaSurgeRow[]> {
  const { data, error } = await client
    .from('service_areas')
    .select('id, name, surge_multiplier, is_active, dispatch_radius_km')
    .order('name');

  if (error) throw error;
  return (data ?? []) as unknown as ServiceAreaSurgeRow[];
}

/** Override the surge multiplier on a service area; returns the new state. */
export async function updateServiceAreaSurge(
  client: SupabaseClient,
  serviceAreaId: string,
  surgeMultiplier: number
): Promise<{ id: string; name: string; surge_multiplier: number | null }> {
  const { data, error } = await client
    .from('service_areas')
    .update({ surge_multiplier: surgeMultiplier, updated_at: new Date().toISOString() } as never)
    .eq('id', serviceAreaId)
    .select('id, name, surge_multiplier')
    .single();

  if (error) throw error;
  return data as unknown as { id: string; name: string; surge_multiplier: number | null };
}
