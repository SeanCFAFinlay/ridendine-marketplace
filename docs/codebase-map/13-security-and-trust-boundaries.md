# 13 — Security and Trust Boundaries

Static review from repository evidence only. No penetration testing, no runtime probing, no credentials used.

Diagram source: [`diagrams/trust-boundaries.mmd`](diagrams/trust-boundaries.mmd)

---

## 1. The governing structural fact

**Every API route in all four applications runs as the Supabase service role.**

`apps/{web,chef-admin,ops-admin,driver-app}/src/lib/engine.ts` all export `getAdminEngine as getEngine`. `getAdminEngine()` calls `createCentralEngine(createAdminClient())`, and `createAdminClient()` is documented in its own source as *"a Supabase admin client that bypasses RLS."*

So:

- The **316 RLS policies across 112 tables protect direct client access** — browser reads with the anon key (`NET-041`) and server-component reads bound to the user's own JWT (`NET-042`).
- On the **API tier, RLS is not a control at all.** Authorization is enforced entirely in application code.
- Every actor-resolution helper in `packages/engine/src/server.ts` also uses the admin client to look up the profile row. The session proves *who you are*; the service role does the *lookup*; application code decides *what you may do*.

This is a legitimate and internally consistent architecture — it is how most Next.js + Supabase systems are built once server-side business logic exists. **But it means a single missing guard in a single route handler is a full-database exposure, with no second line of defence.** Everything below should be read in that light.

## 2. Trust boundaries

| # | Boundary | Enforced by | Verified |
|---|---|---|---|
| **TB-1** | Internet → application | Vercel TLS; `next.config.js` security headers on all 4 apps (HSTS 2 y + preload, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `poweredByHeader: false`); **CSP with per-request nonce — `apps/web` only** | ✅ headers · ⚠️ CSP gap |
| **TB-2** | Anonymous → authenticated | `packages/auth/src/middleware.ts` → `supabase.auth.getUser()` (JWT verified against the Auth server, **not** `getSession()`) | ✅ |
| **TB-3** | Authenticated → authorised role | Actor resolvers requiring `approved` status; `guardPlatformApi(actor, capability)` over 30 capabilities × 8 roles, fail-closed; ops `/dashboard` layout requiring an active `platform_users` row | ✅ |
| **TB-4** | Authorised → own resources | `verifyChefOwnsStorefront`, `verifyChefOwnsOrder`, `verifyDriverOwnsDelivery`, `verifyMenuItemOwnership`; `getOperatorKitchenContext` re-validates `x-brand-id` against `kitchen_id` | ✅ |
| **TB-5** | Machine callers | Partner: SHA-256 key lookup + scopes + per-key rate limit + optional HMAC. Stripe: signature over the raw body. Cron: bearer/token, fails closed. | ✅ |
| **TB-6** | Application → database | **Service role — RLS bypassed.** RLS applies only to `NET-041`/`NET-042`. | ⚠️ by design |

## 3. Authorization matrix

`packages/engine/src/services/platform-api-guards.ts: CAPABILITY_ROLES` — the complete server-side matrix, read verbatim.

**Roles:** `super_admin`, `ops_admin`, `ops_manager`, `ops_agent`, `finance_admin`, `finance_manager`, `support_agent` (mapped from both `support` and `support_agent` rows), plus non-platform actors `customer`, `chef_user`, `driver`, `system`.

| Capability | Allowed roles | Enforcement point | Default |
|---|---|---|---|
| `platform_settings` | **super_admin only** | `guardPlatformApi` | deny |
| `team_manage` | **super_admin only** | `guardPlatformApi` | deny |
| `finance_refunds_read` / `_sensitive` / `finance_payouts` / `finance_engine` / `finance_export_ledger` | finance_admin, finance_manager, super_admin | `guardPlatformApi` | deny |
| `finance_refunds_request` | ops line + finance + super | `guardPlatformApi` | deny |
| `ops_orders_read`, `ops_entity_read`, `exceptions_read`, `ops_export_operational` | ops_agent, ops_admin, ops_manager, super_admin, **+ support_agent** (read-only triage) | `guardPlatformApi` | deny |
| `ops_orders_write`, `exceptions_write`, `dashboard_actions` | ops_agent, ops_admin, ops_manager, super_admin (**not** support_agent) | `guardPlatformApi` | deny |
| `order_override`, `audit_timeline_read`, `customers_write`, `chefs_governance`, `announcements` | ops_admin, ops_manager, super_admin (**no front-line agent**) | `guardPlatformApi` | deny |
| `dispatch_read`, `dispatch_write` | ops line | `guardPlatformApi` | deny |
| `dashboard_read`, `analytics_read` | ops line + finance + super | `guardPlatformApi` | deny |
| `support_queue` | support_agent + ops line + super | `guardPlatformApi` | deny |
| `promos` | ops_admin, ops_manager, finance_admin, finance_manager, super_admin | `guardPlatformApi` | deny |
| `team_list` | ops governance | `guardPlatformApi` | deny |
| `customers_read` | ops read | `guardPlatformApi` | deny |
| Customer resources | own `customer_id` | `getCustomerActorContext` | deny |
| Chef resources | own `chef_id` / `storefront_id` / `kitchen_id`, **status must be `approved`** | `getChefActorContext`, `getOperatorKitchenContext` | deny |
| Driver resources | own `driver_id`, **status must be `approved`** | `getDriverActorContext`, `verifyDriverOwnsDelivery` | deny |
| Partner | per-key `scopes` array | `partnerHasScope` | deny |

**Design quality:** the split between `OPS_READ` (includes support triage) and `OPS_LINE` (excludes it), and between `OPS_LINE` and `OPS_GOVERNANCE` (excludes front-line agents from overrides and audit history), shows genuine least-privilege thinking. `platform_settings` and `team_manage` — the two capabilities that could escalate privilege — are super-admin only. This matrix is a strength.

## 4. Findings

### Reachable, evidenced

| ID | Severity | Finding | Source → sink | Evidence |
|---|---|---|---|---|
| **V-01** | **HIGH** | **A live production database password sits in plaintext in the working tree** at `.env.local`. It is untracked and correctly gitignored, so it is not in Git history — but it is readable by every process, agent, backup and sync tool with access to this machine, and it grants full database access outside RLS. | local filesystem → `postgresql://…@aws-1-…pooler.supabase.com` | `.env.local`; `git ls-files --error-unmatch .env.local` → not tracked |
| **V-02** | **MEDIUM** | **Three of four apps have no Content-Security-Policy.** Only `apps/web` passes a `cspBuilder` to `createAuthMiddleware`. `chef-admin`, `ops-admin` and `driver-app` ship the other security headers but no CSP — so the **highest-privilege surface in the platform, the ops console, has no script-injection defence in depth**, while the public marketplace does. | any XSS in ops-admin → unrestricted script execution against a super-admin session | `apps/{chef-admin,ops-admin,driver-app}/src/middleware.ts` pass no `cspBuilder`; `apps/web/src/middleware.ts: buildCsp` |
| **V-03** | **MEDIUM** | **No error monitoring.** `@sentry/nextjs` is installed and configured but never initialised — no `withSentryConfig`, no `instrumentation.ts`, no import under `src/`, no Sentry code in the build output. Security-relevant failures produce no alert. | — | see `11-external-dependencies.md` §X-09 |
| **V-04** | **MEDIUM** | **Rate limiting silently degrades to per-instance memory** when `UPSTASH_*` is unset. On Vercel that multiplies the effective limit by the instance count. `auth` (5/min) and `checkout` (3/min) both depend on it. The `degraded` flag is emitted but, given V-03, nothing consumes it. | distributed credential stuffing → far weaker throttle than the policy states | `packages/utils/src/rate-limit/index.ts` |
| **V-05** | **LOW–MEDIUM** | **The guard audit is a text-presence check.** `scripts/audit/check-api-route-guards.mjs` asserts that one of 11 approved guard names appears **anywhere in the file**, only for `POST/PATCH/PUT/DELETE`. It does not verify the guard runs before the mutation, does not verify the *right* guard for the resource, and **ignores `GET` handlers entirely** — so every read endpoint is outside the gate. | a GET route that leaks data would pass CI | `check-api-route-guards.mjs: APPROVED_GUARDS, STATEFUL_METHODS` |
| **V-06** | **LOW** | `/internal/command-center/docs/[...docPath]` serves any file under `docs/` to **any authenticated session** with no capability check, while the sibling `change-requests` API correctly requires `team_manage`. Path traversal itself is blocked (`docs/` prefix required, `..` rejected after Next's decoding). Production-disabled unless `INTERNAL_COMMAND_CENTER_ENABLED=true`. | authenticated non-ops user → internal architecture docs | `apps/ops-admin/src/app/internal/command-center/docs/[...docPath]/route.ts` |
| **V-07** | **LOW** | **No dependency vulnerability scanning at all** — no Dependabot, no Renovate, no `pnpm audit` step, no CodeQL, no SCA — in a repository that processes payments. | unknown | `.github/` contains no such config |
| **V-08** | **LOW** | File uploads trust the **declared** `Content-Type` rather than inspecting magic bytes. The MIME allowlist, 5 MB cap, canonical extension mapping and user-scoped path all limit the impact, and the bucket is served from Supabase's domain, not the app's. | crafted upload → stored with a mismatched type | `apps/web/src/app/api/upload/route.ts: ALLOWED_TYPES` |
| **V-09** | **INFO** | `style-src` in the web CSP retains `'unsafe-inline'` (Next.js injects inline styles). The code comments this explicitly and accepts it. `script-src` correctly uses a nonce + `strict-dynamic`. | — | `apps/web/src/middleware.ts: buildCsp` |

### Weaknesses examined and found **not** reachable

| Class | Result |
|---|---|
| **SQL injection** | Not reachable. All access is via PostgREST (`supabase-js`) or parameterised repositories. No string-concatenated SQL was found in `apps/` or `packages/`. |
| **Command execution** | Not reachable. No `child_process`, `exec`, `spawn`, `eval` or `new Function` in application code. |
| **Path traversal** | One candidate (V-06), correctly defended. |
| **Insecure deserialization** | Not reachable. `JSON.parse` on validated payloads only; no `node-serialize`, no YAML loader on user input. |
| **SSRF** | Outbound URLs are constant (`nominatim`, `osrm`, `api.twilio.com`, Stripe SDK) or partner-registered `webhook_url` values. The partner webhook target is operator-configured, not caller-supplied — low risk, but no allowlist or private-IP block exists on it. |
| **Auth bypass** | Not found. `getUser()` over `getSession()`; `ALLOW_DEV_AUTOLOGIN` requires `NODE_ENV !== 'production'`; fixture reset triple-gated. |
| **Webhook forgery** | Not reachable. Both endpoints verify HMAC over the raw body before any processing. |
| **Tenant isolation** | Correct. `getOperatorKitchenContext` re-validates a client-supplied `x-brand-id` against `kitchen_id`, with a code comment explaining exactly why. |
| **Client-only controls** | Not found. Every finding traced to a server-side check. `platform-api-guards.ts` header says *"Fail closed; never trust client-supplied roles."* |
| **Confused deputy** | The service-role pattern is the systemic version of this risk (§1), mitigated by the guard gate. No specific instance found. |
| **CSRF** | Cookie-based sessions with `form-action 'self'` and `frame-ancestors 'none'` in the web CSP; state-changing routes are JSON POSTs requiring a parsed body. No explicit CSRF token layer exists — acceptable for a JSON API, but it rests on browsers enforcing `SameSite` on the Supabase cookies, which was not verified. |
| **Secrets in logs** | `redactSensitiveForLog` is applied on the webhook and error paths. Not exhaustively audited across all 180 routes. |

## 5. Positive security findings

Worth recording explicitly, because they are above the norm for a project this size:

1. `supabase.auth.getUser()` everywhere, with a code comment explaining why `getSession()` is unsafe.
2. Per-request CSP nonce with `strict-dynamic` in the public app — no `unsafe-inline` for scripts.
3. Partner API keys stored as SHA-256 hashes; legacy key compared with `timingSafeEqual`; minimum length enforced; fails closed.
4. Stripe webhook asserts the paid amount equals the order total **to the cent** and refuses otherwise.
5. Idempotency at every money boundary, backed by real database constraints rather than application checks alone.
6. A fail-closed, server-side capability matrix with genuine least-privilege distinctions.
7. RLS enabled on **all 112** tables with a consistent policy pattern, even though the API tier bypasses it.
8. `verify-prod-data-hygiene` prevents any CI workflow from seeding or resetting a non-local database — a gate that exists because it is a real, easy mistake.
9. Migration `00046_legacy_definer_function_lockdown` and `00042_remove_anon_bypass_policies` show the team actively closed earlier privilege holes.
10. `.gitignore` blocks a legacy `TEST_CREDENTIALS.md` filename purely so an accidental re-paste cannot re-enter the repository.

## 6. Priority

| Priority | Action |
|---|---|
| **1** | **Rotate the database password in S-01/V-01** and remove the production credential from the working tree. |
| **2** | Add a CSP to `chef-admin`, `ops-admin` and `driver-app` — `createAuthMiddleware` already accepts `cspBuilder`, so this is a small, low-risk change that closes the largest asymmetry in the security posture. |
| **3** | Wire Sentry (V-03). Security failures currently produce no signal. |
| **4** | Set `UPSTASH_*` in production, or accept and document that rate limits are per-instance (V-04). |
| **5** | Extend the guard audit to `GET` handlers and assert guard-before-mutation ordering (V-05). |
| **6** | Add dependency scanning (V-07). |
