# Cross-app contracts — Ridendine monorepo

**Phase:** 1 — Source-of-truth documentation  
**Purpose:** Canonical boundaries between apps and packages so implementation phases do not duplicate ownership or drift behavior.

---

## Canonical applications (`apps/`)

| Path | Role | Primary users |
|------|------|----------------|
| `apps/web` | Customer / public marketplace (browse, cart, checkout, account) | Customers, guests (per product policy) |
| `apps/chef-admin` | Chef / vendor operations (menu, storefront, orders, payouts) | Approved chefs |
| `apps/driver-app` | Driver / courier PWA (offers, deliveries, presence, earnings) | Approved drivers |
| `apps/ops-admin` | Admin / business control center (engine APIs, finance, dispatch, support) | `platform_users` (ops roles) |

**Rule:** No app re-implements another app’s primary surface. Cross-links (e.g. marketing “chef signup”) deep-link to the owning app using env-based URLs from `.env.example` / deployment config.

---

## API foundation (Phase 4)

See [`docs/API_FOUNDATION.md`](API_FOUNDATION.md) for Stripe singleton, health envelope, JSON error helpers, and route-handler ordering (auth → engine → response).

## Business engine foundation (Phase 5)

See [`docs/BUSINESS_ENGINE_FOUNDATION.md`](BUSINESS_ENGINE_FOUNDATION.md) for engine vs API vs UI ownership, **RiskEngine** (IRR-022), and order/delivery canonical status alignment with [`docs/ORDER_FLOW.md`](ORDER_FLOW.md) (IRR-017).

## Canonical packages (`packages/`)

| Path | Role |
|------|------|
| `packages/engine` | **Business logic source of truth** — order lifecycle, dispatch, commerce rules, platform maintenance, notifications orchestration, audit hooks; **canonical Stripe server client** (`getStripeClient`, `STRIPE_API_VERSION`). |
| `packages/db` | **Database access and generated types** — Supabase clients, repositories, `src/generated/database.types.ts` (regenerated from DB; see `packages/db/package.json`). |
| `packages/auth` | **Auth / session middleware factory** — shared `createAuthMiddleware` for all Next apps. |
| `packages/ui` | **Shared presentational UI** — primitives used by multiple apps. |
| `packages/types`, `packages/validation`, `packages/utils`, `packages/config`, `packages/notifications` | Cross-cutting types, Zod schemas, utilities, shared config, notification templates. |

---

## Canonical data and docs

| Artifact | Role |
|----------|------|
| `supabase/migrations/*.sql` | **Database schema source of truth** — all DDL and RLS evolution. |
| `docs/DATABASE_SCHEMA.md` | **Human-readable schema reference** — must stay aligned with migrations and regenerated types (see that file’s “Source of truth” and “Known drift” sections). |
| `docs/AUTH_ROLE_MATRIX.md` | **Auth and platform role matrix** — which roles may access which apps and ops API capability groups; checkout policy (IRR-002); `BYPASS_AUTH` rules (IRR-030). Phase 2 deliverable. |

---

## Request / mutation pipeline (non-negotiable)

These rules mirror [`AUDIT_AND_PLANNING/25_ERROR_AND_DRIFT_PREVENTION_RULES.md`](../AUDIT_AND_PLANNING/25_ERROR_AND_DRIFT_PREVENTION_RULES.md) and the execution plan:

1. **UI calls API** — Browser code talks to Next Route Handlers (or server components that use the same server-only data layer), not directly to privileged Supabase service role.
2. **API validates auth and role** — Session + actor context; ops routes assert `platform_users` role where required.
3. **API calls engine** — Mutations that change money, inventory, assignment, or order state go through `@ridendine/engine` (or approved facades), not duplicated in route files.
4. **Engine writes database** — Engine uses `@ridendine/db` repositories / admin client patterns already established in the codebase.
5. **Money actions write ledger** — Any charge, capture, refund, or fee adjustment must persist to **`ledger_entries`** (or documented exception in audit tracker) before closing payment-related issues.
6. **Admin actions write audit log** — Overrides and sensitive ops mutations must write **`audit_logs`** / **`ops_override_logs`** / **`domain_events`** as applicable per existing engine patterns.
7. **Order changes write status history / domain event** — Persist `order_status_history` and emit/propagate **`domain_events`** per engine design for downstream realtime and analytics.

---

## Out of scope for this document

- Runtime environment secrets and deployment URLs (see `.env.example` and future `docs/RUNBOOK_DEPLOY.md`).
- Legal/compliance text (terms, privacy) owned by `apps/web` static pages and counsel review.

---

*Maintained under Ridendine production upgrade — link from `CLAUDE.md` or onboarding docs when convenient.*
