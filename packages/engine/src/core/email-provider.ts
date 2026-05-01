// ==========================================
// RESEND EMAIL DELIVERY PROVIDER
// Sends transactional emails when RESEND_API_KEY is configured.
// Falls back gracefully when not configured — DB notifications still work.
// Tier 1: FND-006 fix
// ==========================================

import type { NotificationType } from '@ridendine/types';
import type { NotificationDeliveryProvider } from './notification-sender';

// Email subjects keyed by notification type
const EMAIL_SUBJECTS: Partial<Record<NotificationType, string>> = {
  order_placed: 'New Order Received',
  order_accepted: 'Your Order Has Been Accepted',
  order_rejected: 'Order Update',
  order_ready: 'Your Order is Ready for Pickup',
  order_picked_up: 'Your Order is On Its Way',
  order_delivered: 'Your Order Has Been Delivered!',
  order_cancelled: 'Your Order Was Cancelled',
  refund_processed: 'Your Refund Has Been Processed',
  delivery_offer: 'New Delivery Available',
  chef_approved: 'Welcome to RideNDine!',
  driver_approved: 'Welcome to RideNDine!',
  review_received: 'You Received a New Review',
};

function buildEmailHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:24px;font-weight:bold;">
          <span style="color:#1a7a6e;">RideN</span><span style="color:#E85D26;">Dine</span>
        </span>
      </div>
      <h1 style="font-size:20px;color:#1a1a2e;margin:0 0 16px;">${title}</h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.6;margin:0 0 24px;">${body}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="font-size:12px;color:#a0aec0;text-align:center;margin:0;">
        RideNDine — Chef-First Food Delivery
      </p>
    </div>
  </div>
</body>
</html>`;
}

function getRecipientEmail(data?: Record<string, unknown>): string | undefined {
  return data?.email as string | undefined;
}

export function createResendProvider(): NotificationDeliveryProvider {
  // Lazily instantiated — avoids top-level import errors if resend is missing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resendInstance: any = null;

  return {
    name: 'resend-email',

    isAvailable(): boolean {
      return !!process.env.RESEND_API_KEY;
    },

    async deliver(params: {
      type: NotificationType;
      userId: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    }): Promise<{ delivered: boolean; error?: string }> {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return { delivered: false, error: 'RESEND_API_KEY not configured' };
      }

      const recipientEmail = getRecipientEmail(params.data);
      if (!recipientEmail) {
        return { delivered: false, error: 'no_recipient_email' };
      }

      const subject = EMAIL_SUBJECTS[params.type] ?? params.title;

      try {
        if (!resendInstance) {
          const { Resend } = await import('resend');
          resendInstance = new Resend(apiKey);
        }

        const result = await resendInstance.emails.send({
          from: 'RideNDine <noreply@ridendine.ca>',
          to: recipientEmail,
          subject,
          html: buildEmailHtml(params.title, params.body),
        });

        if (result.error) {
          return { delivered: false, error: result.error.message };
        }

        return { delivered: true };
      } catch (error) {
        return {
          delivered: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
