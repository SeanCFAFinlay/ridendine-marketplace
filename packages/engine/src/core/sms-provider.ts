// ==========================================
// TWILIO SMS DELIVERY PROVIDER
// Delivers SMS via Twilio REST API using direct fetch (no SDK).
// Falls back gracefully when env vars are unset.
// ==========================================

import type { NotificationType } from '@ridendine/types';
import type { NotificationDeliveryProvider } from './notification-sender';
import { buildSmsBody } from './sms-templates';

function isConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );
}

function buildBasicAuth(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

function getRecipientPhone(data?: Record<string, unknown>): string | undefined {
  return typeof data?.['phone'] === 'string' ? data['phone'] : undefined;
}

export function createTwilioProvider(): NotificationDeliveryProvider {
  return {
    name: 'twilio-sms',

    isAvailable(): boolean {
      return isConfigured();
    },

    async deliver(params: {
      type: NotificationType;
      userId: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }): Promise<{ delivered: boolean; error?: string }> {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        return { delivered: false, error: 'Twilio env vars not configured' };
      }

      const toPhone = getRecipientPhone(params.data);
      if (!toPhone) {
        return { delivered: false, error: 'no_recipient_phone' };
      }

      const smsBody = buildSmsBody(params.type, params.title, params.body, params.data);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formBody = new URLSearchParams({ From: fromNumber, To: toPhone, Body: smsBody });

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: buildBasicAuth(accountSid, authToken),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formBody.toString(),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => `HTTP ${res.status}`);
          return { delivered: false, error: text };
        }

        return { delivered: true };
      } catch (err) {
        return {
          delivered: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}
