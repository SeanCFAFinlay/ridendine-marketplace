# Risks

Top risks identified in the Ridendine system audit with severity ratings and mitigation guidance.

Related: [[Home]] | [[Apps]] | [[APIs]] | [[Database]] | [[Integrations]] | [[Merge-Plan]]

---

## CRITICAL (Must Fix Before Production)

### bypass-auth
**Severity**: CRITICAL
**Affected**: All 4 apps - [[Apps#web]], [[Apps#chef-admin]], [[Apps#ops-admin]], [[Apps#driver-app]]
**Type**: Security

#### Problem
All 4 middleware files contain:
```typescript
const bypassAuth =
  process.env.NODE_ENV === 'development' ||
  (process.env.VERCEL_ENV !== 'production' && process.env.BYPASS_AUTH === 'true');
if (bypassAuth) return NextResponse.next();
```
Any developer running locally, or any preview Vercel deployment, has zero auth enforcement. No role checks are performed. If a preview deployment URL is shared or indexed, ops-admin and chef-admin are fully exposed.

#### Mitigation
- Remove `NODE_ENV === 'development'` bypass immediately
- Replace with conditional logging only
- Add role checks even in dev (with test credentials)
- Audit all `BYPASS_AUTH` usages across the monorepo

---

### test-coverage
**Severity**: CRITICAL
**Affected**: All apps and packages
**Type**: Quality / Reliability

#### Problem
Only 7 test files exist across the entire codebase:
- `apps/web/__tests__/api/support/` (1 file)
- `apps/web/__tests__/auth/` (3 files)
- `packages/engine/src/orchestrators/` (4 files)

Core business flows (checkout, order acceptance, dispatch, refunds) have no regression tests. Any refactor risks breaking the payment flow silently.

#### Mitigation
- Target 80% overall coverage, 90% for `@ridendine/engine`
- Priority order: engine orchestrators → API routes → middleware
- Add integration tests for the full order flow (happy path + failure cases)

---

### notification-gaps
**Severity**: CRITICAL
**Affected**: [[Apps#chef-admin]], [[Apps#driver-app]]
**Type**: Operational

#### Problem
- Chef dashboard has no real-time push for new orders - chefs must manually refresh
- Driver app has no push notifications for new delivery offers
- `@ridendine/notifications` has templates but no confirmed email delivery provider
- No SMS or push notification channel implemented

#### Mitigation
- Wire Supabase real-time subscription to chef order queue
- Implement Web Push API for driver app (PWA)
- Select and configure email provider (Resend recommended)
- Test notification delivery in staging

---

## HIGH (Fix Within 2 Weeks)

### realtime-missing
**Severity**: HIGH
**Affected**: [[Apps#chef-admin]]
**Type**: Operational

#### Problem
Chef dashboard (`/dashboard/orders`) uses polling or static load. New orders do not appear without a page refresh. This creates operational delays in order acceptance, which directly impacts customer experience.

#### Mitigation
- Add Supabase real-time subscription on `orders` table filtered by `storefront_id`
- Show toast/badge when new order arrives
- Auto-refresh order queue UI on new order event

---

### live-map-placeholder
**Severity**: HIGH
**Affected**: [[Apps#ops-admin]]
**Type**: Missing Feature

#### Problem
The `/dashboard/map` page in ops-admin is a placeholder with no real implementation. Ops cannot see driver locations in real-time, making dispatch monitoring impossible during peak hours.

#### Mitigation
- Integrate Mapbox GL or Google Maps
- Subscribe to `driver_presence` and `driver_locations` via Supabase real-time
- Render driver positions with delivery assignment overlays

---

### stripe-connect-not-wired
**Severity**: HIGH
**Affected**: [[Apps#chef-admin]], [[Apps#ops-admin]]
**Type**: Financial

#### Problem
Chef payout accounts exist in `chef_payout_accounts` with `stripe_account_id` field, and `payout_runs` table exists, but the actual Stripe Connect disbursement logic is not implemented. Chefs cannot receive earnings.

#### Mitigation
- Implement Stripe Connect onboarding flow in chef-admin
- Wire `payout_runs` batch processing in ops-admin
- Test with Stripe Connect sandbox accounts

---

### schema-drift
**Severity**: HIGH
**Affected**: [[Database]]
**Type**: Data Integrity

#### Problem
The documentation references 36 tables, but detailed domain counts yield 41. Migrations may have added tables not reflected in `@ridendine/types` generated types. Type generation (`pnpm db:generate`) must be run after every migration.

#### Mitigation
- Run `pnpm db:generate` and audit diff
- Add `db:generate` as a required CI step
- Document all table counts in a single source of truth

---

## MEDIUM (Fix Within 1 Month)

### no-pagination
**Severity**: MEDIUM
**Affected**: [[Apps#ops-admin]], [[Apps#web]]
**Type**: Performance / UX

#### Problem
Order lists, customer lists, and chef browse have no pagination or infinite scroll. As data grows, these pages will become slow and unusable.

#### Mitigation
- Implement cursor-based pagination in Supabase queries
- Add `limit` and `cursor` query params to list APIs
- Use Intersection Observer for infinite scroll on browse page

---

### driver-history-placeholder
**Severity**: MEDIUM
**Affected**: [[Apps#driver-app]]
**Type**: Missing Feature

#### Problem
The `/history` page in driver-app is a placeholder. Drivers cannot review past deliveries or earnings history.

#### Mitigation
- Implement `GET /api/history` API backed by `driver_earnings` + `deliveries`
- Build history list UI in driver-app

---

### missing-apis
**Severity**: MEDIUM
**Affected**: [[APIs]]
**Type**: Missing Feature

#### Problem
Two API routes are missing backing implementations:
- Review submission (`POST /api/orders/[id]/review`) - reviews table exists but no API route
- Driver history (`GET /api/history`) - page exists but no API

#### Mitigation
- Implement both routes within 1 sprint
- Add validation via `@ridendine/validation`

---

### analytics-incomplete
**Severity**: MEDIUM
**Affected**: [[Apps#chef-admin]], [[Apps#ops-admin]]
**Type**: Missing Feature

#### Problem
Analytics pages exist but charts are incomplete. Chefs cannot see meaningful earnings trends. Ops cannot see platform-wide metrics.

#### Mitigation
- Define key metrics for each role (chef: revenue, orders, ratings; ops: GMV, fulfillment rate)
- Implement aggregation queries in engine
- Integrate a charting library (Recharts or Chart.js)

---

## LOW (Backlog)

### no-push-notifications
**Severity**: LOW (for now)
**Affected**: [[Apps#driver-app]], [[Apps#web]]
**Type**: UX Enhancement

No Web Push API implementation. Drivers and customers do not get background notifications. This becomes MEDIUM once volume increases.

---

### no-offline-pwa
**Severity**: LOW
**Affected**: [[Apps#driver-app]]
**Type**: UX Enhancement

Driver app is labeled as PWA but has no offline caching (service worker not configured). Drivers lose connectivity in transit.

---

### promo-codes-not-wired
**Severity**: LOW
**Affected**: [[Apps#web]], [[Database#promo-codes]]
**Type**: Missing Feature

`promo_codes` table exists but there is no API or UI to apply promo codes at checkout.

---

## Risk Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 4 |
| MEDIUM | 4 |
| LOW | 3 |
| **Total** | **14** |
