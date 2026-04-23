# 14 - Working vs Non-Working Matrix

**Audit Date**: 2026-04-23
**Scope**: Every major functional area across all 4 apps
**Status**: Core commerce flow is working; notifications, documents, customizations, and analytics are not

---

## Legend

| Status | Meaning |
|--------|---------|
| WORKING | Feature functions end-to-end in production code |
| PARTIAL | Feature works but with known gaps or workarounds |
| PLACEHOLDER | Code exists but uses fake/hardcoded data |
| UNWIRED | Schema/templates exist but no application code uses them |
| NOT IMPLEMENTED | No code or schema for this feature |
| FIXED | Was broken, repaired in prior audit |

---

## Full Feature Matrix

| Area | Sub-area | File(s) | Status | Evidence | Blocking Dependency | Risk Level | What's Needed |
|------|----------|---------|--------|----------|-------------------|-----------|---------------|
| **AUTH — Web** | Customer login | `apps/web/src/app/login/page.tsx` | WORKING | Supabase email/password, session cookie set | — | LOW | — |
| **AUTH — Web** | Customer registration | `apps/web/src/app/register/page.tsx` | WORKING | Creates auth user + customers row | — | LOW | — |
| **AUTH — Chef-Admin** | Chef login | `apps/chef-admin/src/app/login/page.tsx` | WORKING | Supabase email/password | — | LOW | — |
| **AUTH — Chef-Admin** | Chef registration | `apps/chef-admin/src/app/register/page.tsx` | WORKING | Creates auth user + chef_profiles row (pending) | — | LOW | — |
| **AUTH — Ops-Admin** | Ops login | `apps/ops-admin/src/app/login/page.tsx` | WORKING | Supabase email/password, platform_users check | — | LOW | — |
| **AUTH — Ops-Admin** | Ops registration | N/A | NOT IMPLEMENTED | No self-registration; ops users seeded | — | LOW | Seed/invite flow only |
| **AUTH — Driver** | Driver login | `apps/driver-app/src/app/login/page.tsx` | WORKING | Supabase email/password | — | LOW | — |
| **AUTH — Driver** | Driver registration | `apps/driver-app/src/app/register/page.tsx` | WORKING | Creates auth user + drivers row (pending) | — | LOW | — |
| **AUTH — All** | OAuth (Google/Apple) | N/A | NOT IMPLEMENTED | No OAuth code anywhere | — | LOW | Add OAuth provider |
| **AUTH — All** | MFA | N/A | NOT IMPLEMENTED | Supabase MFA not enabled | — | HIGH | Enforce for ops roles |
| **BROWSING** | Storefront listing | `apps/web/src/app/page.tsx` | WORKING | Queries chef_storefronts with chef_profiles join | — | LOW | — |
| **BROWSING** | Search/filter | `apps/web/src/app/page.tsx` | WORKING | URL param-based filter, Supabase ilike query | — | LOW | — |
| **BROWSING** | Storefront detail | `apps/web/src/app/[slug]/page.tsx` | WORKING | Loads storefront + menu items | — | LOW | — |
| **BROWSING** | Menu item customization | `apps/web/src/app/[slug]/page.tsx` | UNWIRED | No option selectors rendered | menu_item_options unwired | HIGH | Wire menu item options |
| **BROWSING** | Favorites | N/A | UNWIRED | No UI, no API routes | favorites table unused | MEDIUM | Full implementation needed |
| **CART** | Add to cart | `apps/web/src/contexts/CartContext.tsx` | WORKING | Writes to carts + cart_items | — | LOW | — |
| **CART** | Cross-chef enforcement | `apps/web/src/contexts/CartContext.tsx` | WORKING | Prompts clear cart if different chef | — | LOW | — |
| **CART** | View cart | `apps/web/src/app/cart/page.tsx` | WORKING | Reads from CartContext | — | LOW | — |
| **CART** | Cart persistence | `apps/web/src/contexts/CartContext.tsx` | WORKING | Synced to Supabase | — | LOW | — |
| **CART** | Promo code application | `apps/web/src/app/cart/page.tsx` | WORKING | Calls promo.repository, increment_promo_usage RPC | — | LOW | — |
| **CHECKOUT** | Checkout page | `apps/web/src/app/checkout/page.tsx` | WORKING | Renders address, summary, Stripe Elements | — | LOW | — |
| **CHECKOUT** | Address selection | `apps/web/src/app/checkout/page.tsx` | WORKING | Reads customer_addresses | — | LOW | — |
| **CHECKOUT** | Delivery fee calculation | Engine (TypeScript) | PARTIAL | Fee calculated in TS; `calculate_delivery_fee` RPC unused | — | LOW | Use RPC for accuracy |
| **CHECKOUT** | Stripe PaymentIntent | `apps/web/src/app/api/checkout/route.ts` | WORKING | Creates PaymentIntent server-side | — | LOW | — |
| **CHECKOUT** | Stripe payment confirmation | `apps/web/src/app/checkout/page.tsx` | WORKING | Stripe.js confirmPayment | — | LOW | — |
| **CHECKOUT** | Stripe webhook | `apps/web/src/app/api/webhooks/stripe/route.ts` | WORKING | payment_intent.succeeded → order paid | — | LOW | — |
| **ORDER CREATION** | Order via engine | `packages/engine/src/orchestrators/order.orchestrator.ts` | WORKING | Creates order, items, starts state machine | — | LOW | — |
| **ORDER CREATION** | Order confirmation page | `apps/web/src/app/order-confirmation/[orderId]/page.tsx` | PARTIAL | Duplicate route exists at /orders/[id]/confirmation | Duplicate route | LOW | Consolidate routes |
| **ORDER CREATION** | Order confirmation email | N/A | UNWIRED | Template exists, no send call | Resend not wired | CRITICAL | Wire email sender |
| **CHEF ORDER MGMT** | Orders list | `apps/chef-admin/src/app/orders/page.tsx` | WORKING | Realtime subscription on orders table | — | LOW | — |
| **CHEF ORDER MGMT** | Accept order | `apps/chef-admin/src/app/orders/[id]/page.tsx` | WORKING | Calls engine accept transition | — | LOW | — |
| **CHEF ORDER MGMT** | Reject order | `apps/chef-admin/src/app/orders/[id]/page.tsx` | WORKING | Calls engine reject transition | — | LOW | — |
| **CHEF ORDER MGMT** | Mark preparing/ready | `apps/chef-admin/src/app/orders/[id]/page.tsx` | WORKING | Engine transitions | — | LOW | — |
| **CHEF MENU CRUD** | Create menu item | `apps/chef-admin/src/app/menu/page.tsx` | WORKING | Writes to menu_items | — | LOW | — |
| **CHEF MENU CRUD** | Edit menu item | `apps/chef-admin/src/app/menu/[id]/page.tsx` | WORKING | Updates menu_items | — | LOW | — |
| **CHEF MENU CRUD** | Delete menu item | `apps/chef-admin/src/app/menu/[id]/page.tsx` | WORKING | Soft deletes menu_items | — | LOW | — |
| **CHEF MENU CRUD** | Item categories | `apps/chef-admin/src/app/menu/page.tsx` | WORKING | menu_categories CRUD | — | LOW | — |
| **CHEF MENU CRUD** | Item options/modifiers | N/A | UNWIRED | menu_item_options table unused | menu_item_options unwired | HIGH | Full implementation needed |
| **CHEF MENU CRUD** | Item availability schedule | N/A | UNWIRED | menu_item_availability table unused | — | MEDIUM | Implementation needed |
| **CHEF STOREFRONT** | View/edit storefront | `apps/chef-admin/src/app/storefront/page.tsx` | WORKING | Reads/writes chef_storefronts | — | LOW | — |
| **CHEF STOREFRONT** | Create storefront | `apps/chef-admin/src/app/storefront/page.tsx` | FIXED | Creation flow added in prior audit | — | LOW | — |
| **CHEF STOREFRONT** | Delivery zones | N/A | UNWIRED | chef_delivery_zones table unused | — | MEDIUM | Implementation needed |
| **CHEF STOREFRONT** | Availability schedule | N/A | UNWIRED | chef_availability table unused | — | MEDIUM | Implementation needed |
| **CHEF PAYOUTS** | Connect onboarding | `apps/chef-admin/src/app/payouts/page.tsx` | WORKING | Stripe Connect account creation + link | — | LOW | — |
| **CHEF PAYOUTS** | Payout initiation | `packages/engine/src/orchestrators/finance.orchestrator.ts` | WORKING | Stripe payout to connected account | — | LOW | — |
| **CHEF PAYOUTS** | Payout history | N/A | UNWIRED | chef_payouts table unused | — | MEDIUM | Wire payouts table |
| **CHEF REVIEWS** | View reviews | `apps/chef-admin/src/app/reviews/page.tsx` | PARTIAL | Works but no error handling | Unhandled error states | MEDIUM | Add error boundary |
| **CHEF DOCUMENTS** | Upload documents | N/A | UNWIRED | chef_documents table, no UI | chef_documents unused | HIGH | File upload UI + storage |
| **OPS DASHBOARD** | Key metrics | `apps/ops-admin/src/app/dashboard/page.tsx` | WORKING | Calls get_ops_dashboard_stats RPC | — | LOW | — |
| **OPS DASHBOARD** | Analytics charts | `apps/ops-admin/src/app/analytics/page.tsx` | PLACEHOLDER | Hardcoded fake data | No real data source | HIGH | Wire to real data |
| **OPS DASHBOARD** | Live map | `apps/ops-admin/src/app/map/page.tsx` | PLACEHOLDER | Basic map, no realtime, no dispatch | Realtime not wired | MEDIUM | Realtime + dispatch UI |
| **OPS ORDER MGMT** | Order list | `apps/ops-admin/src/app/orders/page.tsx` | WORKING | Reads orders with filters | — | LOW | — |
| **OPS ORDER MGMT** | Order detail | `apps/ops-admin/src/app/orders/[id]/page.tsx` | WORKING | Full order view | — | LOW | — |
| **OPS ORDER MGMT** | Override order status | `apps/ops-admin/src/app/orders/[id]/page.tsx` | WORKING | Ops actor context, engine override | — | LOW | — |
| **OPS CHEF MGMT** | Chef list | `apps/ops-admin/src/app/chefs/page.tsx` | WORKING | Queries chef_profiles | — | LOW | — |
| **OPS CHEF MGMT** | Chef approval | `apps/ops-admin/src/app/chefs/[id]/page.tsx` | WORKING | Updates chef_profiles.status | — | LOW | — |
| **OPS CHEF MGMT** | Chef document review | N/A | UNWIRED | No document review UI | chef_documents unused | HIGH | Review queue needed |
| **OPS DRIVER MGMT** | Driver list | `apps/ops-admin/src/app/drivers/page.tsx` | WORKING | Queries drivers | — | LOW | — |
| **OPS DRIVER MGMT** | Driver approval | `apps/ops-admin/src/app/drivers/[id]/page.tsx` | WORKING | Updates drivers.status | — | LOW | — |
| **OPS DRIVER MGMT** | Driver document review | N/A | UNWIRED | No document review UI | driver_documents unused | HIGH | Review queue needed |
| **OPS DELIVERY** | Delivery list | `apps/ops-admin/src/app/deliveries/page.tsx` | WORKING | Queries deliveries with filters | — | LOW | — |
| **OPS DELIVERY** | Manual dispatch | `apps/ops-admin/src/app/deliveries/[id]/page.tsx` | WORKING | Calls assignment engine | — | LOW | — |
| **OPS FINANCE** | Ledger view | `apps/ops-admin/src/app/finance/page.tsx` | WORKING | Reads ledger_entries | — | LOW | — |
| **OPS FINANCE** | Payout runs | N/A | UNWIRED | payout_runs table unused | — | MEDIUM | Wire payout_runs |
| **OPS REFUNDS** | Create refund case | `apps/ops-admin/src/app/api/refunds/route.ts` | PARTIAL | Creates refund_cases record | — | CRITICAL | Real Stripe API call |
| **OPS REFUNDS** | Process Stripe refund | `apps/ops-admin/src/app/api/refunds/route.ts` | PLACEHOLDER | mock_refund_${Date.now()} | No Stripe call | CRITICAL | Wire stripe.refunds.create |
| **DRIVER DELIVERY** | See available offers | `apps/driver-app/src/app/offers/page.tsx` | PARTIAL | Manual refresh only, no push/realtime | Realtime not wired | HIGH | Realtime or push |
| **DRIVER DELIVERY** | Accept offer | `apps/driver-app/src/app/offers/[id]/page.tsx` | WORKING | Engine delivery acceptance | — | LOW | — |
| **DRIVER DELIVERY** | Reject offer | `apps/driver-app/src/app/offers/[id]/page.tsx` | WORKING | Engine rejection + re-offer | — | LOW | — |
| **DRIVER DELIVERY** | Navigation/routing | `apps/driver-app/src/app/delivery/[id]/page.tsx` | PARTIAL | Leaflet map shown; no turn-by-turn | No routing API | MEDIUM | Integrate routing API |
| **DRIVER DELIVERY** | Status updates | `apps/driver-app/src/app/delivery/[id]/page.tsx` | WORKING | Engine transitions (pickup, deliver) | — | LOW | — |
| **DRIVER LOCATION** | Update location | `apps/driver-app/src/app/api/location/route.ts` | WORKING | Writes to driver_presence + driver_locations | — | LOW | — |
| **DRIVER LOCATION** | Display location city | `apps/driver-app/src/app/dashboard/page.tsx` | UNWIRED | Hardcoded "Hamilton, ON" | Geocoding not wired | MEDIUM | Reverse geocoding |
| **DRIVER EARNINGS** | Earnings total | `apps/driver-app/src/app/earnings/page.tsx` | PARTIAL | Dollar amount works; hours always 0 | driver_shifts unused | MEDIUM | Wire shifts/hours |
| **DRIVER DOCUMENTS** | Upload documents | N/A | UNWIRED | driver_documents table, no UI | — | HIGH | File upload UI |
| **DRIVER VEHICLES** | Vehicle management | N/A | UNWIRED | driver_vehicles table, no UI | — | MEDIUM | Vehicle CRUD |
| **NOTIFICATIONS — Email** | Order confirmation | N/A | UNWIRED | Template exists, not sent | Resend not wired | CRITICAL | Wire Resend send() |
| **NOTIFICATIONS — Email** | Chef approval | N/A | UNWIRED | Template exists, not sent | Resend not wired | HIGH | Wire Resend send() |
| **NOTIFICATIONS — Email** | Driver approval | N/A | UNWIRED | Template exists, not sent | Resend not wired | HIGH | Wire Resend send() |
| **NOTIFICATIONS — Push** | Delivery offers | N/A | UNWIRED | push_subscriptions stored; nothing sent | web-push not installed | HIGH | Install web-push + send |
| **NOTIFICATIONS — Push** | Order updates | N/A | UNWIRED | No push send code | web-push not installed | HIGH | Install web-push + send |
| **REALTIME** | Chef order updates | `apps/chef-admin/src/app/orders/page.tsx` | WORKING | postgres_changes subscription | — | LOW | — |
| **REALTIME** | Customer order tracking | `apps/web/src/app/orders/[id]/page.tsx` | PARTIAL | 15-second polling | Realtime not wired | MEDIUM | Replace with subscription |
| **REALTIME** | Driver offer alerts | N/A | NOT IMPLEMENTED | No subscription or push | — | HIGH | Realtime or push |
| **REALTIME** | Ops order board | N/A | NOT IMPLEMENTED | No subscription | — | MEDIUM | Add subscription |
| **ANALYTICS** | Platform metrics | `apps/ops-admin/src/app/analytics/page.tsx` | PLACEHOLDER | Hardcoded fake data | No data source | HIGH | Real data pipeline |
| **TESTS** | Web app | `apps/web/src/__tests__/` | PARTIAL | 4 test files, minimal coverage | — | MEDIUM | Expand test suite |
| **TESTS** | Engine | `packages/engine/src/__tests__/` | PARTIAL | 3 test files, core orchestrators | — | MEDIUM | Expand test suite |
| **TESTS** | Chef-admin | None found | NOT IMPLEMENTED | 0 test files | — | HIGH | Add test suite |
| **TESTS** | Ops-admin | None found | NOT IMPLEMENTED | 0 test files | — | HIGH | Add test suite |
| **TESTS** | Driver-app | None found | NOT IMPLEMENTED | 0 test files | — | HIGH | Add test suite |
| **TESTS** | Shared packages | None found | NOT IMPLEMENTED | 0 test files in packages | — | HIGH | Add unit tests |
