# Phase 3 — API inventory (Next.js Route Handlers)

**Scope:** `apps/*/src/app/api/**/route.ts` discovered 2026-05-01 (77 files).  
**Not in scope:** Server Actions (`"use server"`) — grep deferred; none flagged as primary public API in this pass.

## Legend

- **Auth:** session / actor context / platform guard / cron/processor token / public  
- **RL:** `checkRateLimit` from `@ridendine/utils` where observed  

---

## @ridendine/web (`apps/web`)

| Method | Path | Auth | RL | Notes |
|--------|------|------|-----|--------|
| * | `/api/health` | Public | No | `healthPayload('web')` |
| POST | `/api/checkout` | Customer session | Yes | `getCustomerActorContext` + engine |
| POST | `/api/webhooks/stripe` | Stripe signature | No | Signature + idempotency claim |
| * | `/api/cart` | Customer | No | Uses admin client scoped via repo |
| * | `/api/orders`, `/api/orders/[id]` | Customer | No | |
| * | `/api/addresses` | Customer | No | |
| * | `/api/favorites` | Customer | No | |
| * | `/api/reviews` | Customer | Yes (IP) | |
| * | `/api/profile` | Customer | No | |
| * | `/api/notifications`, `/api/notifications/subscribe` | Customer | No | |
| * | `/api/support`, `/api/support/tickets`, `/api/support/tickets/[id]` | Customer | No | |
| POST | `/api/upload` | Session | Yes | |
| * | `/api/auth/login`, `/api/auth/signup` | Public | Yes | |

---

## @ridendine/chef-admin

| Method | Path | Auth | RL | Notes |
|--------|------|------|-----|--------|
| * | `/api/health` | Public | No | |
| * | `/api/auth/signup` | Public | Yes | |
| * | `/api/profile` | Chef | No | |
| * | `/api/storefront`, `/api/storefront/availability` | Chef | No | |
| * | `/api/menu`, `/api/menu/[id]`, `/api/menu/categories` | Chef | No | |
| * | `/api/orders`, `/api/orders/[id]` | Chef | No | admin client |
| * | `/api/payouts/setup`, `/api/payouts/request` | Chef | No | Stripe Connect |
| POST | `/api/upload` | Chef | Yes | |

---

## @ridendine/driver-app

| Method | Path | Auth | RL | Notes |
|--------|------|------|-----|--------|
| * | `/api/health` | Public | No | |
| * | `/api/auth/login`, `/api/auth/signup`, `/api/auth/logout` | Mixed | Yes on login/signup | |
| * | `/api/deliveries`, `/api/deliveries/[id]` | Driver | No | |
| * | `/api/driver`, `/api/driver/presence` | Driver | No | |
| * | `/api/earnings` | Driver | No | |
| POST | `/api/location` | Driver / unauth branch | Yes | IRR-019 |
| * | `/api/offers` | Driver | No | |

---

## @ridendine/ops-admin

Platform APIs: **`guardPlatformApi`** capability groups (`packages/engine/src/services/platform-api-guards.ts`).  
Engine sub-APIs under `/api/engine/*` — processor routes use **`validateEngineProcessorHeaders`** (`@ridendine/utils`).

Representative paths:

- `/api/health` — public  
- `/api/orders`, `/api/orders/[id]`, `/api/orders/[id]/refund` — platform roles  
- `/api/deliveries`, `/api/deliveries/[id]` — platform  
- `/api/customers`, `/api/customers/[id]/notify` — platform  
- `/api/chefs`, `/api/chefs/[id]` — platform  
- `/api/drivers`, `/api/drivers/[id]` — platform  
- `/api/support`, `/api/support/[id]` — platform  
- `/api/promos`, `/api/announcements`, `/api/team` — platform  
- `/api/export` — finance export capability  
- `/api/audit/recent` — audit timeline read  
- `/api/analytics/trends` — analytics read  
- `/api/engine/dashboard`, `dispatch`, `exceptions`, `exceptions/[id]`, `finance`, `health`, `maintenance`, `orders/[id]`, `payouts`, `refunds`, `rules`, `settings`, `storefronts/[id]` — platform + engine  
- `/api/engine/processors/sla`, `/api/engine/processors/expired-offers` — **processor token**  

---

## Other / engine HTTP

- `packages/engine/src/server.ts` — internal HTTP helpers using `createAdminClient` (embedded/adjacent to engine — verify deployment surface).  

---

## Webhooks & cron-like

| Owner | Path | Idempotency |
|-------|------|-------------|
| web | `POST /api/webhooks/stripe` | Yes — `claimStripeWebhookEventForProcessing` + finalize |

---

## Full path list (machine index)

```
apps/chef-admin/src/app/api/auth/signup/route.ts
apps/chef-admin/src/app/api/health/route.ts
apps/chef-admin/src/app/api/menu/[id]/route.ts
apps/chef-admin/src/app/api/menu/categories/route.ts
apps/chef-admin/src/app/api/menu/route.ts
apps/chef-admin/src/app/api/orders/[id]/route.ts
apps/chef-admin/src/app/api/orders/route.ts
apps/chef-admin/src/app/api/payouts/request/route.ts
apps/chef-admin/src/app/api/payouts/setup/route.ts
apps/chef-admin/src/app/api/profile/route.ts
apps/chef-admin/src/app/api/storefront/availability/route.ts
apps/chef-admin/src/app/api/storefront/route.ts
apps/chef-admin/src/app/api/upload/route.ts
apps/driver-app/src/app/api/auth/login/route.ts
apps/driver-app/src/app/api/auth/logout/route.ts
apps/driver-app/src/app/api/auth/signup/route.ts
apps/driver-app/src/app/api/deliveries/[id]/route.ts
apps/driver-app/src/app/api/deliveries/route.ts
apps/driver-app/src/app/api/driver/presence/route.ts
apps/driver-app/src/app/api/driver/route.ts
apps/driver-app/src/app/api/earnings/route.ts
apps/driver-app/src/app/api/health/route.ts
apps/driver-app/src/app/api/location/route.ts
apps/driver-app/src/app/api/offers/route.ts
apps/ops-admin/src/app/api/analytics/trends/route.ts
apps/ops-admin/src/app/api/announcements/route.ts
apps/ops-admin/src/app/api/audit/recent/route.ts
apps/ops-admin/src/app/api/chefs/[id]/route.ts
apps/ops-admin/src/app/api/chefs/route.ts
apps/ops-admin/src/app/api/customers/[id]/notify/route.ts
apps/ops-admin/src/app/api/customers/route.ts
apps/ops-admin/src/app/api/deliveries/[id]/route.ts
apps/ops-admin/src/app/api/deliveries/route.ts
apps/ops-admin/src/app/api/drivers/[id]/route.ts
apps/ops-admin/src/app/api/drivers/route.ts
apps/ops-admin/src/app/api/engine/dashboard/route.ts
apps/ops-admin/src/app/api/engine/dispatch/route.ts
apps/ops-admin/src/app/api/engine/exceptions/[id]/route.ts
apps/ops-admin/src/app/api/engine/exceptions/route.ts
apps/ops-admin/src/app/api/engine/finance/route.ts
apps/ops-admin/src/app/api/engine/health/route.ts
apps/ops-admin/src/app/api/engine/maintenance/route.ts
apps/ops-admin/src/app/api/engine/orders/[id]/route.ts
apps/ops-admin/src/app/api/engine/payouts/route.ts
apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts
apps/ops-admin/src/app/api/engine/processors/sla/route.ts
apps/ops-admin/src/app/api/engine/refunds/route.ts
apps/ops-admin/src/app/api/engine/rules/route.ts
apps/ops-admin/src/app/api/engine/settings/route.ts
apps/ops-admin/src/app/api/engine/storefronts/[id]/route.ts
apps/ops-admin/src/app/api/export/route.ts
apps/ops-admin/src/app/api/health/route.ts
apps/ops-admin/src/app/api/orders/[id]/refund/route.ts
apps/ops-admin/src/app/api/orders/[id]/route.ts
apps/ops-admin/src/app/api/orders/route.ts
apps/ops-admin/src/app/api/promos/route.ts
apps/ops-admin/src/app/api/support/[id]/route.ts
apps/ops-admin/src/app/api/support/route.ts
apps/ops-admin/src/app/api/team/route.ts
apps/web/src/app/api/addresses/route.ts
apps/web/src/app/api/auth/login/route.ts
apps/web/src/app/api/auth/signup/route.ts
apps/web/src/app/api/cart/route.ts
apps/web/src/app/api/checkout/route.ts
apps/web/src/app/api/favorites/route.ts
apps/web/src/app/api/health/route.ts
apps/web/src/app/api/notifications/route.ts
apps/web/src/app/api/notifications/subscribe/route.ts
apps/web/src/app/api/orders/[id]/route.ts
apps/web/src/app/api/orders/route.ts
apps/web/src/app/api/profile/route.ts
apps/web/src/app/api/reviews/route.ts
apps/web/src/app/api/support/route.ts
apps/web/src/app/api/support/tickets/[id]/route.ts
apps/web/src/app/api/support/tickets/route.ts
apps/web/src/app/api/upload/route.ts
apps/web/src/app/api/webhooks/stripe/route.ts
```

*(77 entries — matches glob search.)*
