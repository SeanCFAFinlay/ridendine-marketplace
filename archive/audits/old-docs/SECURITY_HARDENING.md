# Security hardening (Phase 15)

Canonical references: [`docs/AUTH_ROLE_MATRIX.md`](AUTH_ROLE_MATRIX.md), [`docs/API_FOUNDATION.md`](API_FOUNDATION.md), [`AUDIT_AND_PLANNING/25_ERROR_AND_DRIFT_PREVENTION_RULES.md`](../AUDIT_AND_PLANNING/25_ERROR_AND_DRIFT_PREVENTION_RULES.md).

---

## 1. Auth model

- **Customer / chef / driver:** Next.js apps use `@ridendine/auth` middleware + Supabase session cookies (`createServerClient`).
- **Ops:** `platform_users` roles; `getOpsActorContext` + `guardPlatformApi` on API routes (see AUTH_ROLE_MATRIX).
- **BYPASS_AUTH (IRR-030):** `packages/auth` middleware **throws at startup** if `NODE_ENV === 'production'` and `BYPASS_AUTH === 'true'`. Covered by `packages/auth/src/middleware.test.ts`.

---

## 2. Role enforcement

- Ops-admin mutations use **`guardPlatformApi(actor, capability)`** — see `packages/engine/src/services/platform-api-guards.ts`.
- Do not trust client-sent roles; always derive actor from session + DB.

---

## 3. API protection (service role on web — IRR-003)

`createAdminClient` on web is used where RLS or cross-table writes require service role. **Rules:**

1. Resolve **`customer_id`** (or chef context) from **`auth.users`** via session **before** any mutation.
2. Scope queries with `.eq('customer_id', customer.id)` (or equivalent) — never accept a client `customerId` for authorization.
3. **Phase 15 additions:** `POST /api/favorites` validates `storefrontId` as UUID. `GET`/`POST` `/api/reviews` validates `storefrontId` / `orderId` as UUID to reduce injection and garbage input.

Full audit of every web route remains a **continuous** task; prioritize checkout, orders, addresses, and cart next.

---

## 4. Processor / cron endpoints (IRR-006)

- **`validateEngineProcessorHeaders`** in `@ridendine/utils` (`packages/utils/src/processor-auth.ts`).
- Accepts **`Authorization: Bearer <CRON_SECRET>`** (Vercel Cron) or **`x-processor-token: <ENGINE_PROCESSOR_TOKEN>`**.
- **Fail closed** if neither env var is set (returns `false` → route returns **401**).
- Used by:
  - `apps/ops-admin/src/app/api/engine/processors/sla/route.ts`
  - `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts`

---

## 5. Rate limiting

- **`@ridendine/utils`** `checkRateLimit` / `getClientIp` / `RATE_LIMITS` — applied on e.g. **`POST /api/upload`**, **`POST /api/reviews`**, driver location API (see `DRIVER_DELIVERY_FLOW.md`).
- In-memory limiter: per serverless instance; document limits in API_FOUNDATION.

---

## 6. Webhook safety (Stripe)

- **`POST /api/webhooks/stripe`:** Requires **`stripe-signature`**; **`constructEvent`** validates body + secret (`STRIPE_WEBHOOK_SECRET` must be set).
- **Idempotency:** `claimStripeWebhookEventForProcessing` (engine) before side effects (IRR-008).
- **Logging (IRR-027):** Errors and audit payloads use **`redactSensitiveForLog`** to strip emails, Stripe keys, webhook secrets, long digit runs, and truncate Stripe object ids in free text.

---

## 7. Upload safety (IRR-026)

- **MIME allowlist:** JPEG, PNG, WebP, GIF only.
- **Size:** 5MB max (web + chef-admin profile/menu routes).
- **Extension:** **`canonicalImageExtensionForMime`** — file extension is taken from **declared MIME type**, not untrusted `file.name`, to avoid double-extension / path tricks.
- **Auth:** Web requires session user; chef requires `getChefBasicContext()`.
- **Buckets:** Still **public** read URLs for avatars/menu images; private-bucket migration is infra follow-up.

---

## 8. Logging rules

- Prefer **structured** fields (codes, entity UUIDs).
- Run user-facing error strings through **`redactSensitiveForLog`** before `console.error` or audit rows when content may include Stripe or user-supplied text.
- Never log **`Authorization`** headers, raw card numbers, or full webhook bodies.

---

## 9. Environment rules

- **Production:** `BYPASS_AUTH` must not be enabled (see above).
- **Stripe:** `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` (server only), publishable key for client.
- **Processors:** `CRON_SECRET` and/or `ENGINE_PROCESSOR_TOKEN` must be set in any environment that should run processors.

---

## 10. Known remaining risks

- **Distributed rate limits:** single-instance buckets only — use Redis/Upstash for global limits if needed.
- **Web admin client surface:** additional routes should be reviewed for IRR-003 scoping.
- **Upload malware scanning:** MIME + size only; no AV scan in-app.
- **Chef-admin upload error responses:** generic **500** message (no stack leakage) after Phase 15.

---

## 11. Tests (Phase 15)

- **`packages/utils/src/security-hardening.test.ts`:** redaction, processor headers, MIME extension map, `isUuid`.

Run: `pnpm --filter @ridendine/utils test`
