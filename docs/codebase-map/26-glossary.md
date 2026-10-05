# 26 — Glossary

Terms as this codebase uses them, not as the industry generally uses them. Where the two differ, that is noted — those differences are where misunderstandings start.

---

## Domain

| Term | Meaning here |
|---|---|
| **Storefront** | A chef's public listing (`chef_storefronts`). The **primary listing entity** — the platform is chef-first, so a storefront is not a restaurant location, it is a cook's shop. |
| **Kitchen** | A physical commissary (`chef_kitchens`). One kitchen can host several **brands** (storefronts). Shared operational data — inventory, suppliers, labour, production — scopes to the *kitchen*; menu, recipes and orders scope to the *brand*. |
| **Brand** | A storefront in the ghost-kitchen model. Selected by the `x-brand-id` header, re-validated server-side against `kitchen_id`. |
| **Kitchen OS** | The operations suite layered on the marketplace: recipes, costing, inventory, suppliers, purchasing, production planning, labour, close-day, P&L. 32 tables added by migrations `00054`–`00063`. |
| **Ticket** | A kitchen work item (`kitchen_tickets`), distinct from a support ticket (`support_tickets`). |
| **Offer** | A delivery proposed to a specific driver with an expiry (`assignment_attempts`). Declining costs a driver −8 score; letting it expire costs −10. |
| **Presence** | A driver's live availability + location (`driver_presence`). **Stale after 90 seconds** — the driver silently disappears from dispatch. |
| **Partner** | An external business selling Ridendine food through the API. Ridendine remains merchant of record. |
| **Test mode** | A partner key flagged `test_mode`, producing `is_test` orders that transact against Stripe test mode and are kept out of the kitchen, finance, ledger, loyalty and payouts. |
| **Surge** | A demand/supply multiplier (1.0 → 2.0 cap) applied **only to the distance portion** of the delivery fee, before the $9.99 cap. |
| **Service area** | A geographic region carrying a `surge_multiplier`. |
| **Delivery zone** | 25 km around Hamilton, Ontario city centre. Hard-coded. |

## Architecture

| Term | Meaning here |
|---|---|
| **Engine** | `@ridendine/engine` — the central business-logic package and the only sanctioned writer of lifecycle and money state. |
| **Orchestrator** | A class owning a lifecycle domain and its state transitions (`packages/engine/src/orchestrators/`). |
| **Service** | A stateless capability, usually wrapping one external system or one calculation (`packages/engine/src/services/`). |
| **Master Order Engine** | `MasterOrderEngine` — the single authority for order state. **CRITICAL blast radius** (122 dependent symbols). |
| **Canonical engine** | An orchestrator that owns state, as opposed to a **facade** that delegates to one. `orders`, `dispatch` and others on the engine object are facades pointing at canonical engines. |
| **Processor** | An HTTP endpoint under `/api/engine/processors/*` intended to be invoked by a scheduler. **Its work is in `POST`.** |
| **Actor** | `ActorContext { userId, role, entityId? }` — resolved server-side, never taken from the client. |
| **Capability** | A named permission (e.g. `finance_payouts`) mapped to roles in `CAPABILITY_ROLES`. |
| **Guard** | A function that resolves an actor and refuses the request if unauthorised. Eleven names are on the approved list checked by CI. |
| **Repository** | A typed data-access function in `packages/db/src/repositories/`. 22 exist; **seven Kitchen OS domains have none**, which is why 398 raw `.from()` calls remain. |
| **db-boundary** | The rule that all database access goes through repositories, enforced by a custom ESLint rule and a **ratchet** that blocks new violations while accepting 398 at baseline. |
| **Ratchet** | A gate that permits an existing count of violations but fails on any increase. |
| **Admin client** | `createAdminClient()` — the Supabase **service-role** client that **bypasses RLS**. Every API route uses it. |
| **Server client** | `createServerClient(cookieStore)` — bound to the signed-in user's JWT; **RLS applies**. |
| **Browser client** | Anon key; **RLS applies**. |

## Lifecycle

| Term | Meaning here |
|---|---|
| **`engine_status`** | The **canonical** order status — 24 values. Always prefer this. |
| **`status`** | The **legacy** order status — 11 values, mirrored from `engine_status` through a **lossy** map. Four dispatch states collapse to `ready_for_pickup`; `EXCEPTION` and `CANCEL_REQUESTED` both collapse to `pending`. |
| **Transition map** | `ORDER_TRANSITION_MAP`, `DELIVERY_TRANSITION_MAP`, `PAYOUT_TRANSITION_MAP` — the exhaustive lists of legal moves. Anything else throws. |
| **Terminal status** | A state with no outgoing edges except explicit exceptions. Orders: `COMPLETED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `FAILED`. Payouts: `PAID` only. |
| **Ops override** | `opsOverride` — the audited escape hatch that moves an order outside the transition map. |
| **SLA timer** | A deadline row (`sla_timers`) processed by the SLA processor into warnings and breaches. |

## Money

| Term | Meaning here |
|---|---|
| **Ledger entry** | An immutable money record (`ledger_entries`), idempotent on `{entryType}:{sourceId}`. |
| **Payout run** | A batch payment to chefs or drivers for a period. At most one may be `processing` per type. |
| **Instant payout** | A driver's on-demand cash-out, carrying an explicit fee with its own ledger entry type and a reversal path. |
| **Reconciliation** | Comparing `ledger_entries` against Stripe. Implemented; **not scheduled**. |
| **Platform fee** | 15% of the order subtotal. |
| **Driver payout percent** | 80% of the delivery fee. |
| **Service fee** | 8% of subtotal, charged to the customer. Runtime-overridable from `platform_settings`. |
| **HST** | 13% Ontario harmonised sales tax, computed on `subtotal + deliveryFee + serviceFee` **before** any promo discount. |

## Operations

| Term | Meaning here |
|---|---|
| **Gate** | A CI check that must pass: `typecheck`, `lint`, `audit:guards`, `audit:db-boundary`, `verify:prod-data-hygiene`, `test`, `test:wiring-fixes`, `build`. |
| **Wiring docs** | Generated inventories in `docs/wiring/`. Currently stale, and regenerating them breaks a gate — see `21` X-06. |
| **Smoke** | Two different things: `scripts/smoke/*` (runtime contract checks against deployed URLs) and Playwright specs tagged `@smoke`. |
| **Runtime contract** | An assertion that a deployed surface behaves as expected — public pages load, protected endpoints reject anonymous callers. |
| **Fixture** | Deterministic seed data for E2E tests, keyed on order number `RD-E2E-LIFECYCLE`. |
| **Maintenance mode** | A `platform_settings` flag that redirects **customer web** traffic to `/maintenance`. Covers `apps/web` only, and **fails open** if the lookup fails. |
| **Correlation ID** | A per-request identifier from `packages/utils/src/correlation-id.ts`. Available everywhere, applied in few places. |
| **GitNexus** | A code-intelligence index of this repository (64,374 symbols) used by agents. Its `.gitnexus/` directory is 309 MB and is not source. |
| **Graphify** | A knowledge-graph generator. Its `graphify-out/` output appears in **eight** directories and is never source. |

## Evidence labels used in this package

| Label | Meaning |
|---|---|
| **VERIFIED** | Executable code or active configuration **plus** a runtime linkage. |
| **INFERRED** | Converging clues; unprovable without runtime observation. |
| **POSSIBLE** | Plausible from limited evidence. Never drawn as fact in a diagram. |
| **CONTRADICTED** | Repository sources make incompatible claims. |
| **UNKNOWN** | The repository does not contain enough evidence. |
| **INACTIVE** | Present but disabled, unreachable, deprecated, or unused in the inspected configuration. |

## Identifier prefixes

| Prefix | Meaning | Document |
|---|---|---|
| `C-nn` | Component | 05 |
| `NET-nnn` | Connection | 06 |
| `E-nn` | Entry point | 07 |
| `X-nn` | External service | 11 |
| `F-nn` | Failure mode | 14 |
| `V-nn` | Security finding | 13 |
| `EV-nnn` | Evidence record | 25 |
| `R-nn` | Top-level risk | 01, 22 |
| `U-nn` | Unknown | 21 |
| `X-nn` (in 21) | Contradiction — note the collision with external-service IDs in 11; context distinguishes them | 21 |
| `S-`, `I-`, `O-`, `T-`, `M-`, `P-`, `DOC-`, `C-` (in 22) | Security, correctness, operability, test, maintainability, performance, documentation, cost | 22 |
