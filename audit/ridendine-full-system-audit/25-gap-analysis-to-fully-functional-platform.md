# 25 - Gap Analysis: Current State to Fully Functional Platform

**Audit Date**: 2026-04-23
**Purpose**: Comprehensive inventory of everything missing or broken relative to a production-ready food delivery marketplace
**Organization**: Gaps grouped by criticality and category

---

## Reading This Document

Each gap includes:
- **Description**: What is missing or broken
- **Current state**: What exists today (if anything)
- **Impact**: Who is affected and how
- **Effort**: Rough estimate (S = hours, M = days, L = week+)
- **Dependency**: What must be done first (if any)

---

## CRITICAL GAPS (Block Production Deployment)

These gaps make the platform unsafe or non-functional for real users and real money.

---

### CG-1: No Email Notifications

**Description**: The platform has no email sending capability. `@ridendine/notifications` defines templates but sends nothing.

**Current state**: Template files exist. `RESEND_API_KEY` is in env as optional (commented out). No `send()` implementation.

**Impact**: Customers receive no order confirmation, chefs receive no new order alerts, drivers receive no offer notifications, chefs and drivers receive no approval/rejection emails. The entire communication layer is silent.

**Affected flows**:
- Order created → customer confirmation (missing)
- Order accepted → customer notification (missing)
- Order ready → customer notification (missing)
- Order delivered → customer notification (missing)
- Chef approved/rejected → chef email (missing)
- Driver approved/rejected → driver email (missing)
- Refund processed → customer email (missing)

**Effort**: M (2-3 days to integrate Resend + wire all trigger points)
**Dependency**: None - can be done immediately

---

### CG-2: Mock Stripe Refund Processing

**Description**: The ops-admin refund flow stores a hardcoded mock Stripe refund ID instead of calling the real Stripe refund API. Customer money is not returned.

**Current state**: Code exists that generates `"mock_refund_id_..."` string and stores it as if a refund occurred.

**Impact**: Customers who receive a refund approval never actually get their money back. This is a financial and regulatory risk. Chargebacks will increase.

**Effort**: S (half day - replace mock with real `stripe.refunds.create()` call)
**Dependency**: None - Stripe SDK is already integrated

---

### CG-3: Auth Bypass Security Risk

**Description**: `BYPASS_AUTH` environment variable allows unauthenticated access to all protected routes.

**Current state**: `BYPASS_AUTH=true` in development env files. If this value is ever set in a staging or production environment (accidentally or maliciously), all role-based access control is defeated.

**Impact**: Complete auth bypass if env var leaks to production. Any user can access any role's data.

**Effort**: S (1-2 hours to remove all references)
**Dependency**: None - remove immediately

---

### CG-4: No Test Coverage

**Description**: ~3% test coverage across all apps. Engine has partial coverage. No tests in 3 of 4 apps. 0 repository tests.

**Current state**: 4 test files in web, 3 in engine.

**Impact**: Every change to the codebase is high-risk. Bugs ship undetected. Cannot safely refactor or add features.

**Effort**: L (4-6 weeks to reach 80% coverage across all apps and packages)
**Dependency**: CI/CD must exist to enforce coverage gates (CG-5)

---

### CG-5: No CI/CD Pipeline

**Description**: No automated build, test, or deployment pipeline. All deploys are manual.

**Current state**: GitHub repository exists. No GitHub Actions workflows. No deploy automation.

**Impact**: Regressions ship without detection. Developers cannot safely collaborate. Every deployment is a manual risk event.

**Effort**: M (2-3 days for basic CI/CD, 1 week for full pipeline)
**Dependency**: None - can be done immediately

---

## HIGH GAPS (Degrade User Experience Significantly)

These gaps don't block deployment but make the platform materially worse than competitors.

---

### HG-1: No Real-Time Order Status Updates for Customers

**Description**: Customers viewing their order tracking page must manually refresh to see status changes.

**Current state**: Order status page shows current status from initial page load. No Supabase subscription wired.

**Impact**: Customer anxiety, poor experience, excessive support tickets asking "where is my food?"

**Effort**: S (1 day to wire Supabase subscription on orders table in customer app)

---

### HG-2: No Push Notifications for Chef (New Orders)

**Description**: Chefs receive no notification when a new order arrives. They must keep the dashboard open and watch for orders.

**Current state**: No push notification service configured. No browser notification permission requested.

**Impact**: Orders missed. Auto-reject timeout (which itself is MISSING - see HG-6) would reject all orders placed when chef is not actively watching screen.

**Effort**: M (2-3 days for web push via service worker + chef-admin integration)

---

### HG-3: No Push Notifications for Driver (Delivery Offers)

**Description**: Drivers receive no notification when a delivery offer arrives. They must keep the driver app open.

**Current state**: No push notification capability in driver-app.

**Impact**: Offers expire (when timeout is implemented). Dispatch engine must skip to next driver. Inefficient dispatch.

**Effort**: M (2-3 days - can share implementation with HG-2)

---

### HG-4: No Pagination on List Views

**Description**: All list views (orders, chefs, drivers, ledger entries, support tickets) load all records without pagination.

**Current state**: Repository list methods have no LIMIT/OFFSET. API responses have no meta/pagination.

**Impact**: Queries will time out as data grows. Pages become unusable at scale. Supabase has default 1000-row limit which will silently truncate results.

**Effort**: M (3-4 days to add pagination to all repositories, API routes, and UI)

---

### HG-5: No Address Geocoding or Validation

**Description**: Delivery address entered at checkout is stored as free-text. No geocoding to coordinates. No address validation.

**Current state**: Address form with text fields. No Google Maps Places API integration.

**Impact**: Incorrect addresses accepted. Driver cannot navigate to invalid addresses. Dispatch engine cannot calculate real distances.

**Effort**: M (2-3 days - requires Google Maps API key + Places autocomplete integration)
**Dependency**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` env var (currently commented out)

---

### HG-6: No Auto-Reject Timeout for Chef (8-minute window)

**Description**: If a chef does not accept or reject an order within 8 minutes, the order should auto-reject and customer should be notified. No scheduler implements this.

**Current state**: Engine has timeout constant defined. No cron job, edge function, or background worker executes the timeout.

**Impact**: Orders sit in pending state indefinitely. Customer waits forever. Order is never fulfilled.

**Effort**: M (1-2 days - implement as Supabase Edge Function cron or Vercel cron)

---

### HG-7: No Auto-Decline Timeout for Driver Offer (30-second window)

**Description**: Driver offers should expire after 30 seconds and the dispatch engine should try the next driver.

**Current state**: Timeout constant defined. No timer implementation.

**Impact**: If driver does not respond, delivery is never assigned. Order sits ready but undelivered.

**Effort**: M (1 day - can use same scheduler approach as HG-6)

---

### HG-8: Chef Analytics Uses Client-Side Calculation

**Description**: Chef earnings and analytics are calculated on the client side from raw data, not server-side aggregations.

**Current state**: Likely fetching all ledger entries and summing client-side.

**Impact**: Slow page loads, incorrect totals if data exceeds page size (due to no pagination), security risk if raw financial data is exposed unnecessarily.

**Effort**: S (1 day - move aggregation to server-side repository methods or Supabase views)

---

### HG-9: No File Upload for Chef Profile / Menu Images

**Description**: Chefs cannot upload profile photos or menu item images through the UI.

**Current state**: File input components may exist but Supabase Storage upload is not wired.

**Impact**: Chef storefronts have no images. Customer browse experience is poor. Platform looks unprofessional.

**Effort**: M (2-3 days - wire Supabase Storage upload in chef-admin onboarding and menu forms)

---

### HG-10: Driver Location Hardcoded

**Description**: Driver app sends hardcoded coordinates instead of real GPS position from device.

**Current state**: Static lat/lng values used for driver location.

**Impact**: Dispatch engine cannot find nearby drivers accurately. All drivers appear at same location. Delivery ETA is meaningless.

**Effort**: S (1 day - replace with `navigator.geolocation.getCurrentPosition()` and periodic location updates)

---

### HG-11: No Monitoring or Error Tracking

**Description**: No Sentry, no structured logging, no uptime monitoring. Production failures are invisible.

**Current state**: `console.log` throughout. No error tracking service. No health check endpoints.

**Impact**: Production incidents discovered by users, not the team. No way to diagnose failures after the fact.

**Effort**: S (1 day for Sentry + health checks, M for full structured logging)

---

### HG-12: No Backup/Recovery Plan

**Description**: No documented backup schedule, no tested restore procedure, no RTO/RPO defined.

**Current state**: Supabase automated backups exist (free tier: 7 days, Pro: 30 days) but no explicit documentation or testing.

**Impact**: Data loss risk. No confidence in recovery time if database is corrupted or accidentally deleted.

**Effort**: S (1 day to document and test restore procedure)

---

## MEDIUM GAPS (Missing Features)

These gaps limit platform functionality but do not break core flows.

---

### MG-1: No Favorites Management

**Description**: Customers cannot save favorite chefs/storefronts for quick reordering.

**Current state**: Heart icon button may exist in UI. No repository methods. No API routes. No favorites page.

**Effort**: S (1 day - table likely exists, wire CRUD)

---

### MG-2: No Menu Item Customizations (Options/Modifiers)

**Description**: Customers cannot specify options for menu items (e.g., "extra spicy", "no onions", gluten-free version).

**Current state**: Data model may support options, UI and API do not.

**Impact**: Limited order customization. Chefs cannot offer variants.

**Effort**: M (2-3 days for data model + UI + order total recalculation)

---

### MG-3: No Chef Availability/Schedule Management

**Description**: Chefs cannot set operating hours or mark themselves as unavailable. Storefronts appear available 24/7.

**Current state**: Hours field exists in storefront form. Logic to hide/disable storefronts based on hours is missing.

**Effort**: M (2-3 days for hours configuration + storefront availability logic)

---

### MG-4: No Delivery Zone Configuration

**Description**: Chefs cannot set a delivery radius or zone. Orders can be placed from any distance.

**Current state**: No delivery zone field in storefront. No radius check in order creation.

**Impact**: Drivers may be assigned deliveries that are impossibly far. Chef cannot manage delivery scope.

**Effort**: M (2-3 days - delivery radius field + check at order creation)

---

### MG-5: No Driver Document Verification UI

**Description**: Ops admin has no way to review driver license, insurance, or vehicle documents.

**Current state**: Drivers can submit applications but there is no document viewer in ops-admin.

**Impact**: Ops cannot safely approve drivers without seeing documents. Compliance risk.

**Effort**: S (1 day for document list + viewer in ops-admin, assuming Supabase Storage upload is wired)

---

### MG-6: No Promo Code Management UI

**Description**: Ops admin cannot create, edit, or deactivate promo codes through the UI.

**Current state**: Promo codes may exist in DB but there is no CRUD UI in ops-admin.

**Effort**: S-M (1-2 days for promo code management page in ops-admin)

---

### MG-7: No Customer Review Prompts

**Description**: Customers are not prompted to leave a review after order delivery.

**Current state**: Review form may exist. No post-delivery email or in-app prompt.

**Impact**: Low review volume. Chef ratings lack data. Platform trust signals weak.

**Effort**: S (half day - trigger review prompt email in delivery completion flow)

---

### MG-8: No Customer Refund/Dispute Request Flow

**Description**: Customers cannot directly request a refund. They must contact support via a form, which then creates a ticket, which then ops admin manually creates a refund case.

**Current state**: Support ticket form exists. No direct "request refund" button on order page.

**Impact**: Friction for legitimate refunds. Increased support ticket volume.

**Effort**: S-M (1-2 days for refund request button on order page + auto-create refund case)

---

### MG-9: No Webhook Idempotency

**Description**: Stripe webhook handler can process the same event twice if it times out and Stripe retries.

**Current state**: No idempotency key check before processing webhook events.

**Impact**: Duplicate order submissions, duplicate ledger entries, double notifications.

**Effort**: S (half day - add `webhook_events` table check before processing)

---

### MG-10: Audit Log UI Missing

**Description**: `audit_logs` table exists and engine writes to `domain_events`, but ops admin cannot query these logs.

**Current state**: Data is written but never exposed in any UI.

**Impact**: Cannot investigate disputes, compliance issues, or suspicious activity.

**Effort**: S-M (1-2 days for audit log page in ops-admin)

---

### MG-11: Fee Configuration Not in Database

**Description**: Service fee (8%), HST (13%), and delivery base fee ($5) are hardcoded in engine constants.

**Current state**: Constants in engine source code.

**Impact**: Any fee change requires code deployment. Cannot A/B test pricing. Cannot apply regional tax rates.

**Effort**: M (1-2 days - move to `platform_settings` table + ops-admin UI)

---

### MG-12: No Chef Payout Banking Details

**Description**: Chefs cannot enter banking information for payouts. There is no payout disbursement integration.

**Current state**: Payout request flow may exist. No banking details form. No Stripe Connect or bank transfer integration.

**Impact**: Chefs cannot receive money. Platform cannot operate commercially.

**Effort**: L (1-2 weeks - Stripe Connect integration for chef payouts is a significant feature)

---

## LOW GAPS (Nice to Have)

These gaps do not affect core functionality but would improve the platform quality.

---

### LG-1: No Dark Mode

**Description**: All apps use light mode only. No CSS dark mode support.

**Effort**: M (2-3 days for Tailwind dark mode classes throughout)

---

### LG-2: No Internationalization (i18n)

**Description**: All text is hardcoded English. No translation support.

**Effort**: L (1-2 weeks for i18n library integration + translation extraction)

---

### LG-3: No Accessibility Audit

**Description**: No ARIA labels audited, no keyboard navigation tested, no screen reader testing.

**Effort**: M (2-3 days for audit and fixes)

---

### LG-4: No SEO Optimization

**Description**: Customer-facing pages (chef storefronts, menu items) have no structured data, no Open Graph tags, and limited meta descriptions.

**Effort**: S-M (1-2 days for meta tags + JSON-LD structured data on storefront pages)

---

### LG-5: No Image Optimization for Menu Items

**Description**: Menu item images are not served with responsive sizes or WebP format.

**Effort**: S (half day - use Next.js `<Image>` component with Supabase Storage URL)

---

### LG-6: No Order Search or Filtering for Customers

**Description**: Customer order history shows all orders without search or date filter.

**Effort**: S (1 day)

---

### LG-7: No Chef-to-Customer Messaging

**Description**: Chefs cannot communicate with customers (e.g., "substituting ingredient X").

**Effort**: L (significant feature - real-time chat or at minimum push notification from chef)

---

### LG-8: No Tip Support

**Description**: Customer cannot add a tip at checkout.

**Effort**: S-M (1-2 days for tip UI at checkout + tip included in driver payout calculation)

---

## Gap Summary by Criticality

| Criticality | Count | Estimated Total Effort |
|-------------|-------|----------------------|
| Critical (CG) | 5 | 6-8 weeks |
| High (HG) | 12 | 8-12 weeks |
| Medium (MG) | 12 | 8-12 weeks |
| Low (LG) | 8 | 4-6 weeks |
| **Total** | **37** | **26-38 weeks** |

**Note**: These estimates assume a single full-stack engineer. A team of 3-4 can parallelize significantly.

---

## Gap Priority Matrix

```
                    EFFORT
              Small    Medium    Large
             ┌────────┬─────────┬──────┐
HIGH IMPACT  │ CG-3   │ CG-1    │ CG-4 │
             │ CG-2   │ HG-1    │ CG-5 │
             │ HG-10  │ HG-4    │      │
             │        │ HG-6    │      │
             │        │ HG-7    │      │
             │        │ HG-9    │      │
             ├────────┼─────────┼──────┤
MED IMPACT   │ MG-1   │ MG-2    │ MG-12│
             │ MG-7   │ MG-3    │      │
             │ MG-9   │ MG-4    │      │
             │ MG-10  │ MG-6    │      │
             │ HG-12  │ MG-11   │      │
             ├────────┼─────────┼──────┤
LOW IMPACT   │ LG-4   │ LG-1    │ LG-2 │
             │ LG-5   │ LG-3    │ LG-7 │
             │ LG-6   │ LG-8    │      │
             └────────┴─────────┴──────┘

Start top-left (high impact, small effort) and work right and down.
```

---

## Recommended Delivery Sequence

For a team wanting to reach a launchable MVP:

**Month 1**: CG-3, CG-2, CG-5, CG-1, HG-11, MG-9 (security + notifications + CI/CD)
**Month 2**: HG-1, HG-6, HG-7, HG-10, HG-4, CG-4 begins (real-time + timeouts + GPS)
**Month 3**: HG-9, MG-1, MG-7, MG-5, MG-6, HG-2, HG-3 (polish + chef payouts begins)
**Month 4**: MG-12 (Stripe Connect for payouts), CG-4 continues, HG-5, MG-11
**Month 5+**: Medium/Low gaps based on user feedback

**Launch blocker check**: CG-1 through CG-5 must ALL be resolved before first real-money transaction with real customers.

---

## Related Files

- `18-risk-register.md` - Risk framing of the same gaps
- `19-priority-fix-roadmap.md` - 12-week execution plan
- `22-payment-order-dispatch-lifecycle.md` - Lifecycle gaps in detail
- `23-user-role-journey-map.md` - Per-role journey gaps
