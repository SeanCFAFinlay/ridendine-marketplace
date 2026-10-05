# Program Map 15 — Findings from the File-Level Pass

Six findings that only became visible once **every** file was enumerated rather than sampled. These are additional to the 60 in [`../22-risk-and-improvement-register.md`](../22-risk-and-improvement-register.md).

---

## N-01 · Six tables exist in the schema that nothing ever reads or writes

**Status: VERIFIED · Confidence 0.95 · Severity: LOW (correctness/clarity), MEDIUM (as a signal)**

Cross-referencing all 113 `CREATE TABLE` names against every literal `.from('…')` in the codebase left 13 unreferenced. Nine were then checked by hand against the full text of `apps/`, `packages/`, `scripts/` and `e2e/`, excluding generated types. **Six have zero references anywhere in TypeScript, and zero `INSERT INTO` in any migration, trigger or function:**

| Table | Created in | RLS + policies? | Any writer? | Any reader? |
|---|---|---|---|---|
| `inventory_alerts` | `00056_inventory.sql` | Yes | **None** | **None** |
| `storage_locations` | `00056_inventory.sql` | Yes | **None** | **None** |
| `order_pack_checks` | `00060_close_day_and_service.sql` | Yes | **None** | **None** |
| `labor_cost_snapshots` | `00059_labour.sql` | Yes | **None** | **None** |
| `kitchen_station_assignments` | `00059_labour.sql` | Yes | **None** | **None** |
| `kitchen_ticket_events` | `00054_kitchen_ticket_state.sql` | Yes | **None** | **None** |

The clearest case is **`inventory_alerts`**. There is an alerts endpoint — `GET /api/chef-admin/api/inventory/alerts` — and it does not touch the table. It reads `inventory_items` and computes alerts in memory:

```ts
// apps/chef-admin/src/app/api/inventory/alerts/route.ts
import { computeInventoryAlerts, computeReorderSuggestion } from '@ridendine/engine';
...
  .from('inventory_items')          // ← not inventory_alerts
...
  const alerts = computeInventoryAlerts(...)
```

So alerts are **recomputed on every request and never persisted**. Consequences that follow from that design, none of which are currently possible: an alert cannot be acknowledged or snoozed, alert history cannot be reported on, and no alert can trigger a notification, because there is no row for anything to react to.

**Why this matters beyond the six tables.** Each carries RLS policies protecting data that never exists, and each appears in the generated `database.types.ts` as though it were part of the model. A developer reading the schema would reasonably conclude these features are implemented. They are scaffolding for a design that stopped at the migration.

**Recommended action:** for each table, decide explicitly — finish the feature, or drop the table in a new forward-only migration. Either is fine; leaving them is what misleads. Start with `inventory_alerts`, because persisting alerts is the prerequisite for ever notifying a chef that they are about to run out of an ingredient.

**Caveat, stated plainly:** a table with no literal `.from()` is *not proof* of disuse on its own — a name could be built from a variable, or reached through an embedded PostgREST select. That is why these six were each confirmed by full-text search across the repository and by checking for SQL-side writers. The other seven of the original thirteen (`delivery_assignments`, `driver_earnings`, `driver_vehicles`, `kitchen_ticket_items`, `labor_allocations`, `menu_item_availability`, plus the `IF` parsing artefact) **do** have references and are not implicated.

---

## N-02 · The complete list of routes with no authorization guard — all 16 are justified

**Status: VERIFIED · Confidence 1.00 · No action required**

`pnpm audit:guards` reports "0 unguarded" but only inspects state-changing methods and only checks that a guard *string* is present. Enumerating every route file independently gives the true list of route files containing **no guard call of any kind**:

| Route | Methods | Why it is correctly unguarded |
|---|---|---|
| `web · /api/auth/login` | POST | On the CI public allowlist — establishes the session |
| `web · /api/auth/signup` | POST | Allowlist |
| `chef-admin · /api/auth/login` | POST | Allowlist |
| `chef-admin · /api/auth/signup` | POST | Allowlist |
| `ops-admin · /api/auth/login` | POST | Allowlist |
| `driver-app · /api/auth/signup` | POST | Allowlist |
| `driver-app · /api/auth/logout` | POST | Allowlist |
| `web · /api/health` | GET | Allowlist — full payload gated by `HEALTH_CHECK_TOKEN` |
| `chef-admin · /api/health` | GET | Allowlist — external uptime monitors |
| `ops-admin · /api/health` | GET | Allowlist |
| `driver-app · /api/health` | GET | Allowlist |
| `web · /api/webhooks/stripe` | POST | Allowlist — authenticated by **HMAC signature**, not a session |
| `ops-admin · /api/stripe/webhook` | POST | Allowlist — HMAC signature |
| `web · /api/storefronts` | GET | **Public marketplace read.** Anonymous browsing is the product. |
| `web · /api/storefronts/[id]` | GET | Public marketplace read |
| `web · /api/storefronts/[id]/menu` | GET | Public marketplace read |

**Every one is deliberate and correct.** Thirteen are on the explicit allowlist in `scripts/audit/check-api-route-guards.mjs`; the remaining three are the anonymous storefront reads that make the marketplace browsable, and they are read-only `GET`s protected by RLS on the browser path.

This is worth recording because it closes a gap in the existing gate. The gate proves state-changing routes have a guard; **this table proves the converse — that nothing unguarded is doing anything it shouldn't.** Combined, the two give complete coverage of the authorization surface. It also confirms that finding **S-04** (the gate ignores `GET`) is a *methodology* weakness rather than a live exposure: no `GET` route is currently leaking.

---

## N-03 · The db-boundary erosion, seen by file rather than by call

**Status: VERIFIED · Confidence 1.00 · Reframes M-01**

The ratchet counts 398 individual `.from()` **call sites**. Counting **files** instead shows how concentrated the problem is:

| App | Files containing raw `.from()` | Call sites (ratchet baseline) | Calls per file |
|---|--:|--:|--:|
| `chef-admin` | **73** | 259 | 3.5 |
| `web` | 25 | 71 | 2.8 |
| `driver-app` | 19 | 53 | 2.8 |
| `ops-admin` | 3 | 15 | 5.0 |
| **Total** | **120** | **398** | 3.3 |

**`ops-admin` is the proof that the repository pattern works.** It has the largest API surface of any app (57 routes) and only **three** files that bypass the repositories — because `ops.repository.ts` (932 lines), `finance.repository.ts`, `platform.repository.ts` and `team.repository.ts` exist and cover its domains.

`chef-admin` has 73 such files because **no repository was ever written for recipes, inventory, production, purchasing, suppliers, labour or kitchen**. This is the concrete, countable version of `CLAUDE.md`'s own note that the missing repositories are the real task. The work is bounded and measurable: **write 7 repositories, retire 73 files' worth of direct access.**

---

## N-04 · Maintenance hotspots — the fifteen largest source files

**Status: VERIFIED · Informational**

| Lines | File | Note |
|--:|---|---|
| 2,042 | `scripts/wiring/generate-wiring-docs.cjs` | **The largest file in the repository is a documentation generator** — and it is the thing blocking documentation refresh (DOC-01). Its line 317 PARTIAL rule is why regenerating breaks a gate. |
| 1,251 | `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx` | Largest React component; the driver's core screen |
| 1,149 | `packages/db/src/database.merged.ts` | Type surface |
| 1,052 | `packages/engine/src/orchestrators/commerce.engine.ts` | Refunds + payouts + ledger writes in one class |
| 940 | `packages/engine/src/orchestrators/master-order-engine.ts` | CRITICAL blast radius (122 dependent symbols) |
| 938 | `apps/driver-app/src/app/components/DriverDashboard.tsx` | |
| 932 | `packages/db/src/repositories/ops.repository.ts` | |
| 923 | `scripts/wiring/generate-supabase-diagrams.cjs` | Second-largest file is also a doc generator |
| 888 | `packages/db/src/repositories/order.repository.ts` | |
| 882 | `apps/web/src/app/checkout/page.tsx` | Largest page component |
| 878 | `supabase/seeds/seed.sql` | |
| 876 | `apps/chef-admin/src/app/dashboard/page.tsx` | |
| 794 | `packages/engine/src/services/payout.service.ts` | |
| 788 | `packages/engine/src/orchestrators/kitchen.engine.ts` | |
| 760 | `packages/engine/src/orchestrators/support.engine.ts` | |

**The observation worth drawing out:** the two largest files in a payments-handling marketplace are both *documentation generators*, together 2,965 lines. That is roughly three times the size of `MasterOrderEngine`, the class that governs every order in the system. It is a fair signal of where effort has accumulated relative to where risk lives.

`commerce.engine.ts` at 1,052 lines carries payment authorisation, capture, the five-step refund workflow, Stripe refund creation, payout holds and financial summaries in a single class. It is the most reasonable candidate for decomposition in the engine, and it is one of the two places the payout split math is duplicated (I-02).

---

## N-05 · 82 symbol names are defined in more than one file — and the most alarming one is fine

**Status: VERIFIED · Confidence 1.00 · Mostly benign**

The symbol index found 82 names with multiple definitions. Most are the ordinary consequence of per-app page components (`AnalyticsPage` in both chef-admin and ops-admin) or a type declared next to both its repository and its domain model (`Cart`, `CartItem`, `ChefProfile`, `ChefStorefront`).

`AuthLayout` looked like the worst case — **five** definitions. It was checked directly and it is **not duplication**:

```ts
// apps/web/src/components/auth/auth-layout.tsx  (36 lines)
import { AuthLayout as SharedAuthLayout } from '@ridendine/ui';
```

Both `apps/web` and `apps/chef-admin` define a thin local adapter that wraps the shared 51-line `packages/ui` component with app-specific branding. That is the intended pattern, correctly applied. Recorded here so nobody "fixes" it.

**Genuinely worth attention** is the type duplication between `packages/db/src/repositories/*.repository.ts` and `packages/types/src/domains/*.ts` — `Cart`, `CartItem`, `CartWithItems`, `ChefProfile`, `ChefStorefront` and others are declared in both. Two independent definitions of the same domain shape can drift silently, and TypeScript will not object because nothing forces them to be the same type. The full list is in [`10-symbol-index.md`](10-symbol-index.md).

---

## N-06 · Two names used in `.from()` that are not tables — both correct

**Status: VERIFIED · No action required**

| Name | Where | What it actually is |
|---|---|---|
| `partner_api_stats` | `apps/ops-admin/src/app/api/engine/partner-stats/route.ts` | A **view**, created in `00053_partner_signing_and_stats.sql`. Correct usage. |
| `driver_profiles` | `scripts/wiring/verify-known-wiring-fixes.cjs` | A **regression assertion** — the wiring verifier checks that this non-existent table name has not reappeared in the code. Working as designed. |

(A third match, `table`, is the literal string inside the `db-boundary` ESLint rule and the ratchet script that detect `.from()` calls — the extractor matching its own detector.)

---

## What this pass did not change

The file-level enumeration **confirmed** every structural claim in the architecture set — route counts, page counts, table counts, guard coverage, package boundaries, the dead-code list and the scheduling mismatch (R-01) all held. Nothing in the architecture analysis was contradicted by walking the remaining files.

The value of the complete pass was in the **negative space**: things that exist and are never used, which sampling cannot find by construction. Five of the six findings above are of that kind.
