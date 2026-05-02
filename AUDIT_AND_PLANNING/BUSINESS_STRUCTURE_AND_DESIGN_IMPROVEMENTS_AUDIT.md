# Business structure & app design — improvement audit

**Date:** 2026-05-01  
**Repo sync:** `master` and `ridendine-prelaunch-repair-checkpoint` both at `29f15c0`; `git push origin master` and `git push origin ridendine-prelaunch-repair-checkpoint` report **Everything up-to-date**.

**Sources:** `docs/BUSINESS_ENGINE_FOUNDATION.md`, `docs/CROSS_APP_CONTRACTS.md`, `docs/DATABASE_SCHEMA.md` (known drift), `docs/MOBILE_UI_RESPONSIVE_CHECKLIST.md`, `docs/ORDER_FLOW.md`, representative API routes under `apps/*`.

---

## Executive summary

| Area | Current state | Priority improvement |
|------|----------------|------------------------|
| **Business structure** | Strong **intended** split: UI → API → **engine** → DB; many mutations already go through `getEngine()` / `createCentralEngine`. | Close remaining **side doors** (direct DB writes, legacy status labels) so ops/chef/driver/web **cannot** diverge. |
| **App design** | Four Next apps + `@ridendine/ui`; docs define responsive and password-strength rules. | **Unify product language** (“merchant platform”) across apps; run the **mobile checklist** on real devices; tighten **empty/error** states on dashboards. |

---

## Part A — Business structure improvements

### A1. Make the engine the only authority for “business moves”

**Why:** You want Ridendine to feel like **one work engine** behind chefs, drivers, and ops.

| # | Recommendation | Evidence / rationale |
|---|----------------|----------------------|
| 1 | **Inventory mutations** that still bypass `MasterOrderEngine` / `DeliveryEngine`** (grep for `.from('orders').update` etc. outside `packages/engine`). Route each through engine or document an explicit exception. | `BUSINESS_ENGINE_FOUNDATION.md` — “extend coverage if any transition bypasses the engine.” |
| 2 | **Unify legacy vs engine status** in every UI label — always show **one canonical story** (engine status) with optional “customer-friendly” subtitle from the mapping in `ORDER_FLOW.md`. | Reduces “why does ops say X and chef says Y?” |
| 3 | **Persist risk decisions** when you turn RiskEngine on for live checkout — today doc notes risk audit payload can be in-memory only until wired. | `BUSINESS_ENGINE_FOUNDATION.md` audit/event gaps table. |
| 4 | **Money path audit** — every refund/capture/fee adjustment should hit **commerce + `ledger_entries`** (per `CROSS_APP_CONTRACTS.md` rule 5). Schedule a pass before calling payments “closed.” | Contract doc + Phase 9 notes in foundation doc. |
| 5 | **Admin / override trail** — ensure **every** sensitive ops action writes `audit_logs` / `ops_override_logs` / `domain_events` as promised; dashboard “acknowledge alert” style shortcuts should either call engine or emit the same audit shape. | `CROSS_APP_CONTRACTS.md` rules 6–7; foundation doc partial AuditEngine note. |

### A2. Data and types as a business risk

| # | Recommendation |
|---|----------------|
| 6 | **Regenerate `database.types.ts`** from a database that has **all** migrations applied — eliminates “table exists but types don’t” drift (`DATABASE_SCHEMA.md` Known drift). |
| 7 | Treat **schema doc + migrations** as the contract for new features; block merges that add UI fields without a migration story. |

### A3. Roles and boundaries (merchant story)

| # | Recommendation |
|---|----------------|
| 8 | In **ops** and **chef** UIs, label surfaces explicitly: **“Platform”** vs **“Your kitchen”** vs **“Customer view”** so staff never confuse whose money or policy applies. |
| 9 | Keep **cross-app links** env-driven only (already in `CROSS_APP_CONTRACTS.md`); add a single **“environment sanity”** page (ops already has integrations patterns) that validates all four public URLs for staging vs prod. |

---

## Part B — App design improvements

### B1. One product, four doors

| # | Recommendation |
|---|----------------|
| 10 | **Shared header/footer patterns** where possible (logo, “Help”, account) via `@ridendine/ui` so the four apps feel like one brand, not four unrelated sites. |
| 11 | **Terminology pass** — same words everywhere: e.g. “Storefront,” “Order,” “Delivery,” “Payout” (align with docs glossary if you add one). |

### B2. Operations and density

| # | Recommendation |
|---|----------------|
| 12 | **Ops-admin tables** — enforce bounded horizontal scroll for wide grids (`MOBILE_UI_RESPONSIVE_CHECKLIST.md`); add **column presets** (e.g. “Dispatch minimal”) for busy shifts. |
| 13 | **Progressive disclosure** on engine dashboards — default to “needs attention” queues first; bury configuration one click deeper. |

### B3. Chef and driver (workforce UX)

| # | Recommendation |
|---|----------------|
| 14 | **Chef order list** — primary actions (Accept / Mark ready) sticky on mobile; match checklist touch-target guidance. |
| 15 | **Driver** — PWA install prompt + offline messaging for dead zones; keep CTAs clear of map overlays (checklist). |

### B4. Customer web (marketplace)

| # | Recommendation |
|---|----------------|
| 16 | **Checkout** — single linear stepper with visible trust cues (fees, pickup window) to match “merchant platform” positioning. |
| 17 | **Post-order** — one clear “track order” path tied to realtime/status copy from engine-backed statuses. |

### B5. Quality bar (design + engineering)

| # | Recommendation |
|---|----------------|
| 18 | Run **`docs/MOBILE_UI_RESPONSIVE_CHECKLIST.md`** before each release; record reviewer + date in release notes (doc already asks for this). |
| 19 | Keep **`PasswordStrength`** only from `@ridendine/ui` (per checklist IRR-012) — periodic grep for duplicate components. |
| 20 | Expand **ESLint scope** over time so “design bugs” (unused props, a11y lint rules if added) surface in CI, not only in manual QA. |

---

## Suggested sequencing (90-day style)

1. **Week 1–2:** Git/types hygiene (A6), mutation inventory (A1), push audit events for top 5 ops actions.  
2. **Week 3–6:** Money/ledger pass (A4), terminology + nav consistency (B1/B11).  
3. **Ongoing:** Mobile checklist each release (B5), chef/driver polish (B3/B4).

---

## Out of scope (explicit)

- Legal copy, pricing strategy, and marketing site content — not audited here.  
- Infrastructure cost optimization — separate FinOps review.

---

*Next step:* Pick 2–3 items from **A1** and **B1** for the next sprint; link PRs back to this file when done.
