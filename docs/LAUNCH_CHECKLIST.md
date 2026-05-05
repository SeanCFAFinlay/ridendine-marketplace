# Launch checklist — Ridendine (Phase 18)

**Purpose:** Human **go / no-go** gate before production traffic. Cursor fills this template; **signatures and dates** are owned by the business (legal, ops, finance, engineering).

**Sources:** [`AUDIT_AND_PLANNING/21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md`](../AUDIT_AND_PLANNING/21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md) (Part 14 smoke, Part 15 ops), [`docs/RUNBOOK_DEPLOY.md`](RUNBOOK_DEPLOY.md), [`docs/QA_TESTING_PLAN.md`](QA_TESTING_PLAN.md), [`docs/BACKUP_AND_ROLLBACK.md`](BACKUP_AND_ROLLBACK.md), [`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md), [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md).

---

## 1. Pre–go/no-go technical gates

| # | Gate | Owner | Sign-off (initials / date) |
|---|------|-------|----------------------------|
| T1 | CI green on release branch (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` per [`docs/QA_TESTING_PLAN.md`](QA_TESTING_PLAN.md)) | Eng | |
| T2 | Staging deploy matches production config class (keys **mode**, not values) | Eng | |
| T3 | `ALLOW_DEV_AUTOLOGIN` **not** set in production; `NODE_ENV=production` verified | Eng | |
| T4 | Stripe **live** vs **test** keys match intended environment | Eng + Finance | |
| T5 | Webhook endpoint URL + `STRIPE_WEBHOOK_SECRET` match **only** prod web URL | Eng | |
| T6 | Supabase backup / PITR status confirmed for prod project | Ops | |
| T7 | `pnpm verify:prod-data-hygiene` (or equivalent) — no seed in prod pipelines | Eng | |
| T8 | Synthetic monitors for `GET /api/health` on all four apps ([`docs/HEALTHCHECKS_AND_MONITORING.md`](HEALTHCHECKS_AND_MONITORING.md)) | Ops | |

---

## 2. Part 14 — Production smoke gate (staging first, then prod read-only where noted)

Canonical list: **Part 14** in [`21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md`](../AUDIT_AND_PLANNING/21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md) (smoke items 1–10).

| # | Smoke test | Environment | Pass (✓) | Evidence / link |
|---|------------|-------------|----------|-------------------|
| 1 | Customer places **paid** order (test card / staging) | Staging | ☐ | |
| 2 | Chef accepts within SLA | Staging | ☐ | |
| 3 | Driver completes delivery path | Staging | ☐ | |
| 4 | Admin views live board + **benign** override on test order | Staging | ☐ | |
| 5 | Ledger export vs Stripe balance (**test** mode) | Staging | ☐ | |
| 6 | Prod DB: **no** seed emails from `supabase/seeds/` (query / hygiene) | Prod pre-launch | ☐ | |
| 7 | Role matrix: customer session → **403** on ops `POST` …/engine/settings (or equivalent guarded route) | Staging | ☐ | |
| 8 | Realtime: ops board updates without full page refresh | Staging | ☐ | |
| 9 | Refund → negative ledger + Stripe refund (**test** mode) | Staging | ☐ | |
| 10 | Audit log row for override/refund includes **actor** id | Staging | ☐ | |

**Playwright:** E2E suite is **recommended** in Part 14 but may still be absent; manual execution of rows 1–10 remains the **minimum** gate until automated smoke exists.

---

## 3. Legal & compliance

| # | Item | Owner | Sign-off |
|---|------|-------|----------|
| L1 | Terms of Service published and versioned; in-app links updated | Legal | |
| L2 | Privacy Policy (incl. cookies, analytics, location) published | Legal | |
| L3 | Refund / cancellation policy matches checkout copy and ops runbook | Legal + Ops | |
| L4 | Food-handler / marketplace obligations for your jurisdiction reviewed | Legal | |
| L5 | Insurance / liability (chef, platform, delivery) — **placeholders resolved** | Legal + Ops | |

---

## 4. Operations & support

| # | Item | Owner | Sign-off |
|---|------|-------|----------|
| O1 | Public support phone / email / hours documented and staffed | Ops | |
| O2 | Escalation path (L1 → engineering on-call) documented | Ops | |
| O3 | Incident runbook: who invokes [`docs/BACKUP_AND_ROLLBACK.md`](BACKUP_AND_ROLLBACK.md) steps | Ops | |
| O4 | Chef onboarding / approval SLA agreed with ops | Ops | |

---

## 5. Finance

| # | Item | Owner | Sign-off |
|---|------|-------|----------|
| F1 | Stripe live account + tax settings reviewed | Finance | |
| F2 | Payout schedule to chefs / drivers matches contracts | Finance | |
| F3 | Daily Stripe ↔ `ledger_entries` reconciliation owner assigned (`21` Part 15 — finance schedule) | Finance | |

*(Replace static link with internal doc path if you add `docs/FINANCE_RUNBOOK.md`.)*

---

## 6. Security & privacy (final pass)

| # | Item | Owner | Sign-off |
|---|------|-------|----------|
| S1 | [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md) reviewed; known gaps accepted or ticketed | Eng + Security | |
| S2 | Secrets only in host secret stores (Vercel / Supabase / Stripe dashboards) | Eng | |
| S3 | Optional: OWASP ZAP or equivalent on staging (Part 14) | Security | |

---

## 7. Go / no-go meeting

| Role | Name | Present | GO / NO-GO |
|------|------|---------|------------|
| Engineering lead | | ☐ | |
| Product / Ops | | ☐ | |
| Finance | | ☐ | |
| Legal (or delegate) | | ☐ | |

**Decision:** ☐ **GO** — production promote authorized  
**Decision:** ☐ **NO-GO** — reasons: _________________________

**Meeting date:** _______________ **Minutes stored at:** _______________

---

## 8. Post-launch (first 48 hours)

| # | Action | Owner |
|---|--------|-------|
| P1 | Watch error rates, health checks, Stripe webhook dashboard | Eng |
| P2 | Confirm no spike in 401/403 on processor routes | Eng |
| P3 | Customer support queue monitored | Ops |

---

## Appendix A — Project readiness review (Phases 0–18)

*Snapshot for release owners; not a substitute for code audit.*

### A.1 Monorepo shape

| App | Package | Role |
|-----|-----------|------|
| Customer web | `@ridendine/web` | Marketplace, checkout, webhooks |
| Chef | `@ridendine/chef-admin` | Menu, orders, availability, payouts |
| Ops | `@ridendine/ops-admin` | Platform control, engine APIs, processors |
| Driver | `@ridendine/driver-app` | Delivery PWA |

Shared: `@ridendine/db`, `@ridendine/engine`, `@ridendine/auth`, `@ridendine/utils`, `@ridendine/ui`, `@ridendine/types`, `@ridendine/validation`, `@ridendine/notifications`.

### A.2 Documentation index (release-critical)

| Document | Topic |
|----------|--------|
| [`docs/CROSS_APP_CONTRACTS.md`](CROSS_APP_CONTRACTS.md) | Boundaries |
| [`docs/AUTH_ROLE_MATRIX.md`](AUTH_ROLE_MATRIX.md) | Auth / roles |
| [`docs/API_FOUNDATION.md`](API_FOUNDATION.md) | APIs |
| [`docs/BUSINESS_ENGINE_FOUNDATION.md`](BUSINESS_ENGINE_FOUNDATION.md) | Engine |
| [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md) | Security |
| [`docs/QA_TESTING_PLAN.md`](QA_TESTING_PLAN.md) | CI / local QA |
| [`docs/RUNBOOK_DEPLOY.md`](RUNBOOK_DEPLOY.md) | Deploy |
| [`docs/BACKUP_AND_ROLLBACK.md`](BACKUP_AND_ROLLBACK.md) | DR |
| [`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md) | Env |
| [`docs/HEALTHCHECKS_AND_MONITORING.md`](HEALTHCHECKS_AND_MONITORING.md) | Health |
| [`docs/LOAD_TESTING_PLAN.md`](LOAD_TESTING_PLAN.md) | Load / SLO |
| [`docs/RELEASE_BASELINE.md`](RELEASE_BASELINE.md) | Baseline SHA |

### A.3 IRR / tracker — still open or partial (prioritize post-launch)

From [`AUDIT_AND_PLANNING/22_EXECUTION_TRACKER.md`](../AUDIT_AND_PLANNING/22_EXECUTION_TRACKER.md) (snapshot concept): **PARTIAL / NOT STARTED** items typically include — **IRR-003** (full web service-role audit), **IRR-020**, **IRR-021**, **IRR-022** (route hooks), **IRR-023**, **IRR-024** (load test execution), **IRR-025**, **IRR-026**, **IRR-028**, **IRR-033**, **IRR-034**, **IRR-016** (optional graphify). Reconcile against live tracker before GO.

### A.4 Top risks (non-exhaustive)

1. **Distributed rate limits** — per-instance buckets; traffic spikes may differ in prod.  
2. **Playwright / E2E gap** — reliance on manual Part 14 smoke until `apps/web/e2e` exists.  
3. **Stripe live** — irreversible money movement; dry-run in staging with test keys first.  
4. **RLS depth** on support / sensitive tables — confirm product requirements vs **IRR-033** partial state.

### A.5 Recommended next engineering passes (post–Phase 18)

1. Close **IRR-024** with a signed staging load report.  
2. Automate Part 14 smoke (Playwright) + CI nightly on staging.  
3. Triage **PARTIAL** HIGH items (**IRR-003**, **IRR-022**) per business priority.  
4. Fill **TBD** contacts and RPO/RTO in [`docs/BACKUP_AND_ROLLBACK.md`](BACKUP_AND_ROLLBACK.md) and [`docs/RUNBOOK_DEPLOY.md`](RUNBOOK_DEPLOY.md).

---

*Phase 18 is the **terminal** execution phase in `21` — ongoing compliance is outside this checklist.*
