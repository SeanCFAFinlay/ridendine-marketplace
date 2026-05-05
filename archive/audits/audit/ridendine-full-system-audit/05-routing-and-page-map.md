# 05 - Routing and Page Map

**Audit Date**: 2026-04-23
**Scope**: All routes across all 4 apps. Status based on code inspection.

Status definitions:
- **working** - Page renders with real data from Supabase; core functionality operates end-to-end
- **partial** - Page renders but key features missing (e.g., no real-time, no pagination, incomplete sub-flows)
- **placeholder** - Page renders but data is mock/empty or primary feature is not implemented
- **redirect** - Route that redirects to another route; no content itself

---

## apps/web - Customer Marketplace (Port 3000)

Total: 22 pages + 12 API routes

| Route | File Path | Purpose | Auth Required | Role | Status | Data Source | Notes |
|-------|-----------|---------|---------------|------|--------|-------------|-------|
| `/` | `src/app/page.tsx` | Homepage with hero section and featured chefs | No | Public | working | Supabase (storefronts) | FeaturedChefs component fetches real data |
| `/chefs` | `src/app/chefs/page.tsx` | Browse all chef storefronts with filters | No | Public | partial | Supabase (storefronts) | No pagination; all chefs loaded at once |
| `/chefs/[slug]` | `src/app/chefs/[slug]/page.tsx` | Individual chef storefront with menu | No | Public | working | Supabase (storefront + menu items) | Add-to-cart functional |
| `/cart` | `src/app/cart/page.tsx` | Shopping cart view | No (soft) | Customer | working | cart-context.tsx + Supabase cart | Cart persisted server-side |
| `/checkout` | `src/app/checkout/page.tsx` | Stripe Elements checkout | Yes | Customer | working | Stripe + engine | Full Stripe PaymentIntent flow |
| `/order-confirmation/[orderId]` | `src/app/order-confirmation/[orderId]/page.tsx` | Post-checkout order confirmation | Yes | Customer | working | Supabase (orders) | Shown after successful payment |
| `/orders/[id]/confirmation` | `src/app/orders/[id]/confirmation/page.tsx` | Order detail confirmation view | Yes | Customer | partial | Supabase (orders) | Near-duplicate of above; tracking not real-time |
| `/account` | `src/app/account/page.tsx` | Account overview | Yes | Customer | working | Supabase (customer profile) | Auth-guarded via middleware |
| `/account/orders` | `src/app/account/orders/page.tsx` | Order history list | Yes | Customer | partial | Supabase (orders) | No pagination; no real-time status |
| `/account/addresses` | `src/app/account/addresses/page.tsx` | Saved delivery addresses | Yes | Customer | working | Supabase (addresses) | CRUD functional |
| `/account/favorites` | `src/app/account/favorites/page.tsx` | Favorite storefronts | Yes | Customer | placeholder | Supabase (favorites table?) | Favorites table exists but wiring unclear |
| `/account/settings` | `src/app/account/settings/page.tsx` | Account settings | Yes | Customer | partial | Supabase (profiles) | Basic profile update; no 2FA/email change |
| `/auth/login` | `src/app/auth/login/page.tsx` | Customer login | No | Public | working | Supabase Auth | Redirects to /chefs if session exists |
| `/auth/signup` | `src/app/auth/signup/page.tsx` | Customer signup | No | Public | working | Supabase Auth | Password strength meter included |
| `/auth/forgot-password` | `src/app/auth/forgot-password/page.tsx` | Password reset request | No | Public | working | Supabase Auth | Sends reset email |
| `/how-it-works` | `src/app/how-it-works/page.tsx` | Explainer page | No | Public | working | Static | Marketing page |
| `/about` | `src/app/about/page.tsx` | About Ridendine | No | Public | working | Static | Marketing page |
| `/chef-signup` | `src/app/chef-signup/page.tsx` | Chef signup landing | No | Public | partial | Static + link | Links to chef-admin app signup; no embedded flow |
| `/chef-resources` | `src/app/chef-resources/page.tsx` | Resources for home chefs | No | Public | working | Static | Informational page |
| `/contact` | `src/app/contact/page.tsx` | Contact form/info | No | Public | partial | Static / support API | Contact form may or may not submit to /api/support |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy policy | No | Public | working | Static | Legal page |
| `/terms` | `src/app/terms/page.tsx` | Terms of service | No | Public | working | Static | Legal page |

---

## apps/chef-admin - Chef Dashboard (Port 3001)

Total: 11 pages + 10 API routes

| Route | File Path | Purpose | Auth Required | Role | Status | Data Source | Notes |
|-------|-----------|---------|---------------|------|--------|-------------|-------|
| `/` | `src/app/page.tsx` | Root redirect | Yes | Chef | redirect | - | Redirects to /dashboard or /auth/login |
| `/auth/login` | `src/app/auth/login/page.tsx` | Chef login | No | Public | working | Supabase Auth | Redirects to dashboard if session exists |
| `/auth/signup` | `src/app/auth/signup/page.tsx` | Chef signup | No | Public | working | Supabase Auth + engine | Creates chef profile + storefront stub |
| `/dashboard` | `src/app/dashboard/page.tsx` | Dashboard home (stats, recent orders) | Yes | Chef | partial | Supabase (orders, storefront) | No real-time; requires manual refresh for new orders |
| `/dashboard/orders` | `src/app/dashboard/orders/page.tsx` | Active and past orders | Yes | Chef | partial | Supabase via /api/orders | Accept/reject/ready working; no push notifications |
| `/dashboard/menu` | `src/app/dashboard/menu/page.tsx` | Menu management | Yes | Chef | working | Supabase via /api/menu | Full CRUD for items and categories |
| `/dashboard/storefront` | `src/app/dashboard/storefront/page.tsx` | Storefront profile editing | Yes | Chef | working | Supabase via /api/storefront | Name, description, hours, cuisine type |
| `/dashboard/payouts` | `src/app/dashboard/payouts/page.tsx` | Payout history and requests | Yes | Chef | partial | Stripe Connect + Supabase | Setup route exists; full Stripe Connect onboarding ~60% |
| `/dashboard/analytics` | `src/app/dashboard/analytics/page.tsx` | Revenue and item analytics | Yes | Chef | placeholder | Supabase (orders) | Charts may render with limited/placeholder data |
| `/dashboard/reviews` | `src/app/dashboard/reviews/page.tsx` | Customer reviews received | Yes | Chef | partial | Supabase (reviews) | Read-only; no reply capability shown |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | Chef profile and preferences | Yes | Chef | working | Supabase via /api/profile | Profile fields update working |

---

## apps/ops-admin - Operations Center (Port 3002)

Total: 18 pages + 21 API routes

| Route | File Path | Purpose | Auth Required | Role | Status | Data Source | Notes |
|-------|-----------|---------|---------------|------|--------|-------------|-------|
| `/` | `src/app/page.tsx` | Root redirect | Yes | Ops | redirect | - | Redirects to /dashboard or /auth/login |
| `/auth/login` | `src/app/auth/login/page.tsx` | Ops admin login | No | Public | working | Supabase Auth | Role checked after login |
| `/dashboard` | `src/app/dashboard/page.tsx` | Queue overview dashboard | Yes | Ops | working | engine /api/engine/dashboard | Real queue counts from engine; link cards to sub-pages |
| `/dashboard/chefs` | `src/app/dashboard/chefs/page.tsx` | All chefs list | Yes | Ops | partial | Supabase via /api/chefs | No pagination; all chefs loaded |
| `/dashboard/chefs/approvals` | `src/app/dashboard/chefs/approvals/page.tsx` | Pending chef approvals queue | Yes | Ops | working | Supabase (status=pending) | Approve/reject actions functional |
| `/dashboard/chefs/[id]` | `src/app/dashboard/chefs/[id]/page.tsx` | Chef detail + governance | Yes | Ops | working | Supabase via /api/chefs/[id] | Suspend, reactivate, storefront control |
| `/dashboard/customers` | `src/app/dashboard/customers/page.tsx` | All customers list | Yes | Ops | partial | Supabase via /api/customers | No pagination; no search |
| `/dashboard/customers/[id]` | `src/app/dashboard/customers/[id]/page.tsx` | Customer detail + order history | Yes | Ops | working | Supabase (customer + orders) | Read-only view |
| `/dashboard/drivers` | `src/app/dashboard/drivers/page.tsx` | All drivers list | Yes | Ops | partial | Supabase via /api/drivers | No pagination |
| `/dashboard/drivers/[id]` | `src/app/dashboard/drivers/[id]/page.tsx` | Driver detail + governance | Yes | Ops | working | Supabase via /api/drivers/[id] | Approve, suspend actions |
| `/dashboard/deliveries` | `src/app/dashboard/deliveries/page.tsx` | All deliveries (with queue filters) | Yes | Ops | partial | Supabase via /api/deliveries | Queue param filtering works; no pagination |
| `/dashboard/deliveries/[id]` | `src/app/dashboard/deliveries/[id]/page.tsx` | Delivery detail + override | Yes | Ops | working | Supabase via /api/deliveries/[id] | Manual dispatch and status override |
| `/dashboard/orders` | `src/app/dashboard/orders/page.tsx` | All orders list | Yes | Ops | partial | Supabase via /api/orders | No pagination; no real-time |
| `/dashboard/orders/[id]` | `src/app/dashboard/orders/[id]/page.tsx` | Order detail + status override | Yes | Ops | working | engine + Supabase | Status override and refund actions |
| `/dashboard/support` | `src/app/dashboard/support/page.tsx` | Support ticket queue | Yes | Ops | partial | Supabase via /api/support | View and respond; no priority sorting |
| `/dashboard/analytics` | `src/app/dashboard/analytics/page.tsx` | Platform analytics | Yes | Ops | placeholder | engine /api/engine/finance | Charts likely partial; financial data real |
| `/dashboard/finance` | `src/app/dashboard/finance/page.tsx` | Finance overview + refund queue | Yes | Ops | partial | engine /api/engine/refunds | Refund execution via Stripe is real |
| `/dashboard/map` | `src/app/dashboard/map/page.tsx` | Live delivery map | Yes | Ops | placeholder | driver location data | live-map component exists; real data wiring incomplete |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | Platform settings | Yes | Ops (super_admin) | working | engine /api/engine/settings | Fee rates, flags, dispatch config |

---

## apps/driver-app - Driver PWA (Port 3003)

Total: 6 pages + 9 API routes

| Route | File Path | Purpose | Auth Required | Role | Status | Data Source | Notes |
|-------|-----------|---------|---------------|------|--------|-------------|-------|
| `/auth/login` | `src/app/auth/login/page.tsx` | Driver login | No | Public | working | Supabase Auth | Must be approved driver to access dashboard |
| `/` | `src/app/page.tsx` | Main dashboard (online toggle, offers, active delivery) | Yes | Driver | working | engine + /api/offers | Online/offline toggle functional; offer accept/decline working |
| `/delivery/[id]` | `src/app/delivery/[id]/page.tsx` | Active delivery detail | Yes | Driver | working | /api/deliveries/[id] | Confirm pickup and confirm delivery working |
| `/earnings` | `src/app/earnings/page.tsx` | Earnings summary | Yes | Driver | partial | /api/earnings | Shows real earnings data; breakdown may be limited |
| `/history` | `src/app/history/page.tsx` | Delivery history list | Yes | Driver | placeholder | /api/deliveries | HistoryView component exists; data completeness unclear |
| `/profile` | `src/app/profile/page.tsx` | Driver profile | Yes | Driver | partial | /api/driver | View works; edit capability unclear |

---

## Route Status Summary

| App | Working | Partial | Placeholder | Redirect | Total |
|-----|---------|---------|-------------|----------|-------|
| web | 13 | 6 | 1 | 0 | 22 |
| chef-admin | 6 | 4 | 1 | 1 | 11 (includes root redirect) |
| ops-admin | 9 | 6 | 3 | 1 | 18 (includes root redirect) |
| driver-app | 3 | 2 | 1 | 0 | 6 |
| **Total** | **31** | **18** | **6** | **2** | **57** |

---

## Cross-App Route Notes

### Duplicate Routes
- `apps/web` has both `/order-confirmation/[orderId]` and `/orders/[id]/confirmation` serving similar post-order confirmation purposes. One should be consolidated.

### Missing Routes
The following flows lack dedicated routes and may be gaps:
- Driver approval status page (driver knows they're pending only via login error)
- Chef onboarding wizard step-by-step (chef-admin goes straight to dashboard after signup)
- Customer email verification landing page
- Admin-facing support ticket reply (ops-admin support page is read-heavy)

### Auth Redirect Chains
- `apps/chef-admin /` → checks session → `/dashboard` or `/auth/login`
- `apps/ops-admin /` → checks session → `/dashboard` or `/auth/login`
- `apps/web /auth/login` with active session → `/chefs`
- `apps/chef-admin /auth/*` with active session → `/dashboard`

All redirect logic is in middleware.ts and root page.tsx files.
