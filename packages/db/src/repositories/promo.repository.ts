import type { SupabaseClient } from '../client/types';

export interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoValidationResult {
  valid: boolean;
  promoId?: string;
  discount?: number;
  error?: string;
}

export async function getPromoCodeByCode(
  client: SupabaseClient,
  code: string
): Promise<PromoCode | null> {
  const { data, error } = await client
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as PromoCode;
}

export async function validatePromoCode(
  client: SupabaseClient,
  code: string,
  subtotal: number
): Promise<PromoValidationResult> {
  const promo = await getPromoCodeByCode(client, code);

  if (!promo) {
    return { valid: false, error: 'Promo code not found' };
  }

  if (!promo.is_active) {
    return { valid: false, error: 'Promo code is no longer active' };
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'Promo code has expired' };
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return { valid: false, error: 'Promo code has reached its usage limit' };
  }

  if (promo.min_order_amount !== null && subtotal < promo.min_order_amount) {
    return {
      valid: false,
      error: `Minimum order amount of $${(promo.min_order_amount / 100).toFixed(2)} required`,
    };
  }

  let discount: number;
  if (promo.discount_type === 'percentage') {
    discount = Math.round(subtotal * (promo.discount_value / 100));
  } else {
    discount = Math.round(promo.discount_value * 100);
  }

  discount = Math.min(discount, subtotal);

  return {
    valid: true,
    promoId: promo.id,
    discount,
  };
}

export async function incrementPromoCodeUsage(
  client: SupabaseClient,
  promoId: string
): Promise<void> {
  const { error } = await client.rpc('increment_promo_usage', {
    promo_id: promoId,
  });

  if (error) {
    const { error: updateError } = await client
      .from('promo_codes')
      .update({
        used_count: (client as any).raw('used_count + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', promoId);

    if (updateError) {
      console.error('Failed to increment promo usage:', updateError);
    }
  }
}

export async function getActivePromoCodes(
  client: SupabaseClient
): Promise<PromoCode[]> {
  const { data, error } = await client
    .from('promo_codes')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PromoCode[];
}
