# Phase 9 — Security hardening audit

## Secrets & env

| Topic | Finding |
|-------|---------|
| CI placeholders | `.github/workflows/ci.yml` uses non-production placeholders — **good** for merge gates |
| Local `.env*` files | Present per baseline — **rotation** required if ever committed (not auditing contents) |

## Auth bypass

| Topic | Status |
|-------|--------|
| `BYPASS_AUTH` in prod | **Fail-closed** — auth middleware tests |
| Processor routes | `validateEngineProcessorHeaders` in utils + tests |

## Rate limiting / DoS

| Topic | Severity | Notes |
|-------|-----------|--------|
| In-memory limits | **H** at scale | Documented; bypass across instances |
| Auth routes covered | **M** | login/signup rate limited on web/chef/driver |

## Webhook / payments

Signature before mutation — **VERIFIED** (`webhooks/stripe/route.ts`).

## Uploads (IRR-026)

MIME allowlist, size cap, extension from MIME not filename — **VERIFIED** in utils + route usage. **AV scan / private bucket** — infra **open**.

## Logging

Stripe webhook errors redacted — **VERIFIED** pattern with `redactSensitiveForLog`.

## CSRF / CORS

Next.js Route Handlers + same-site cookies — default posture; **no custom CORS** review performed (assume same-origin for mutations).

## SSRF / SQL injection

Repository pattern + Supabase client — **low** classic SQLi; **SSRF** not systematically reviewed (grep not run for `fetch(userUrl)` patterns).

## IDOR / service role on web

**Primary residual class** — IRR-003 incomplete audit.

## Direct references

- `packages/utils/src/rate-limiter.ts` — per-instance warning  
- `packages/utils/src/processor-auth.ts` — processor token validation  
- `packages/utils/src/redact-sensitive.ts` — redaction helpers  
