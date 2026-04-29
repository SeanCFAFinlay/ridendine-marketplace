// ==========================================
// LIGHTWEIGHT ANALYTICS
// Logs business events to a simple Supabase table.
// No third-party SDKs — all data stays in your DB.
// ==========================================

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, string | number | boolean | null>;
  userId?: string;
  sessionId?: string;
  page?: string;
  referrer?: string;
  userAgent?: string;
  timestamp?: string;
}

/**
 * Track an analytics event (server-side).
 * Writes to the analytics_events table if it exists.
 * Fails silently if the table doesn't exist.
 */
export async function trackEvent(
  client: { from: (table: string) => any },
  event: AnalyticsEvent
): Promise<void> {
  try {
    await client.from('analytics_events').insert({
      event_name: event.event,
      properties: event.properties || {},
      user_id: event.userId || null,
      session_id: event.sessionId || null,
      page_url: event.page || null,
      referrer: event.referrer || null,
      user_agent: event.userAgent || null,
      created_at: event.timestamp || new Date().toISOString(),
    });
  } catch {
    // Table may not exist yet — fail silently
  }
}

/**
 * Standard business events to track.
 */
export const ANALYTICS_EVENTS = {
  // Customer events
  PAGE_VIEW: 'page_view',
  CHEF_VIEW: 'chef_view',
  ADD_TO_CART: 'add_to_cart',
  CHECKOUT_START: 'checkout_start',
  CHECKOUT_COMPLETE: 'checkout_complete',
  ORDER_PLACED: 'order_placed',
  REVIEW_SUBMITTED: 'review_submitted',

  // Chef events
  MENU_ITEM_CREATED: 'menu_item_created',
  ORDER_ACCEPTED: 'order_accepted',
  ORDER_REJECTED: 'order_rejected',

  // Driver events
  DRIVER_ONLINE: 'driver_online',
  DRIVER_OFFLINE: 'driver_offline',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_DECLINED: 'offer_declined',
  DELIVERY_COMPLETED: 'delivery_completed',
} as const;
