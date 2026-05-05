# Customer ordering flow (Phase 6)

**Apps:** `apps/web` only (customer marketplace).  
**Aligns with:** [`docs/ORDER_FLOW.md`](ORDER_FLOW.md), [`docs/API_FOUNDATION.md`](API_FOUNDATION.md), [`docs/BUSINESS_ENGINE_FOUNDATION.md`](BUSINESS_ENGINE_FOUNDATION.md).

---

## Flow overview

1. Browse chefs → cart (`/cart`, `storefrontId` in context/query).  
2. Checkout (`/checkout?storefrontId=…`) — authenticated customer; cart + addresses from API.  
3. **Continue to payment** — `POST /api/checkout` creates order + PaymentIntent via engine; returns `clientSecret`, `orderId`, `breakdown`, `total`.  
4. Stripe `confirmPayment` — `return_url` points at **canonical confirmation** below.  
5. **Order confirmation** — `GET /orders/[id]/confirmation` (server component + live tracker).  
6. Legacy bookmarks `/order-confirmation/[id]` → **308/redirect** to `/orders/[id]/confirmation` (IRR-011).

---

## Source of truth

| Concern | Owner |
|---------|--------|
| **Cart lines** | `GET /api/cart?storefrontId=` → `@ridendine/db`; UI displays fetched lines only. |
| **Fees, tax, tip, total** | `POST /api/checkout` → `@ridendine/engine` `createOrder` + Stripe PI amount; **no** hardcoded delivery/service/tax in checkout UI after Phase 6. |
| **Pre-payment sidebar (details step)** | Cart **subtotal** + customer-selected **tip** (dollars); explanatory copy that full totals come from the server on the next step. |
| **Post-payment display** | `breakdown` from checkout API on payment step; confirmation page reads order from Supabase server client. |

---

## Auth

- **Checkout** — Customer session required (`getCustomerActorContext` in checkout API → 401 if missing). Middleware should protect `/checkout` (see [`docs/AUTH_ROLE_MATRIX.md`](AUTH_ROLE_MATRIX.md)).  
- **Confirmation** — `orders/[id]/confirmation` uses cookie session; unauthenticated users may hit “order not found” if RLS blocks read (expected).

---

## Canonical routes (IRR-011)

| Route | Role |
|-------|------|
| **`/orders/[id]/confirmation`** | **Canonical** post-checkout confirmation + live tracker + review when delivered. |
| **`/order-confirmation/[orderId]`** | **Legacy** — server `redirect()` to canonical path; keep file for bookmarks and old Stripe return URLs until all clients updated. |

Internal links and Stripe `return_url` use `orderConfirmationPath()` from `apps/web/src/lib/customer-ordering.ts`.

---

## API endpoints (customer ordering)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cart?storefrontId=` | Load cart + items |
| POST | `/api/cart` | Mutate cart (not expanded here) |
| GET | `/api/addresses` | Delivery address picker |
| POST | `/api/checkout` | Create order, authorize payment intent, return Stripe client secret + breakdown |

---

## Chef / vendor signup (IRR-031)

- Marketing + application form: **`/chef-signup`** (web).  
- **Account creation** for the chef app: **`{NEXT_PUBLIC_CHEF_ADMIN_URL}/auth/signup`**  
- Optional override: **`NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL`** (full URL) if signup path differs per environment.  
- **Chef login:** `{NEXT_PUBLIC_CHEF_ADMIN_URL}/auth/login`  
- If `NEXT_PUBLIC_CHEF_ADMIN_URL` is unset, the portal CTAs show a dev warning only — no fake URLs.

---

## Payment handoff

- Stripe Elements on checkout **payment** step only after successful `POST /api/checkout`.  
- **`return_url`:** `${origin}/orders/{orderId}/confirmation` — must match deployed host.  
- **Phase 9 (ledger):** capture/settlement, refunds, and `ledger_entries` durability remain out of scope for Phase 6.

---

## Realtime tracking (Phase 11)

- `LiveOrderTracker` and related client subscriptions are the right place to deepen realtime; confirmation page is server-first today.

---

## Error / empty states

- Empty cart at checkout → link to browse chefs.  
- Checkout API errors → inline message on checkout page.  
- Missing `storefrontId` → checkout load no-ops (consider tightening in a later pass).  
- Order not found on confirmation → “Browse Chefs” CTA.

---

*Phase 6 deliverable — customer path coherence without changing chef/driver/ops apps.*
