# Gaps and Unknowns

> Things that cannot be confirmed from the codebase alone, or that represent clear gaps between schema and implementation.

## Category 1: Schema Exists But No UI

These database tables have complete schemas (columns, RLS, indexes) but no user interface to create, view, or manage their data.

| Table | Schema Location | What It Would Do | Why It Matters |
|-------|----------------|-----------------|----------------|
| `chef_documents` | Migration 00001 | Upload/verify food handler certs, kitchen inspections, business licenses | Compliance and trust |
| `chef_availability` | Migration 00001 | Set storefront hours per day of week | Customers see when chefs are available |
| `chef_delivery_zones` | Migration 00001 | Define delivery radius with PostGIS polygons | Delivery area restrictions |
| `menu_item_options` + `option_values` | Migration 00001 | Item customization (size, toppings, etc.) | Complex menu items |
| `menu_item_availability` | Migration 00001 | Time-based item availability | Breakfast/lunch/dinner menus |
| `order_item_modifiers` | Migration 00001 | Record selected modifiers on order items | Order accuracy |
| `driver_documents` | Migration 00001 | Upload/verify license, insurance, registration | Compliance |
| `admin_notes` | Migration 00001 | Add notes to any entity | Ops context |
| `payout_runs` | Migration 00001 | Batch payout processing | Scheduled payouts |

## Category 2: Validation Schemas Without Callers

These Zod schemas exist in `@ridendine/validation` but are not imported by any API route:

| Schema | File | Purpose | Status |
|--------|------|---------|--------|
| `resetPasswordRequestSchema` | auth.ts | Password reset request | No API route calls it |
| `resetPasswordSchema` | auth.ts | Password reset execution | No API route calls it |
| `changePasswordSchema` | auth.ts | Change current password | No API route calls it |
| `createDeliveryZoneSchema` | chef.ts | Create delivery zone | No zone management UI |
| `setAvailabilitySchema` | chef.ts | Set storefront hours | No availability UI |
| `createMenuItemOptionSchema` | chef.ts | Create item options | No option management UI |
| `createDriverProfileSchema` | driver.ts | Create driver profile | No driver signup UI |
| `createDriverVehicleSchema` | driver.ts | Register vehicle | No vehicle management UI |
| `uploadDriverDocumentSchema` | driver.ts | Upload document | No document upload UI |
| `confirmPickupSchema` | driver.ts | Confirm pickup with photo | Delivery detail uses different approach |
| `confirmDropoffSchema` | driver.ts | Confirm dropoff with photo/signature | Delivery detail uses different approach |
| `goOnlineSchema` | driver.ts | Go online with location | Presence API uses different validation |

## Category 3: Pricing Inconsistency

| Issue | Details |
|-------|---------|
| Engine constants vs platform_settings | `BASE_DELIVERY_FEE`, `SERVICE_FEE_PERCENT`, `HST_RATE` are hardcoded in engine constants. The `platform_settings` table has `platform_fee_percent`, `service_fee_percent` fields. The checkout API uses engine constants, not platform_settings values. |
| Delivery fee | Checkout hardcodes $5.00 flat fee. DB/settings infrastructure for variable fees exists but isn't used. |
| Chef delivery zones | Zones table has `delivery_fee` column per zone, but delivery fee is flat $5.00 everywhere. |

## Category 4: Features Implied But Not Wired

| Feature | Evidence | Gap |
|---------|----------|-----|
| **Favorites** | `/account/favorites` page exists, shows empty state | No favorites table, no heart button saves anything |
| **Search** | ChefsFilters has search input | Input renders but onChange does nothing |
| **Cuisine filtering** | ChefsFilters has cuisine checkboxes | Checkboxes render but don't filter results |
| **Rating filtering** | ChefsFilters has rating radios | Radios render but don't filter results |
| **Image upload** | Multiple "Upload" buttons in chef forms | No upload API, no Supabase Storage buckets |
| **Password reset** | Forgot password page in web | Page renders form but makes no API call |
| **Profile image** | Avatar fallbacks throughout | profile_image_url fields exist but no upload mechanism |
| **Notification dispatch** | 13+ templates in @ridendine/notifications | Templates defined but never called |
| **Push notifications** | push_subscriptions table + subscribe API | Subscriptions stored but no push sender |
| **Driver signup** | External link in driver login page | Points to ridendine.ca/driver-signup (external, not in repo) |
| **Service worker** | PWA manifest reference in driver layout | manifest.json not found in public folder, no service worker |
| **Settings save** | web /account/settings has save button | Form submit uses `setTimeout` mock, not API call |

## Category 5: Cannot Confirm From Code Alone

| Item | What We Don't Know |
|------|-------------------|
| **Supabase project status** | Whether the Supabase project is active, what storage buckets exist |
| **Stripe account status** | Whether Stripe keys are live or test mode |
| **Production deployment** | Whether any app is deployed to Vercel |
| **Seed data in production** | Whether seed.sql has been applied to production DB |
| **Email delivery** | Whether Supabase sends confirmation emails |
| **RPC function correctness** | Whether `get_available_drivers_near()` Haversine calculation is accurate |
| **Real-time subscription limits** | Whether Supabase plan supports required concurrent connections |
| **Stripe webhook endpoint** | Whether webhook URL is registered in Stripe dashboard |
| **Connect onboarding** | Whether any chef has completed Stripe Connect onboarding |
| **Map tile usage** | Whether OpenStreetMap usage is within free tier limits |
| **chef-signup page** | Content and functionality not deeply inspected |
| **chef-resources page** | Content and functionality not deeply inspected |
| **orders/[id]/confirmation page** | Appears to be a legacy route alongside order-confirmation/[orderId] |

## Category 6: Naming / Convention Issues

| Issue | Details |
|-------|---------|
| Delivery fee unit confusion | Engine constant `BASE_DELIVERY_FEE=399` (cents), but checkout page displays and calculates in dollars ($5.00). The constant value (399 = $3.99) doesn't match the displayed $5.00. |
| Order number format | Two generators: `generateOrderNumber()` in engine returns `RD-{timestamp}-{random}`, same function in web `order-helpers.ts`. Potential duplicate. |
| `delivery_assignments` vs `assignment_attempts` | Two tables for same concept. `delivery_assignments` (migration 00001) appears superseded by `assignment_attempts` (migration 00007) |
| `driver_payouts` vs `chef_payouts` | Both exist in migrations, different structures. Driver payouts schema from 00001, chef payouts from 00004. |
| Status field naming | `orders.status` vs `orders.engine_status` — dual status tracking, unclear which is canonical |

## Category 7: Security Observations

| Item | Details | Risk |
|------|---------|------|
| `BYPASS_AUTH` flag | All auth bypassed when set to true + non-production | Must ensure disabled in production |
| `.env` in repo | Contains actual Supabase keys and DB connection string | Credentials in repo (gitignored?) |
| Admin client in API routes | `createAdminClient()` bypasses RLS | Correct pattern but sensitive |
| No rate limiting | API routes have no rate limiting except location API (5s) | Abuse potential |
| No CSRF protection | Standard Next.js - relies on SameSite cookies | Standard risk |
| Support ticket creation | Web contact form logs but doesn't save to DB | Data loss |

## Category 8: Dead Code / Unused Exports

| Item | Location | Notes |
|------|----------|-------|
| Legacy services | `engine/services/*.ts` | Thin wrappers around orchestrators, marked as legacy |
| `StorageService` | `engine/services/storage.service.ts` | Exists but not called |
| `chef_manager` role | `@ridendine/types` ActorRole | Defined but never used in any actor context |
| `delivery_assignments` table | Migration 00001 | Superseded by `assignment_attempts` |
| `driver_earnings` table | Migration 00001 | Earnings calculated from deliveries directly |
| `NotificationType` enum (13+ types) | `@ridendine/types` | Defined but notification dispatch not implemented |
