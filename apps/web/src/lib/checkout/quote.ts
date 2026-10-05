import { getCartWithItems, type SupabaseClient } from '@ridendine/db';
import { roundMoney } from '@/lib/cart-summary';
import {
  DELIVERY_BASE_FEE_CENTS,
  buildAddressString,
  calculateDeliveryFee,
  createTaxConfigService,
  estimateDistance,
  geocodeAddress,
  getSurgeMultiplier,
  isWithinDeliveryZone,
  type Coordinates,
} from '@ridendine/engine';

export interface CheckoutQuoteInput {
  adminClient: SupabaseClient;
  customerId: string;
  storefrontId: string;
  deliveryAddressId: string;
  tip?: number;
  promoCode?: string;
  clientSubtotal?: number;
  clientDeliveryFee?: number;
  clientServiceFee?: number;
  clientTax?: number;
  clientTotal?: number;
}

export interface CheckoutQuoteBreakdown {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
}

interface NormalizedModifier {
  optionId: string;
  valueId: string;
  optionName: string;
  valueName: string;
  priceAdjustment: number;
}

/** The pure, persistence-free output of pricing a set of line items. */
export interface QuoteComputation {
  menuIds: string[];
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
    modifiers: NormalizedModifier[];
  }>;
  quote: CheckoutQuoteBreakdown;
  promoCodeId: string | null;
  deliveryDistanceKm: number | null;
  deliverySurgeMultiplier: number;
}

export interface CheckoutQuoteResult extends QuoteComputation {
  cart: {
    id: string;
    cart_items: Array<{
      menu_item_id: string;
      quantity: number;
      unit_price: number;
      special_instructions?: string;
      selected_options?: Array<{ optionId: string; valueId: string; priceAdjustment: number }>;
    }>;
  };
}

export type CheckoutQuoteFailure = {
  ok: false;
  error: { code: string; message: string; status?: number };
};

export type CheckoutQuoteBuildResult = { ok: true; value: CheckoutQuoteResult } | CheckoutQuoteFailure;
export type QuoteComputationResult = { ok: true; value: QuoteComputation } | CheckoutQuoteFailure;

interface PromoCodeRow {
  id: string;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

interface MenuItemRow {
  id: string;
  storefront_id: string;
  price: number;
  is_available: boolean;
  is_sold_out: boolean;
}

interface MenuItemOptionValueRow {
  id: string;
  option_id: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
  sort_order?: number;
}

interface MenuItemOptionRow {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  max_selections: number;
  sort_order?: number;
  menu_item_option_values?: MenuItemOptionValueRow[];
}

type SelectedOptionInput = {
  optionId?: string;
  valueId?: string;
  option_id?: string;
  value_id?: string;
  priceAdjustment?: number;
  price_adjustment?: number;
};

/**
 * A single line item to price. `expectedUnitPrice` is the cart-stored unit price
 * (cart path only) used for the stale-price guard; omit it for inline callers
 * (partner API), where the current menu price is always authoritative.
 */
export interface QuoteLineItem {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string | null;
  selectedOptions?: SelectedOptionInput[];
  expectedUnitPrice?: number;
}

// Re-exported so existing consumers (e.g. /api/checkout) keep importing from here.
export { roundMoney };

function fail(code: string, message: string, status = 400): CheckoutQuoteFailure {
  return { ok: false, error: { code, message, status } };
}

function computeServerQuote(
  subtotal: number,
  tip: number,
  promoDiscount: number,
  rates: { hstRate: number; serviceFeePercent: number },
  deliveryFeeCents?: number
): CheckoutQuoteBreakdown {
  // Fallback when distance could not be computed (geocoding or OSRM failed).
  // This previously used the @deprecated BASE_DELIVERY_FEE ($5.00) while the
  // distance path uses DELIVERY_BASE_FEE_CENTS ($3.99), so a customer whose
  // address failed to geocode was silently charged $1.01 more for the same
  // delivery. Both paths now start from the same base fee.
  const deliveryFee =
    deliveryFeeCents !== undefined ? deliveryFeeCents / 100 : DELIVERY_BASE_FEE_CENTS / 100;
  const serviceFee = roundMoney(subtotal * (rates.serviceFeePercent / 100));
  const tax = roundMoney((subtotal + deliveryFee + serviceFee) * (rates.hstRate / 100));
  const preDiscountTotal = subtotal + deliveryFee + serviceFee + tax + tip;

  return {
    subtotal: roundMoney(subtotal),
    deliveryFee,
    serviceFee,
    tax,
    tip: roundMoney(tip),
    discount: roundMoney(promoDiscount),
    total: roundMoney(Math.max(preDiscountTotal - promoDiscount, 0)),
  };
}

async function resolveServiceAreaSurge(adminClient: SupabaseClient): Promise<number> {
  try {
    const { data } = await (adminClient as any)
      .from('service_areas')
      .select('id, surge_multiplier')
      .eq('is_active', true)
      .maybeSingle();

    if (!data?.id) return 1.0;
    return getSurgeMultiplier(data.id, adminClient as any);
  } catch {
    return 1.0;
  }
}

/**
 * Delivery fee from explicit delivery coordinates (no address-row lookup).
 * Falls back to the small-order/base fee when coordinates are unavailable.
 */
async function resolveDeliveryFeeByCoords(
  adminClient: SupabaseClient,
  coords: { lat: number | null; lng: number | null } | null,
  storefrontId: string,
  subtotalCents: number
): Promise<{ feeCents: number; distanceKm: number | null; surgeMultiplier: number }> {
  try {
    const { data: kitchen } = await (adminClient as any)
      .from('chef_kitchens')
      .select('lat, lng')
      .eq('storefront_id', storefrontId)
      .maybeSingle();

    if (
      coords?.lat == null ||
      coords?.lng == null ||
      !(kitchen as any)?.lat ||
      !(kitchen as any)?.lng
    ) {
      return {
        feeCents: calculateDeliveryFee(0, subtotalCents).feeCents,
        distanceKm: null,
        surgeMultiplier: 1.0,
      };
    }

    const customerCoords: Coordinates = { latitude: coords.lat, longitude: coords.lng };
    const chefCoords: Coordinates = {
      latitude: (kitchen as any).lat,
      longitude: (kitchen as any).lng,
    };
    const distanceKm = estimateDistance(customerCoords, chefCoords);
    const surgeMultiplier = await resolveServiceAreaSurge(adminClient);

    return {
      feeCents: calculateDeliveryFee(distanceKm, subtotalCents, surgeMultiplier).feeCents,
      distanceKm,
      surgeMultiplier,
    };
  } catch {
    return {
      feeCents: calculateDeliveryFee(0, subtotalCents).feeCents,
      distanceKm: null,
      surgeMultiplier: 1.0,
    };
  }
}

/**
 * Pure pricing: validate line items against the menu, compute the authoritative
 * subtotal/delivery/service/tax/promo from server data, and return the canonical
 * quote. Persistence-free — used by both the cart-based customer quote and the
 * inline partner quote. Delivery coordinates are passed in (no address lookup).
 */
async function computeQuoteFromItems(input: {
  adminClient: SupabaseClient;
  storefrontId: string;
  lineItems: QuoteLineItem[];
  deliveryCoords: { lat: number | null; lng: number | null } | null;
  tip: number;
  promoCode?: string;
  clientSubtotal?: number;
  clientDeliveryFee?: number;
  clientServiceFee?: number;
  clientTax?: number;
  clientTotal?: number;
}): Promise<QuoteComputationResult> {
  const {
    adminClient,
    storefrontId,
    lineItems,
    deliveryCoords,
    tip,
    promoCode,
    clientSubtotal,
    clientDeliveryFee,
    clientServiceFee,
    clientTax,
    clientTotal,
  } = input;

  const menuItemIds = Array.from(new Set(lineItems.map((item) => item.menuItemId)));

  const { data: menuItems, error: menuItemsError } = await adminClient
    .from('menu_items')
    .select('id, storefront_id, price, is_available, is_sold_out')
    .in('id', menuItemIds);

  if (menuItemsError || !menuItems) {
    return fail('VALIDATION_ERROR', 'Unable to verify menu items');
  }

  const menuById = new Map<string, MenuItemRow>(
    (menuItems as MenuItemRow[]).map((item) => [item.id, item])
  );

  const { data: optionRows, error: optionRowsError } = await (adminClient as any)
    .from('menu_item_options')
    .select(
      'id, menu_item_id, name, is_required, max_selections, sort_order, menu_item_option_values(id, option_id, name, price_adjustment, is_available, sort_order)'
    )
    .in('menu_item_id', menuItemIds);

  if (optionRowsError) {
    return fail('VALIDATION_ERROR', 'Unable to verify menu item options');
  }

  const optionsByMenuItem = new Map<string, MenuItemOptionRow[]>();
  for (const option of (optionRows ?? []) as MenuItemOptionRow[]) {
    const existing = optionsByMenuItem.get(option.menu_item_id) ?? [];
    existing.push(option);
    optionsByMenuItem.set(option.menu_item_id, existing);
  }

  let authoritativeSubtotal = 0;
  const normalizedModifiersByIndex = new Map<number, NormalizedModifier[]>();

  for (const [index, lineItem] of lineItems.entries()) {
    const menu = menuById.get(lineItem.menuItemId);
    if (!menu) {
      return fail('VALIDATION_ERROR', 'Cart contains stale items. Please refresh cart.');
    }
    if (menu.storefront_id !== storefrontId) {
      return fail('VALIDATION_ERROR', 'Cart contains items from a different storefront.');
    }
    if (!menu.is_available || menu.is_sold_out) {
      return fail('VALIDATION_ERROR', 'Cart contains unavailable items. Please refresh cart.');
    }
    if (
      lineItem.expectedUnitPrice !== undefined &&
      roundMoney(menu.price) !== roundMoney(lineItem.expectedUnitPrice)
    ) {
      return fail('VALIDATION_ERROR', 'Cart pricing is stale. Please refresh cart.');
    }

    const itemOptions = optionsByMenuItem.get(lineItem.menuItemId) ?? [];
    const selectedOptions = (lineItem.selectedOptions ?? []) as SelectedOptionInput[];
    const selectedByOption = new Map<string, SelectedOptionInput[]>();
    for (const selected of selectedOptions) {
      const optionId = selected.optionId ?? selected.option_id;
      if (!optionId) {
        return fail('INVALID_OPTION_SELECTION', 'Cart contains an invalid option selection.');
      }
      const existing = selectedByOption.get(optionId) ?? [];
      existing.push(selected);
      selectedByOption.set(optionId, existing);
    }

    const normalizedModifiers: NormalizedModifier[] = [];
    let modifierTotal = 0;
    for (const option of itemOptions) {
      const selectedForOption = selectedByOption.get(option.id) ?? [];
      if (option.is_required && selectedForOption.length === 0) {
        return fail('REQUIRED_OPTION_MISSING', `${option.name} is required.`);
      }
      if (selectedForOption.length > option.max_selections) {
        return fail('TOO_MANY_OPTIONS', `${option.name} allows at most ${option.max_selections} selections.`);
      }

      const valuesById = new Map(
        (option.menu_item_option_values ?? []).map((value) => [value.id, value])
      );
      for (const selected of selectedForOption) {
        const valueId = selected.valueId ?? selected.value_id;
        if (!valueId) {
          return fail('INVALID_OPTION_SELECTION', 'Cart contains an invalid option selection.');
        }
        const value = valuesById.get(valueId);
        if (!value) {
          return fail('INVALID_OPTION_SELECTION', 'Cart contains an invalid option value.');
        }
        if (!value.is_available) {
          return fail('OPTION_VALUE_UNAVAILABLE', `${value.name} is not available.`);
        }
        const priceAdjustment = roundMoney(Number(value.price_adjustment) || 0);
        modifierTotal += priceAdjustment;
        normalizedModifiers.push({
          optionId: option.id,
          valueId: value.id,
          optionName: option.name,
          valueName: value.name,
          priceAdjustment,
        });
      }
      selectedByOption.delete(option.id);
    }

    if (selectedByOption.size > 0) {
      return fail('INVALID_OPTION_SELECTION', 'Cart contains an option that does not belong to this menu item.');
    }

    normalizedModifiersByIndex.set(index, normalizedModifiers);
    authoritativeSubtotal += (menu.price + modifierTotal) * lineItem.quantity;
  }

  const subtotalCents = Math.round(authoritativeSubtotal * 100);

  if (deliveryCoords?.lat != null && deliveryCoords?.lng != null) {
    const inZone = await isWithinDeliveryZone(deliveryCoords.lat, deliveryCoords.lng);
    if (!inZone) {
      return fail(
        'OUTSIDE_DELIVERY_ZONE',
        "Sorry, we don't deliver to this address yet. We currently serve the Hamilton area."
      );
    }
  }

  const {
    feeCents: dynamicDeliveryFeeCents,
    distanceKm: deliveryDistanceKm,
    surgeMultiplier: deliverySurgeMultiplier,
  } = await resolveDeliveryFeeByCoords(adminClient, deliveryCoords, storefrontId, subtotalCents);

  const taxRates = await createTaxConfigService(
    adminClient as unknown as Parameters<typeof createTaxConfigService>[0]
  ).getTaxRates();

  const serverQuoteNoPromo = computeServerQuote(
    authoritativeSubtotal,
    tip,
    0,
    taxRates,
    dynamicDeliveryFeeCents
  );

  const clientSuppliedAnyTotals =
    clientSubtotal !== undefined ||
    clientDeliveryFee !== undefined ||
    clientServiceFee !== undefined ||
    clientTax !== undefined ||
    clientTotal !== undefined;
  if (clientSuppliedAnyTotals) {
    const totalsMatch =
      (clientSubtotal === undefined || roundMoney(clientSubtotal) === roundMoney(serverQuoteNoPromo.subtotal)) &&
      (clientDeliveryFee === undefined || roundMoney(clientDeliveryFee) === roundMoney(serverQuoteNoPromo.deliveryFee)) &&
      (clientServiceFee === undefined || roundMoney(clientServiceFee) === roundMoney(serverQuoteNoPromo.serviceFee)) &&
      (clientTax === undefined || roundMoney(clientTax) === roundMoney(serverQuoteNoPromo.tax)) &&
      (clientTotal === undefined || roundMoney(clientTotal) === roundMoney(serverQuoteNoPromo.total));

    if (!totalsMatch) {
      return fail('VALIDATION_ERROR', 'Client totals mismatch server quote');
    }
  }

  let promoDiscount = 0;
  let promoCodeId: string | null = null;
  if (promoCode) {
    const { data: promo } = await adminClient
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .single();

    const typedPromo = promo as PromoCodeRow | null;
    if (!typedPromo) {
      return fail('INVALID_PROMO', 'Invalid or inactive promo code');
    }

    const now = new Date();
    if (typedPromo.starts_at && new Date(typedPromo.starts_at) > now) {
      return fail('PROMO_NOT_ACTIVE', 'Promo code is not yet active');
    }
    if (typedPromo.expires_at && new Date(typedPromo.expires_at) < now) {
      return fail('PROMO_EXPIRED', 'Promo code has expired');
    }
    if (typedPromo.usage_limit && typedPromo.usage_count >= typedPromo.usage_limit) {
      return fail('PROMO_EXHAUSTED', 'Promo code has reached maximum uses');
    }

    promoCodeId = typedPromo.id;
    promoDiscount =
      typedPromo.discount_type === 'percentage'
        ? roundMoney(authoritativeSubtotal * (typedPromo.discount_value / 100))
        : roundMoney(typedPromo.discount_value);
  }

  const quote = computeServerQuote(
    authoritativeSubtotal,
    tip,
    promoDiscount,
    taxRates,
    dynamicDeliveryFeeCents
  );

  return {
    ok: true,
    value: {
      menuIds: lineItems.map((li) => li.menuItemId),
      items: lineItems.map((li, index) => ({
        menuItemId: li.menuItemId,
        quantity: li.quantity,
        specialInstructions: li.specialInstructions ?? undefined,
        modifiers: normalizedModifiersByIndex.get(index) ?? [],
      })),
      quote,
      promoCodeId,
      deliveryDistanceKm,
      deliverySurgeMultiplier,
    },
  };
}

/**
 * Cart-based quote for the logged-in customer flow. Loads the customer's cart
 * and delivery address, then delegates pricing to the shared core.
 */
export async function buildCheckoutQuote(
  input: CheckoutQuoteInput
): Promise<CheckoutQuoteBuildResult> {
  const { adminClient, customerId, storefrontId, deliveryAddressId, promoCode } = input;
  // Round the tip once on intake: the client may send >2-decimal values, and an
  // unrounded tip would make the charged total drift from the displayed breakdown.
  const tip = roundMoney(Number(input.tip) || 0);

  const cart = await getCartWithItems(adminClient, customerId, storefrontId);
  if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
    return fail('EMPTY_CART', 'Cart is empty');
  }

  const cartItems = cart.cart_items as CheckoutQuoteResult['cart']['cart_items'];

  const lineItems: QuoteLineItem[] = cartItems.map((item) => ({
    menuItemId: item.menu_item_id,
    quantity: item.quantity,
    specialInstructions: item.special_instructions,
    expectedUnitPrice: item.unit_price,
    selectedOptions: (item.selected_options ?? []) as SelectedOptionInput[],
  }));

  const { data: deliveryAddress } = await adminClient
    .from('customer_addresses')
    .select('lat, lng')
    .eq('id', deliveryAddressId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!deliveryAddress) {
    return fail('ADDRESS_NOT_FOUND', 'Delivery address was not found for this customer');
  }

  const result = await computeQuoteFromItems({
    adminClient,
    storefrontId,
    lineItems,
    deliveryCoords: { lat: (deliveryAddress as any).lat, lng: (deliveryAddress as any).lng },
    tip,
    promoCode,
    clientSubtotal: input.clientSubtotal,
    clientDeliveryFee: input.clientDeliveryFee,
    clientServiceFee: input.clientServiceFee,
    clientTax: input.clientTax,
    clientTotal: input.clientTotal,
  });

  if (!result.ok) return result;

  return {
    ok: true,
    value: {
      ...result.value,
      cart: { id: cart.id, cart_items: cartItems },
    },
  };
}

export interface PartnerQuoteInput {
  adminClient: SupabaseClient;
  storefrontId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string | null;
    selectedOptions?: Array<{ optionId: string; valueId: string }>;
  }>;
  deliveryAddress: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    lat?: number | null;
    lng?: number | null;
  };
  tip?: number;
  promoCode?: string;
}

/**
 * Side-effect-free quote for inline (partner) orders: prices the items + address
 * with NO guest customer / address / cart rows written. Geocodes the address if
 * coordinates are not supplied.
 */
export async function buildPartnerQuote(
  input: PartnerQuoteInput
): Promise<QuoteComputationResult> {
  const tip = roundMoney(Number(input.tip) || 0);

  const lineItems: QuoteLineItem[] = input.items.map((item) => ({
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    specialInstructions: item.specialInstructions ?? undefined,
    selectedOptions: item.selectedOptions,
  }));

  let lat = input.deliveryAddress.lat ?? null;
  let lng = input.deliveryAddress.lng ?? null;
  if (lat === null || lng === null) {
    const coords = await geocodeAddress(
      buildAddressString({
        streetAddress: input.deliveryAddress.addressLine1,
        city: input.deliveryAddress.city,
        state: input.deliveryAddress.state,
        postalCode: input.deliveryAddress.postalCode,
        country: input.deliveryAddress.country || 'CA',
      })
    );
    if (coords) {
      lat = coords.latitude;
      lng = coords.longitude;
    }
  }

  return computeQuoteFromItems({
    adminClient: input.adminClient,
    storefrontId: input.storefrontId,
    lineItems,
    deliveryCoords: { lat, lng },
    tip,
    promoCode: input.promoCode,
  });
}
