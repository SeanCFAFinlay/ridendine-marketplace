# 23 - User Role Journey Map

**Audit Date**: 2026-04-23
**Status Legend**: WORKING / PARTIAL / MISSING / BROKEN

---

## Overview

This document maps the complete user journey for each of the four roles in the Ridendine platform: Customer, Chef, Driver, and Ops Admin. Each step is assessed for implementation status.

---

## Role 1: Customer

**App**: `apps/web` (port 3000)
**Primary goal**: Discover home chefs, order food, receive delivery

### Journey: Discovery to First Order

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. Land on homepage | `/` | WORKING | Storefront listing loads |
| 2. Browse chef storefronts | `/` or `/browse` | WORKING | Storefront cards with chef name, cuisine, rating |
| 3. Filter by cuisine type | Homepage filter | PARTIAL | UI exists, filter may not persist |
| 4. View chef storefront page | `/chefs/[id]` | WORKING | Chef bio, hours, menu |
| 5. Browse menu items | `/chefs/[id]` | WORKING | Menu items with images and prices |
| 6. Add item to cart | Cart drawer | WORKING | Adds to CartContext |
| 7. View cart | Cart drawer / `/cart` | WORKING | Item list, quantities, totals |
| 8. Apply promo code | Checkout page | PARTIAL | UI exists, DB validation may be incomplete |
| 9. Enter delivery address | Checkout page | PARTIAL | Form exists, no geocoding/validation |
| 10. Enter payment details | Checkout - Stripe Elements | WORKING | Stripe-hosted payment form |
| 11. Confirm order | `POST /api/checkout` | WORKING | PaymentIntent created, cart cleared |
| 12. View order confirmation | `/orders/[id]` or redirect | PARTIAL | Page exists, may show basic info only |
| 13. Track order status | `/orders/[id]` | PARTIAL | Status shown, no real-time updates |
| 14. Receive delivered order | Physical delivery | Working outside app | No delivery confirmation UI |
| 15. Confirm delivery received | - | MISSING | No in-app delivery confirmation step |
| 16. Leave review | `/orders/[id]/review` | PARTIAL | Form may exist, not prompted automatically |
| 17. View past orders | `/orders` | WORKING | Order history list |

### Journey: Account Management

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. Sign up | `/auth/signup` | WORKING | Supabase auth |
| 2. Verify email | Email link | PARTIAL | Supabase sends verification, app handling may need testing |
| 3. Log in | `/auth/login` | WORKING | Supabase auth session |
| 4. Forgot password | `/auth/forgot-password` | WORKING | Test file exists |
| 5. Update profile | `/profile` | PARTIAL | Form exists, save may be incomplete |
| 6. View saved addresses | `/profile/addresses` | MISSING | No address management UI |
| 7. Add to favorites | Chef card heart button | MISSING | Favorites not wired (see gap analysis) |
| 8. View favorites | `/profile/favorites` | MISSING | Page not confirmed to exist |
| 9. View notifications | In-app notifications | MISSING | No notification center UI |
| 10. Log out | Header menu | WORKING | Supabase signOut |

**Customer Journey Completeness**: ~65%
Core ordering flow works. Real-time tracking, favorites, delivery address management, and notifications are missing.

---

## Role 2: Chef

**App**: `apps/chef-admin` (port 3001)
**Primary goal**: Set up storefront, receive and fulfill orders, get paid

### Journey: Onboarding

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. Sign up as chef | `/auth/signup` | WORKING | Role set to `chef` |
| 2. Verify email | Email verification | PARTIAL | Supabase email, app callback handling |
| 3. Create chef profile | `/onboarding/profile` | PARTIAL | Form exists, all fields may not save |
| 4. Upload profile photo | Profile form | PARTIAL | File upload UI may be incomplete |
| 5. Create storefront | `/onboarding/storefront` | PARTIAL | Form exists, image upload partial |
| 6. Set cuisine types | Storefront form | WORKING | Multi-select |
| 7. Set operating hours | Storefront form | PARTIAL | Form exists, schedule logic partial |
| 8. Set delivery zone | Storefront form | MISSING | No delivery zone configuration UI |
| 9. Add first menu items | `/dashboard/menu` | WORKING | Add menu items with price and description |
| 10. Upload menu item photos | Menu form | PARTIAL | Upload component incomplete |
| 11. Submit for approval | Implicit on completion | PARTIAL | May auto-submit or require manual trigger |
| 12. Wait for ops approval | Email notification | UNWIRED | No email sent on submission |
| 13. Receive approval notification | Email | UNWIRED | No email sent when approved |
| 14. Start receiving orders | Dashboard active | WORKING | Once approved, orders flow in |

### Journey: Order Fulfillment

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. See new order arrive | `/dashboard/orders` | PARTIAL | Orders list loads; real-time notification partial |
| 2. Receive audio/visual alert | - | MISSING | No notification sound or push notification |
| 3. Review order details | `/dashboard/orders/[id]` | WORKING | Order details visible |
| 4. Accept order (within 8 min) | Accept button | WORKING | Status transitions correctly |
| 5. Auto-reject if no response | Background job | MISSING | No 8-minute auto-reject timer |
| 6. Reject order with reason | Reject button | WORKING | Status transitions correctly |
| 7. Start preparing | Preparing button | WORKING | Status transitions correctly |
| 8. Mark order ready | Ready button | WORKING | Triggers dispatch engine |
| 9. Customer notified | Email | UNWIRED | No status-change emails |

### Journey: Business Management

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. View earnings summary | `/dashboard/earnings` | PARTIAL | Summary shows, may use client-side calc |
| 2. View earnings history | `/dashboard/earnings` | PARTIAL | Transaction list, pagination missing |
| 3. Request payout | `/dashboard/payouts` | PARTIAL | Request form may exist |
| 4. Add/edit menu items | `/dashboard/menu` | WORKING | CRUD operations |
| 5. Enable/disable menu items | Menu item toggle | WORKING | Availability toggle |
| 6. Set item availability | Menu item form | WORKING | In stock toggle |
| 7. Add item options/modifiers | Menu item form | MISSING | Options/modifiers not wired |
| 8. Pause storefront (go on break) | Dashboard toggle | PARTIAL | Toggle exists, may not pause order flow |
| 9. View reviews | `/dashboard/reviews` | PARTIAL | Reviews may display, no response feature |
| 10. Analytics dashboard | `/dashboard/analytics` | PARTIAL | Client-side calculations, not server-driven |
| 11. Update banking info | `/dashboard/payout-settings` | MISSING | No banking details form confirmed |

**Chef Journey Completeness**: ~55%
Order fulfillment core works. Onboarding (file uploads, delivery zones), notifications, analytics, and payouts are incomplete.

---

## Role 3: Driver

**App**: `apps/driver-app` (port 3003)
**Primary goal**: Accept delivery offers, pick up from chefs, deliver to customers, get paid

### Journey: Onboarding

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. Sign up as driver | `/auth/signup` | WORKING | Role set to `driver` |
| 2. Create driver profile | `/onboarding/profile` | PARTIAL | Form exists |
| 3. Add vehicle details | `/onboarding/vehicle` | PARTIAL | Form exists |
| 4. Upload documents (license, insurance) | Onboarding form | MISSING | File upload for documents not confirmed |
| 5. Upload profile photo | Onboarding form | PARTIAL | Upload may be incomplete |
| 6. Submit for approval | Form submission | PARTIAL | Submission exists |
| 7. Wait for ops approval | Email | UNWIRED | No email on submission |
| 8. Receive approval notification | Email | UNWIRED | No approval email |
| 9. Background check | - | MISSING | No document verification UI or flow |
| 10. Account activated | Manual ops action | WORKING | Ops can approve in ops-admin |

### Journey: Active Delivery

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. Go online | Dashboard online toggle | WORKING | Driver availability set |
| 2. Receive delivery offer | Push notification | MISSING | Push notifications not implemented |
| 3. See offer in app | Offer screen | WORKING | Offer details displayed |
| 4. Accept offer (30-sec window) | Accept button | WORKING | Status transitions |
| 5. Auto-decline if no response | Timer | MISSING | No 30-second auto-decline |
| 6. Decline offer | Decline button | WORKING | Next driver tried |
| 7. Navigate to pickup | Map with route | PARTIAL | Map displayed, turn-by-turn navigation incomplete |
| 8. Update status: en route to pickup | Status button | WORKING | DB update |
| 9. Arrive at pickup | Status button | WORKING | DB update |
| 10. Confirm pickup with chef | In-app code or PIN | MISSING | No pickup confirmation flow |
| 11. Mark order picked up | Status button | WORKING | DB update |
| 12. Navigate to customer | Map with route | PARTIAL | Map displayed, navigation incomplete |
| 13. Update status: en route to dropoff | Status button | WORKING | DB update |
| 14. Arrive at customer | Status button | WORKING | DB update |
| 15. Mark delivered | Status button | WORKING | Triggers ledger + completion |
| 16. Customer confirms receipt | - | MISSING | No customer confirmation required |
| 17. Receive earnings credit | Ledger entry | WORKING | Ledger entry created |

### Journey: Business Management

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. View current earnings | `/dashboard/earnings` | PARTIAL | Hours calculation bug reported |
| 2. View earnings history | `/dashboard/earnings` | PARTIAL | History loads, pagination missing |
| 3. View delivery history | `/dashboard/deliveries` | PARTIAL | List loads, may lack detail |
| 4. Go offline | Dashboard toggle | WORKING | Availability set to false |
| 5. Update vehicle info | `/settings/vehicle` | PARTIAL | Form may exist |
| 6. View driver stats/rating | `/dashboard` | PARTIAL | Stats displayed, accuracy unverified |

**Driver Journey Completeness**: ~50%
Active delivery status updates work. Push notifications, document upload, GPS tracking, navigation, and pickup confirmation are missing or incomplete.

---

## Role 4: Ops Admin

**App**: `apps/ops-admin` (port 3002)
**Primary goal**: Manage the platform - approve chefs/drivers, handle orders, process refunds, manage settings

### Journey: Daily Operations

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. Log in | `/auth/login` | WORKING | Ops admin role |
| 2. View dashboard overview | `/dashboard` | WORKING | Stats and recent activity |
| 3. View pending chef approvals | `/chefs?status=pending` | WORKING | List of pending chefs |
| 4. Review chef application | `/chefs/[id]` | WORKING | Chef profile and documents |
| 5. Approve chef | Approve button | WORKING | Status transitions, notification UNWIRED |
| 6. Reject chef with reason | Reject button | WORKING | Status transitions, notification UNWIRED |
| 7. Suspend chef | Suspend button | WORKING | Status transitions |
| 8. Verify chef documents | Document viewer | MISSING | No document review UI |
| 9. View pending driver approvals | `/drivers?status=pending` | WORKING | List of pending drivers |
| 10. Review driver application | `/drivers/[id]` | WORKING | Driver profile |
| 11. Approve driver | Approve button | WORKING | Status transitions |
| 12. Reject driver | Reject button | WORKING | Status transitions |
| 13. View all orders | `/orders` | WORKING | All orders list |
| 14. Filter orders by status | Order filters | PARTIAL | Filter UI may be incomplete |
| 15. View order detail | `/orders/[id]` | WORKING | Full order breakdown |
| 16. Manually assign driver | Order detail | PARTIAL | Manual assignment may exist |
| 17. Cancel order | Order actions | WORKING | Status transitions |

### Journey: Finance and Refunds

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. View finance overview | `/finance` | PARTIAL | Summary stats |
| 2. View ledger entries | `/finance/ledger` | PARTIAL | Ledger list, pagination missing |
| 3. View chef payouts | `/finance/chef-payouts` | PARTIAL | Payout list |
| 4. Process chef payout | Manual trigger | PARTIAL | May exist as button |
| 5. View support tickets | `/support` | WORKING | Ticket list |
| 6. Review support ticket | `/support/[id]` | WORKING | Ticket details |
| 7. Create refund case | Refund form | WORKING | Refund case created |
| 8. Review refund details | Refund detail page | WORKING | Shows order and amounts |
| 9. Approve refund | Approve button | WORKING | Status transitions |
| 10. Process refund | Process button | BROKEN | Mock Stripe ID - money NOT returned |
| 11. Customer notified of refund | Email | UNWIRED | No notification |
| 12. View promo codes | `/promos` | PARTIAL | List may exist |
| 13. Create promo code | Promo form | MISSING | No promo creation UI confirmed |
| 14. Set discount percentages | - | MISSING | Managed via promo codes if at all |

### Journey: Platform Administration

| Step | Page/Component | Status | Notes |
|------|---------------|--------|-------|
| 1. View platform settings | `/settings` | WORKING | Settings page exists |
| 2. Update service fee % | Settings form | MISSING | Fee is hardcoded in engine constants |
| 3. Update delivery base fee | Settings form | MISSING | Fee is hardcoded in engine constants |
| 4. Update platform name/branding | Settings form | PARTIAL | Basic settings save |
| 5. View audit log | `/audit` | MISSING | No audit log UI (table exists, not exposed) |
| 6. View domain events | - | MISSING | No event log UI |
| 7. Manage roles/permissions | - | MISSING | No role management UI |
| 8. View system health | - | MISSING | No health dashboard |
| 9. Export reports | `/reports` | MISSING | No reporting/export feature |

**Ops Admin Journey Completeness**: ~55%
Approval flows, order management, and support ticket handling work. Refund processing is broken, fee management is hardcoded, document verification is missing, and financial reporting is incomplete.

---

## Journey Completeness Summary

| Role | Journey Completeness | Critical Gaps |
|------|---------------------|---------------|
| Customer | ~65% | Real-time tracking, favorites, delivery address mgmt, review prompts |
| Chef | ~55% | File uploads, notifications, delivery zones, payouts |
| Driver | ~50% | Push notifications, GPS, document upload, navigation |
| Ops Admin | ~55% | Broken refunds, fee config, document verification, reporting |
| **Overall** | **~56%** | Notifications and refunds are the biggest cross-cutting gaps |

---

## Cross-Role Dependency Map

| Feature | Customer | Chef | Driver | Ops |
|---------|---------|------|--------|-----|
| Email notifications | Receives | Receives | Receives | Sends (via engine) |
| Approval flow | N/A | Waits | Waits | Performs |
| Order lifecycle | Initiates | Fulfills | Delivers | Monitors |
| Refund | Requests (via support) | N/A | N/A | Processes |
| Platform settings | Affected by fees | Affected by fees | Affected by fees | Configures |
| Real-time updates | Needs | Needs | Needs | Monitors |

---

## Related Files

- `22-payment-order-dispatch-lifecycle.md` - Technical lifecycle detail
- `25-gap-analysis-to-fully-functional-platform.md` - All gaps organized by priority
- `19-priority-fix-roadmap.md` - Actionable fixes for gaps identified here
