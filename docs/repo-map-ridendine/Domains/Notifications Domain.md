# Notifications Domain

> In-app notifications, push subscriptions, and notification templates.

## Current State: Partially Connected

### What Works
- `notifications` table stores notification records
- `NotificationBell` component (web) displays notifications with Supabase Realtime
- Notifications can be read/unread, with action URLs
- Browser Notification API used when permission granted
- `push_subscriptions` table stores Web Push subscriptions

### What Doesn't Work
- **No notification dispatch system** — templates exist but nothing sends them
- **No push notification sender** — subscriptions stored but no VAPID keys or service worker
- **No email notifications** — `EmailNotification` type defined, no email service
- **No SMS notifications** — `SMSNotification` type defined, no SMS service

## Tables

| Table | Status |
|-------|--------|
| `notifications` | Connected (CRUD in web) |
| `push_subscriptions` | Partially connected (stored, not used to push) |

## Templates (`@ridendine/notifications`)

13+ notification types with title/body templates:

| Type | Title Template | Intended Recipient |
|------|---------------|-------------------|
| `order_placed` | "Order Confirmed!" | Customer |
| `order_accepted` | "Order Accepted" | Customer |
| `order_rejected` | "Order Update" | Customer |
| `order_ready` | "Order Ready!" | Customer |
| `order_picked_up` | "Driver Picked Up" | Customer |
| `order_delivered` | "Order Delivered!" | Customer |
| `delivery_offer` | "New Delivery Offer" | Driver |
| `chef_approved` | "Welcome to RideNDine!" | Chef |
| `driver_approved` | "You're Approved!" | Driver |
| `review_received` | "New Review" | Chef |

**None of these templates are called from any API route or engine orchestrator.**

## Notification Display (Web)

`NotificationBell` component:
- Fetches 50 most recent notifications for current user
- Subscribes to Supabase Realtime INSERT events
- Shows unread count badge
- Dropdown with notification list (icon, title, message, relative time)
- Click marks as read, navigates to `action_url`
- Shows browser Notification if permission granted

## What Needs to Be Built

1. **Event handlers** in engine that create notifications on order events
2. **Email service integration** (Resend, SendGrid, etc.)
3. **Push notification dispatch** (VAPID keys, web-push library, service worker)
4. **SMS service integration** (Twilio, etc.) — if needed
5. **Notification preferences** — settings page has toggles but they don't connect to anything
