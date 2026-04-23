# 10 - Integration Map

**Audit Date**: 2026-04-23
**Scope**: All external service integrations, their status, and gaps
**Status**: PARTIALLY INTEGRATED - 3 of 7 integrations fully working; email and push notifications are entirely unwired

---

## Table of Contents

1. [Integration Status Overview](#integration-status-overview)
2. [Supabase](#supabase)
3. [Stripe](#stripe)
4. [Google Maps](#google-maps)
5. [Resend (Email)](#resend-email)
6. [Push Notifications](#push-notifications)
7. [PostGIS](#postgis)
8. [Vercel](#vercel)
9. [Missing Integrations](#missing-integrations)
10. [Environment Variable Audit](#environment-variable-audit)

---

## Integration Status Overview

| Integration | Purpose | Status | Blocker |
|------------|---------|--------|---------|
| Supabase | Auth, DB, Storage, Realtime | WORKING (partial Realtime) | Realtime underused |
| Stripe | Payments + Connect | PARTIALLY WORKING | Mock refund IDs in ops-admin |
| Google Maps | Address/map display | NOT USED (replaced by Leaflet) | Commented out |
| Resend | Transactional email | NOT WIRED | No sending code |
| Push Notifications | Browser push | NOT WIRED | No sending code |
| PostGIS | Geospatial queries | WORKING | — |
| Vercel | Deployment | CONFIGURED | — |

---

## Supabase

**Status**: WORKING (Realtime is partially used)

### Auth

- Email/password authentication fully functional
- Session management via `@supabase/ssr` cookie helpers
- All 4 apps create server-side Supabase clients for SSR
- `packages/auth` wraps Supabase Auth for consistent session access

### Database

- PostgreSQL backend, all 56 tables accessible
- `packages/db/src/repositories/` provides typed repository pattern
- Supabase JS client v2 used throughout
- Server-side queries use service role key; client-side uses anon key

### Storage

- Supabase Storage bucket configured (`ridendine-assets`)
- Storage client available in `packages/db/src/storage.ts`
- **Gap**: No file upload UI exists in any app. Storage is ready but unused

### Realtime

Supabase Realtime subscriptions are available but minimally used:

| App | Component | Subscription | Type |
|-----|-----------|-------------|------|
| `apps/chef-admin` | orders-list | `orders` table changes | `postgres_changes` |
| `apps/web` | order tracking | `driver_presence` | Polling (not realtime) |
| `apps/ops-admin` | — | None | — |
| `apps/driver-app` | — | None | — |

The web app's order tracking page polls `driver_presence` every 15 seconds instead of using a Realtime subscription. This creates unnecessary load and adds 0-15 second latency to location updates.

### Configuration

| Key | Used In |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | All 4 apps |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All 4 apps (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | All 4 apps (server-side API routes) |

---

## Stripe

**Status**: PARTIALLY WORKING

### What Works

**Payment processing** (customer checkout):
- `PaymentIntent` created server-side via engine
- Stripe Elements embedded in checkout page (`apps/web`)
- `payment_intent.succeeded` webhook handled in `apps/web/src/app/api/webhooks/stripe/route.ts`
- Order status updated to `paid` on webhook receipt
- Stripe public key loaded from env, secret key used server-side only

**Stripe Connect** (chef payouts):
- Connect account onboarding flow exists in `apps/chef-admin`
- `chef_payout_accounts` table stores Connect account IDs
- Payout initiation via finance orchestrator
- Account link generation and return URL handling implemented

### What Is Broken

**Refund processing** (ops-admin):
```typescript
// apps/ops-admin/src/app/api/refunds/route.ts
// Mock implementation found in prior audit:
const refundId = `mock_refund_${Date.now()}`;
// Real Stripe refund API is NOT called
```

Refunds are logged in the `refund_cases` table with a mock refund ID. No actual money is returned to customers. This is a critical revenue integrity issue.

### Configuration

| Key | Used In |
|-----|---------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `apps/web` |
| `STRIPE_SECRET_KEY` | `packages/engine`, `apps/ops-admin` |
| `STRIPE_WEBHOOK_SECRET` | `apps/web/src/app/api/webhooks/stripe/route.ts` |
| `STRIPE_API_VERSION` | Set to `2026-02-25.clover` (future/beta) |

---

## Google Maps

**Status**: NOT USED

**History**: Google Maps JavaScript API key is present in `.env.example`. There are commented-out import statements referencing `@googlemaps/js-api-loader` in at least one file.

**Current implementation**: All maps in the platform use **Leaflet** with **React-Leaflet** and OpenStreetMap tiles. No Google Maps SDK is loaded or called.

**Gap - Geocoding**: No geocoding integration exists anywhere. Address entry (customer checkout, driver app) uses free-text input with no validation, coordinate resolution, or autocomplete. The `customer_addresses` table has `lat`/`lng` columns that are never populated.

**Recommendation**: Either wire Google Maps Geocoding API (and remove the current dead Google Maps key) or use an open alternative (Nominatim, Mapbox). The lat/lng gap blocks accurate delivery distance calculation and driver routing.

---

## Resend (Email)

**Status**: NOT WIRED

**Evidence of intent**:
- `RESEND_API_KEY` present in `.env.example`
- `packages/notifications` contains email template files (React Email components)
- Email template components exist for: order confirmation, chef approval, driver approval, order status updates

**What is missing**:
- No file in any app calls `resend.emails.send()`
- The Resend SDK (`resend` package) may not be installed
- `packages/notifications/src/index.ts` exports template rendering functions but no sending function
- No queue or retry logic for failed email sends

**Impact**: Customers receive no email confirmations after placing orders. Chefs and drivers receive no approval/rejection notifications. This is a significant UX gap.

---

## Push Notifications

**Status**: NOT WIRED

**Evidence of intent**:
- `push_subscriptions` table exists with `endpoint`, `keys_p256dh`, `keys_auth` columns
- `apps/web/src/app/api/push/subscribe/route.ts` — accepts and stores push subscriptions
- Service worker setup exists in `apps/driver-app` (PWA manifest present)

**What is missing**:
- No code calls the Web Push API to send notifications
- `web-push` npm package not installed
- VAPID keys not configured in any `.env.example`
- No trigger points where push notifications would be sent (e.g., new order, driver assigned)

**Impact**: Driver app cannot receive background push alerts for new delivery offers. Customers cannot be notified of order status changes via push. The subscription endpoint collects data that is never consumed.

---

## PostGIS

**Status**: WORKING

- PostGIS PostgreSQL extension enabled in Supabase project
- Used for geospatial point storage on `driver_locations` and `driver_presence`
- `driver_presence` uses PostGIS `GEOGRAPHY(POINT)` for proximity queries
- The `get_driver_proximity_score` RPC function uses PostGIS operators but is not called from application code (see RPC function gap in file 08)
- Application-side fallback: driver proximity is approximated using Haversine formula in TypeScript when the RPC is not called

---

## Vercel

**Status**: CONFIGURED

- `vercel.json` files present in all 4 apps
- Environment variables managed via Vercel project settings (not committed)
- All 4 apps deploy as separate Vercel projects
- Preview deployments enabled (implied by monorepo structure)
- No custom domain configuration visible in codebase (managed externally)

**Note**: Vercel Edge Middleware is not used. All middleware runs as Node.js serverless functions (default Next.js behavior).

---

## Missing Integrations

The following integrations are absent but would be needed for production operation:

| Integration | Why Needed | Complexity | Priority |
|------------|-----------|-----------|---------|
| Email sending (Resend) | Order confirmations, approvals | LOW (templates exist) | CRITICAL |
| Push notifications (web-push) | Driver offer alerts, order updates | MEDIUM | HIGH |
| Geocoding API | Address validation, lat/lng resolution | MEDIUM | HIGH |
| SMS notifications | Driver offers (push backup) | MEDIUM | MEDIUM |
| File upload UI | Chef/driver document submission | MEDIUM | HIGH |
| Analytics (Mixpanel/GA4) | User behavior tracking | LOW | LOW |
| Error monitoring (Sentry) | Production error tracking | LOW | MEDIUM |
| Feature flags (LaunchDarkly) | Gradual rollouts | HIGH | LOW |

---

## Environment Variable Audit

Variables referenced in `.env.example` across all apps:

| Variable | App(s) | Integration | Wired |
|----------|--------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase | YES |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Supabase | YES |
| `SUPABASE_SERVICE_ROLE_KEY` | All | Supabase | YES |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | web | Stripe | YES |
| `STRIPE_SECRET_KEY` | engine, ops-admin | Stripe | YES |
| `STRIPE_WEBHOOK_SECRET` | web | Stripe | YES |
| `GOOGLE_MAPS_API_KEY` | — | Google Maps | NO (commented out) |
| `RESEND_API_KEY` | — | Resend | NO (no sending code) |
| `NEXT_PUBLIC_APP_URL` | All | Internal | YES |
| `BYPASS_AUTH` | All | Auth bypass | YES (risk - see file 09) |
