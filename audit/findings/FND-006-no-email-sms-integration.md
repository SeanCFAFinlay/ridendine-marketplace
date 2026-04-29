---
id: FND-006
title: No email or SMS delivery — notifications are in-app only
category: TestGap
severity: Medium
effort: M
status: Open
components: CMP-005, CMP-049
---

# [[FND-006]] No Email/SMS Integration

## Summary
[[CMP-005]] NotificationSender writes notification records to the database but performs no actual email or SMS delivery. `RESEND_API_KEY` is commented out in `.env.example`, confirming the integration was planned but never implemented. All notifications exist only as in-app records that users may never see.

## Evidence
- `notification-sender.ts`: DB insert only, no external API call
- `.env.example`: `# RESEND_API_KEY=...` — commented out
- [[CMP-049]] NotificationTemplates: renders email-style subjects and bodies with no delivery mechanism

## Impact
- Customers receive no email confirmation after placing an order
- Chefs receive no SMS/email for new order alerts (critical for chefs not actively monitoring the dashboard)
- Drivers receive no out-of-app notification for new delivery offers
- Password reset flow may rely on Supabase Auth emails only

## Recommendation
1. Integrate Resend (already planned): uncomment `RESEND_API_KEY`, implement email dispatch in `notification-sender.ts`
2. Add SMS via Twilio or Vonage for order/dispatch alerts
3. Update `NotificationTemplates` with proper HTML email templates
4. Add fallback: if external delivery fails, the DB record still serves as in-app notification

## Fix Effort
M — Resend integration is straightforward; SMS adds complexity.
