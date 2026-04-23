# 13 - Broken, Unwired, and Placeholder Items

**Audit Date**: 2026-04-23
**Scope**: Every identified broken, unimplemented, placeholder, or dead-code item across all apps and packages
**Status**: 20 items catalogued — mix of FIXED, PLACEHOLDER, UNWIRED, DEAD CODE, and PARTIAL

---

## Summary Table

| # | Item | Category | Severity | App/Package | Fixed? |
|---|------|----------|----------|-------------|--------|
| 1 | Chef storefront creation dead-end | BROKEN | HIGH | chef-admin | YES (prior audit) |
| 2 | Ops analytics fake data | PLACEHOLDER | HIGH | ops-admin | NO |
| 3 | Ops map non-production | PLACEHOLDER | MEDIUM | ops-admin | NO |
| 4 | 22 DB tables unreferenced | UNWIRED | HIGH | All / @ridendine/db | NO |
| 5 | 6 of 8 RPC functions unused | UNWIRED | MEDIUM | @ridendine/db | NO |
| 6 | Email notifications unsent | UNWIRED | CRITICAL | @ridendine/notifications | NO |
| 7 | Push notifications unsent | UNWIRED | HIGH | apps/web, driver-app | NO |
| 8 | Mock Stripe refund IDs | PLACEHOLDER | CRITICAL | ops-admin | NO |
| 9 | Driver earnings hours = 0 | UNWIRED | MEDIUM | driver-app | NO |
| 10 | Driver location hardcoded city | UNWIRED | MEDIUM | driver-app | NO |
| 11 | Chef reviews error handling absent | BROKEN | MEDIUM | chef-admin | NO |
| 12 | PasswordStrength component unused | DEAD CODE | LOW | chef-admin | NO |
| 13 | Favorites no CRUD | UNWIRED | MEDIUM | apps/web | NO |
| 14 | Realtime minimal | PARTIAL | HIGH | All | NO |
| 15 | Chef document verification | UNWIRED | HIGH | chef-admin, ops-admin | NO |
| 16 | Driver document verification | UNWIRED | HIGH | driver-app, ops-admin | NO |
| 17 | Chef availability management | UNWIRED | MEDIUM | chef-admin | NO |
| 18 | Menu item options/customizations | UNWIRED | HIGH | chef-admin, apps/web | NO |
| 19 | Delivery zones configuration | UNWIRED | MEDIUM | chef-admin | NO |
| 20 | Duplicate order confirmation routes | PARTIAL | LOW | apps/web | NO |

---

## Detailed Items

### Item 1: Chef Storefront Creation Dead-End

**Category**: BROKEN — FIXED in prior audit
**Severity**: HIGH (was blocking chef onboarding)
**App**: `apps/chef-admin`

**Prior state**: New chefs who completed registration were shown "No storefront found" with no path to create one. The storefront was a prerequisite for listing dishes but could not be created from the UI.

**Fix applied**: Storefront creation flow now exists. `apps/chef-admin/src/app/storefront/page.tsx` shows a creation form when no storefront exists and calls the storefront orchestrator on submit.

**Status**: RESOLVED. No further action needed.

---

### Item 2: Ops-Admin Analytics Page — Fake Data

**Category**: PLACEHOLDER
**Severity**: HIGH
**App**: `apps/ops-admin`
**File**: `apps/ops-admin/src/app/analytics/page.tsx`

The analytics page renders charts and metrics. The data feeding these charts is placeholder/hardcoded:

- Revenue chart data is a hardcoded array of week-over-week values
- Order volume by cuisine chart uses static sample data
- "Top performing chefs" table is hardcoded with example names
- Conversion funnel metrics are static percentages

The `get_ops_dashboard_stats` RPC function returns some real stats (used on the dashboard page), but the analytics page does not call this function. It does not call any API at all.

**Impact**: Ops managers are making decisions based on fake data.

**Fix required**: Wire analytics page to real data sources. Define additional RPC functions or API routes for time-series data. Replace all hardcoded values.

---

### Item 3: Ops-Admin Map Page — Non-Production

**Category**: PLACEHOLDER
**Severity**: MEDIUM
**App**: `apps/ops-admin`
**File**: `apps/ops-admin/src/app/map/page.tsx`

The ops map page renders a Leaflet map with driver markers. Issues:

- Driver locations shown are real (from `driver_presence` table) but refreshed only on page load
- No realtime location streaming
- No order/delivery overlay on the map
- No click-to-assign functionality
- Marker clustering not implemented (will visually degrade with many drivers)
- Map tiles use default OSM (no custom style)

**Impact**: Map is visually present but operationally useless for dispatch decisions.

**Fix required**: Add Realtime subscription for driver location updates, delivery overlays, and assignment interaction.

---

### Item 4: 22 Database Tables Unreferenced

**Category**: UNWIRED
**Severity**: HIGH
**Package**: `@ridendine/db`, All apps

Full list documented in `08-data-model-and-db-usage.md`. The 22 tables are:

`chef_documents`, `chef_availability`, `chef_delivery_zones`, `chef_payouts`, `menu_item_options`, `menu_item_option_values`, `menu_item_availability`, `driver_documents`, `driver_vehicles`, `driver_shifts`, `driver_earnings`, `driver_payouts`, `payout_runs`, `delivery_assignments`, `favorites`, `domain_events`, `sla_timers`, `kitchen_queue_entries`, `ops_override_logs`, `storefront_state_changes`, `system_alerts`, `audit_logs`

**Impact**: Schema represents planned features; running application does not use them. Data from these tables is never created, read, or displayed.

**Fix required**: Either implement the features (with repositories, orchestrators, and UI) or drop the tables to reduce schema complexity.

---

### Item 5: 6 of 8 RPC Functions Never Called

**Category**: UNWIRED
**Severity**: MEDIUM
**Package**: `@ridendine/db`

Unused RPC functions:
- `get_driver_proximity_score`
- `get_chef_earnings_summary`
- `get_storefront_metrics`
- `get_platform_health_check`
- `calculate_delivery_fee`
- `get_active_sla_violations`

Application code implements approximate versions of some of these (delivery fee, driver proximity) in TypeScript. The database-side functions are more efficient but never called.

**Fix required**: Call these functions from repositories or orchestrators. Remove TypeScript duplicates.

---

### Item 6: Email Notifications — Templates Exist, No Sending

**Category**: UNWIRED
**Severity**: CRITICAL
**Package**: `@ridendine/notifications`
**File**: `packages/notifications/src/templates/` (multiple files)

Email templates exist as React Email components:
- `OrderConfirmation.tsx`
- `ChefApproval.tsx`
- `DriverApproval.tsx`
- `OrderStatusUpdate.tsx`

`RESEND_API_KEY` is in `.env.example`. The Resend SDK is not called anywhere.

**Impact**: Customers receive no order confirmation emails. Chefs and drivers receive no approval/rejection notifications. This is a production-blocking gap.

**Fix required**: Install `resend` package. Create `packages/notifications/src/sender.ts` that calls `resend.emails.send()`. Add send calls to the relevant engine orchestrators (order creation, chef approval, driver approval).

---

### Item 7: Push Notifications — Subscription Works, Sending Does Not

**Category**: UNWIRED
**Severity**: HIGH
**App**: `apps/web`, `apps/driver-app`
**File**: `apps/web/src/app/api/push/subscribe/route.ts`

The subscribe endpoint accepts browser push subscription objects and stores them in `push_subscriptions`. This works.

No code anywhere sends a push notification. The `web-push` npm package is not installed. VAPID keys are not configured.

**Impact**: Driver app cannot receive background alerts for new delivery offers. Customer push notifications for order updates do not exist.

**Fix required**: Install `web-push`. Configure VAPID keys. Create a push sending utility. Trigger pushes from engine orchestrators on delivery assignment and order status changes.

---

### Item 8: Mock Stripe Refund IDs

**Category**: PLACEHOLDER
**Severity**: CRITICAL
**App**: `apps/ops-admin`
**File**: `apps/ops-admin/src/app/api/refunds/route.ts`

```typescript
// Found in refund processing route:
const refundId = `mock_refund_${Date.now()}`;
// Stripe refund API is NOT called
```

When ops agents process a refund through the ops-admin interface, the `refund_cases` table is updated with a mock ID. No actual Stripe refund is created. Customers are not refunded.

**Impact**: Customers who receive "refund approved" status are not actually refunded. This is a financial integrity and legal compliance issue.

**Fix required**: Implement actual Stripe refund via `stripe.refunds.create({ payment_intent: order.paymentIntentId, amount: refundAmount })`. Store real Stripe refund ID.

---

### Item 9: Driver Earnings Hours Always Returns 0

**Category**: UNWIRED
**Severity**: MEDIUM
**App**: `apps/driver-app`
**File**: `apps/driver-app/src/app/earnings/page.tsx` (or similar)

The driver earnings page displays total earnings, number of deliveries, and hours worked. The hours worked calculation returns 0 for all drivers. The `driver_shifts` table (which would track shift start/end times) is never referenced in code.

**Impact**: Drivers see incorrect earnings data. Hours-based metrics are useless.

**Fix required**: Implement shift tracking using `driver_shifts` table. Calculate hours from shift records. Wire `driver_earnings` table to record per-delivery earnings.

---

### Item 10: Driver Location Shows Hardcoded City

**Category**: UNWIRED
**Severity**: MEDIUM
**App**: `apps/driver-app`

The driver dashboard shows the driver's current location/city as "Hamilton, ON" regardless of actual GPS location. The display string is hardcoded.

**Evidence**: `apps/driver-app/src/app/dashboard/page.tsx` contains a hardcoded string for location display.

**Impact**: Drivers see incorrect location context. Useless for multi-city rollout.

**Fix required**: Resolve driver's geolocation to city/area using reverse geocoding or by parsing the stored `driver_presence` coordinates.

---

### Item 11: Chef Reviews Page — No Error Handling

**Category**: BROKEN
**Severity**: MEDIUM
**App**: `apps/chef-admin`
**File**: `apps/chef-admin/src/app/reviews/page.tsx`

The reviews page fetches review data but has no error boundary or error state handling. If the fetch fails (network error, auth expiry, empty state), the page renders a blank screen or throws an uncaught exception.

**Fix required**: Add try/catch or React error boundary. Use the shared `ErrorState` component from `@ridendine/ui`.

---

### Item 12: PasswordStrength Component — Dead Code

**Category**: DEAD CODE
**Severity**: LOW
**App**: `apps/chef-admin`
**File**: `apps/chef-admin/src/components/auth/PasswordStrength.tsx`

`PasswordStrength` component is defined and imported in the registration page but never rendered. The import statement exists; the JSX element does not appear in the render output.

**Fix required**: Either render the component in the registration form, or remove the import and file.

---

### Item 13: Favorites — Table Exists, No CRUD

**Category**: UNWIRED
**Severity**: MEDIUM
**App**: `apps/web`

The `favorites` table is defined in the database schema with `customer_id` and `chef_storefront_id` columns. No API routes exist for:
- `POST /api/favorites` (add favorite)
- `DELETE /api/favorites/:id` (remove favorite)
- `GET /api/favorites` (list favorites)

No UI elements (heart icon, favorites page) exist in the web app.

**Fix required**: Create favorites repository, API routes, and UI elements (favorite button on storefront card, favorites page in customer account).

---

### Item 14: Realtime Subscriptions — Minimal

**Category**: PARTIAL
**Severity**: HIGH
**App**: All apps

Only `apps/chef-admin` orders list uses a Supabase Realtime subscription. All other real-time-needing surfaces rely on manual refresh or polling:

- Driver delivery offers: no push or realtime (must refresh manually)
- Ops order board: no realtime (must refresh manually)
- Customer order tracking: 15-second polling (not true realtime)
- Driver location on customer tracking: 15-second polling

**Fix required**: Add Realtime subscriptions to driver-app (delivery offers), ops-admin (order board), and web app (order status changes, driver location).

---

### Item 15: Chef Document Verification Flow

**Category**: UNWIRED
**Severity**: HIGH
**App**: `apps/chef-admin`, `apps/ops-admin`

The `chef_documents` table is designed to hold identity/certification documents uploaded by chefs. The ops team would then review and approve/reject them as part of chef onboarding.

Neither the upload flow (chef-admin) nor the review flow (ops-admin) is implemented. No file upload UI exists. No document review queue exists in ops-admin.

**Fix required**: Implement file upload to Supabase Storage in chef-admin. Create document review UI in ops-admin. Wire approval status to chef onboarding flow.

---

### Item 16: Driver Document Verification Flow

**Category**: UNWIRED
**Severity**: HIGH
**App**: `apps/driver-app`, `apps/ops-admin`

Same pattern as chef documents. `driver_documents` and `driver_vehicles` tables exist. No upload UI, no review flow.

**Fix required**: Same approach as chef documents.

---

### Item 17: Chef Availability/Schedule Management

**Category**: UNWIRED
**Severity**: MEDIUM
**App**: `apps/chef-admin`

`chef_availability` table is designed to store a chef's operating hours (days of week, time windows). The chef-admin app has no schedule management page. Storefronts have no displayed hours. No availability-based order blocking exists.

**Fix required**: Create schedule management UI in chef-admin. Display hours on storefront in web app. Block orders outside available hours in checkout engine.

---

### Item 18: Menu Item Options/Customizations

**Category**: UNWIRED
**Severity**: HIGH
**App**: `apps/chef-admin`, `apps/web`

`menu_item_options` and `menu_item_option_values` tables support structured item customization (e.g., "Size: Small/Medium/Large", "Spice level: Mild/Hot/Extra Hot"). The tables are never populated or read.

Customers cannot customize orders. `order_item_modifiers` table exists and is referenced in order code, but the source option values that feed it are never created.

**Fix required**: Add option group management to menu item CRUD in chef-admin. Render option selectors in the item detail/add-to-cart flow in web app. Pass selected values to order creation.

---

### Item 19: Delivery Zones Configuration

**Category**: UNWIRED
**Severity**: MEDIUM
**App**: `apps/chef-admin`

`chef_delivery_zones` table is designed to let chefs define the geographic radius or polygon within which they will deliver. No UI exists for this configuration.

Currently, no delivery zone enforcement exists in the order flow. Customers from any distance can theoretically place orders with any chef.

**Fix required**: Create delivery zone configuration UI in chef-admin (map-based radius or postal code list). Enforce zone check at checkout in the web app.

---

### Item 20: Duplicate Order Confirmation Routes

**Category**: PARTIAL
**Severity**: LOW
**App**: `apps/web`

Two routes exist that both show order confirmation:
- `apps/web/src/app/order-confirmation/[orderId]/page.tsx`
- `apps/web/src/app/orders/[id]/confirmation/page.tsx`

After checkout, the user is redirected to `/order-confirmation/[orderId]`. The second route under `/orders/` also exists and renders similar (but not identical) content. It is unclear which is canonical.

**Impact**: Code maintenance confusion, potential divergence in displayed data.

**Fix required**: Determine canonical route. Remove or redirect the duplicate. Consolidate confirmation page logic.
