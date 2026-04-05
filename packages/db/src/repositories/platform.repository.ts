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
  updated_at: string;
  updated_by?: string | null;
};

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
    updatedAt: row.updated_at,
    updatedBy: row.updated_by ?? undefined,
  };
}

export async function getPlatformSettings(
  client: SupabaseClient
): Promise<PlatformRuleSet> {
  const { data, error } = await (client
    .from('platform_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single() as any);

  if (error) throw error;
  return mapPlatformSettings(data as PlatformSettingsRow);
}

export async function updatePlatformSettings(
  client: SupabaseClient,
  input: Omit<PlatformRuleSet, 'id' | 'updatedAt'> & { id?: string },
  actorUserId: string
): Promise<PlatformRuleSet> {
  const current = await getPlatformSettings(client);
  const targetId = input.id ?? current.id;

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
    updated_at: new Date().toISOString(),
    updated_by: actorUserId,
  };

  const { data, error } = await ((client.from('platform_settings') as any)
    .update(payload)
    .eq('id', targetId)
    .select('*')
    .single());

  if (error) throw error;
  return mapPlatformSettings(data as PlatformSettingsRow);
}
