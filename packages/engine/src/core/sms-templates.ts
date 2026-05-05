// ==========================================
// SMS TEMPLATES
// Concise (<= 140 chars) per-type copy for Twilio delivery.
// For unrecognised types falls back to "${title}: ${body}" truncated to 160 chars.
// ==========================================

import type { NotificationType } from '@ridendine/types';

type SmsTemplateData = Record<string, unknown>;

const SMS_TEMPLATES: Partial<Record<NotificationType, (data: SmsTemplateData) => string>> = {
  order_placed: (data) =>
    `RideNDine: New order #${data['orderNumber'] ?? ''} — open chef.ridendine.ca to accept.`,

  delivery_offer: () =>
    'RideNDine: Delivery offer ready — open driver.ridendine.ca',

  order_delivered: () =>
    'RideNDine: Your order has been delivered. Enjoy!',
};

export function buildSmsBody(
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): string {
  const template = SMS_TEMPLATES[type];
  if (template) {
    return template(data ?? {});
  }
  const fallback = `${title}: ${body}`;
  return fallback.length > 160 ? fallback.slice(0, 157) + '...' : fallback;
}
