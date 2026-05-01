# Phase 3b — API risk register

Severity: **S** severe / **H** high / **M** medium / **L** low  
Owner: app or package.

| Route / area | Risk | Auth | Validation | RL | Tests | Owner | Sev |
|--------------|------|------|------------|-----|-------|-------|-----|
| `POST /api/webhooks/stripe` | Replay, forged events | Signature ✓ | Stripe constructs event | No | Jest `stripe-webhook-route.test.ts` + engine idempotency | web | **M** (ops if secret leaked) |
| `POST /api/checkout` | Abuse, card flow stress | Session ✓ | Body fields + engine readiness | Yes ✓ | Jest customer-ordering slice | web | **H** without distributed RL |
| Most `apps/web` GET/POST APIs | IDOR via admin client bug | Session — scope in repos | Partial per-route | Mostly **no** | Partial (`support`, ordering) | web | **H** until IRR-003 closed |
| `apps/ops-admin/api/engine/processors/*` | Unauthorized processor invoke | Token header | utils helper | No | utils `processor-auth` tests | ops-admin | **H** if token weak |
| `apps/ops-admin/api/export` | Data exfiltration | Finance capability | Query params | No | Partial | ops-admin | **M** |
| `POST .../api/location` (driver) | Spam / tracking abuse | Driver context | coords + time plausibility | Yes ✓ | utils + engine guard tests | driver-app | **M** |
| `apps/chef-admin/api/orders/*` | Cross-chef order access | Chef actor — **verify** every query filters `chef_id` | UUID | No | Lint-only subset | chef-admin | **H** suspected — needs negative tests |
| `GET /api/health` (all apps) | Info disclosure | Public | N/A | No | Implicit | all | **L** |
| `packages/engine/src/server.ts` | Extra HTTP attack surface if exposed | Depends deploy | — | — | Engine tests | engine | **M** suspected — confirm not public |

## Missing / uneven protections

1. **Rate limits:** Only checkout, uploads, auth signup/login (web/chef/driver), reviews, driver location use `checkRateLimit`. **Most read/write APIs** rely on auth + RLS/engine only — acceptable for MVP **if** auth solid; **not** sufficient against credential stuffing on unauth routes (partially covered on auth routes).

2. **Distributed rate limiting:** All `checkRateLimit` usage is **in-memory per instance** (`packages/utils/src/rate-limiter.ts` lines 1–8). **Confirmed defect class:** horizontal scale multiplies effective quota.

3. **RiskEngine:** Checkout **does not** call `evaluateCheckoutRisk` — **high** fraud gap vs IRR-022 acceptance.

4. **Documentation drift:** Some ops routes cast `createAdminClient() as any` (e.g. export, analytics) — raises type-safety and review burden (`apps/ops-admin/src/app/api/export/route.ts`, `analytics/trends/route.ts`).

## Service-role usage (unsafe context)

**Rule:** `createAdminClient` is **safe only** if handler enforces actor scope before queries.

- **Suspected risk:** Any web route that uses admin client without repository-enforced `customerId` (needs line-by-line IRR-003 pass).
- **Confirmed pattern:** Checkout uses `getCartWithItems(adminClient, customerContext.customerId, storefrontId)` — good scoping example (`apps/web/src/app/api/checkout/route.ts`).
