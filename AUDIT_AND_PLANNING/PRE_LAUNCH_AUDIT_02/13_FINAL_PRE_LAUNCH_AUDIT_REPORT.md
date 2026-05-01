# Pre-Launch Audit 02 — Final report

**Audit folder:** [`AUDIT_AND_PLANNING/PRE_LAUNCH_AUDIT_02/`](./)  
**Baseline:** [`00_BASELINE.md`](00_BASELINE.md)

---

## 1. Executive summary

| Overall readiness | **GO WITH CONDITIONS** |
|-------------------|-------------------------|
| Explanation | Monorepo **typecheck (forced), lint, unit/integration tests, and production builds** all pass on the audit machine. Core payment webhook path shows **signature verification + idempotency**. **However**, production-scale **rate limiting is per-instance only**, **Playwright/browser E2E is absent**, several **IRR items remain PARTIAL** (notably **IRR-003**, **IRR-022** route hooks, **IRR-024** execution, **IRR-033** RLS depth), and the **git tree is heavily dirty vs HEAD SHA** — unacceptable for an unambiguous production cut without merge discipline. |

**Production verdict taxonomy:** **STAGING ONLY** → promote to **LIMITED PILOT** after IRR-003/022 triage + distributed limits + signed load smoke; **LAUNCH CANDIDATE** only after E2E + remaining PARTIAL IRRs addressed per product bar.

---

## 2. Critical blockers (staging / pre-launch)

1. **Unmerged / dirty workspace:** Many modified + untracked files; HEAD `48447a9…` does not describe releasable artifact — **process blocker** for any environment promotion.  
2. **No browser E2E:** Cannot claim regression safety for multi-role flows.  
3. **RiskEngine not on checkout** (**IRR-022**): Documented fraud control not enforced at payment edge.

---

## 3. High severity issues

| ID | Topic | Location | Impact |
|----|--------|----------|--------|
| H1 | Per-instance rate limits | `packages/utils/src/rate-limiter.ts` | Traffic spikes bypass limits across serverless instances |
| H2 | IRR-003 incomplete | `apps/web/src/app/api/**` | Potential IDOR if any admin-scoped query misses `customerId` |
| H3 | IRR-022 not wired | `apps/web/.../checkout/route.ts` | Fraud / high-risk orders not auto-blocked |
| H4 | Support RLS breadth | `supabase/migrations/00003_fix_rls.sql` `support_tickets` | DB-level over-permission for ops JWT paths |

---

## 4. Medium severity

- IRR-020/021/028 partial finance & checkout display story.  
- IRR-023 notification durability without automated retry queue.  
- IRR-026 upload without AV / private bucket hardening.  
- IRR-024 no executed load test report.  
- Chef-admin + driver-app **no** automated tests in CI.  
- Health routes may be liveness-only vs deeper monitoring expectations.

---

## 5. Low severity / cleanup

- IRR-016 graphify optional.  
- IRR-025 manual device matrix.  
- IRR-034 analytics SOT.  
- Jest `act()` warnings (web/ops).  
- ESLint scoped narrowly for chef-admin/web in package scripts.

---

## 6. Verified completed items (code + tests this session)

- `pnpm verify:prod-data-hygiene` — pass  
- `pnpm turbo typecheck --force` — pass (12 tasks)  
- `pnpm lint` — pass  
- `pnpm --filter @ridendine/engine test` — 404 passed  
- `pnpm --filter @ridendine/web test` — 52 passed  
- `pnpm --filter @ridendine/db test` — 14 passed  
- `pnpm --filter @ridendine/auth test` — 9 passed  
- `pnpm --filter @ridendine/utils test` — 31 passed  
- `pnpm --filter @ridendine/ops-admin test` — 39 passed  
- `pnpm build` — all four Next apps succeeded  
- Stripe webhook: signature + idempotency claim pattern in code  
- Processor token validation utilities tested (`utils`)

---

## 7. Claimed complete but not fully reverified

- Individual IRR **DONE** rows from tracker (e.g. some Phase gates) were **not** each re-proven line-by-line; spot-check focused on open PARTIALs. Treat tracker **DONE** as **trusted unless contradicted** — **IRR-008/007** spot-checked OK.

---

## 8. Missing tests (exact)

| Need | Owner |
|------|--------|
| Playwright: customer checkout happy path + payment failure | web |
| Playwright or API: chef order accept → ready | chef-admin |
| Playwright: ops refund / support assign | ops-admin |
| Playwright or component: driver delivery state transitions | driver-app |
| Negative security: cross-customer cart/order/support access | web |
| CSV export vs DB query golden tests | ops-admin |
| k6/Artillery staging report archived | infra |

---

## 9. API risk matrix (abbreviated)

| Route | Risk | Auth | Validation | Tests | Owner | Sev |
|-------|------|------|------------|-------|-------|-----|
| `POST /api/checkout` | Scale bypass RL | Y | Partial | Y partial | web | H |
| `POST /api/webhooks/stripe` | Forged/replay | Sig | Stripe | Y | web | M |
| `apps/web/api/*` (bulk) | IDOR | Session | varies | partial | web | H |
| `ops-admin/api/engine/processors/*` | Token bypass | Token | utils | Y | ops | H |
| `GET /api/health` | info | public | n/a | none | all | L |

*(Full route list: `03_API_INVENTORY.md`.)*

---

## 10. Security risk matrix

| Risk | Location | Impact | Fix |
|------|----------|--------|-----|
| Distributed RL gap | `rate-limiter.ts` | DoS / abuse | Redis/KV limiter |
| IDOR class | web admin client routes | PII leak | IRR-003 audit + tests |
| Broad support RLS | migration 00003 | Overexposure | tighten policies |
| Upload malware | upload routes | asset risk | AV + private bucket |

---

## 11. Payment risk matrix

| Risk | Location | Impact | Fix |
|------|----------|--------|-----|
| Live keys in wrong env | deploy config | money movement | env separation + Vercel previews |
| RiskEngine absent | checkout | fraud | wire `evaluateCheckoutRisk` |
| Partial finance reconcile | ops export | ops errors | IRR-021/028 tests |

---

## 12. RLS / data access matrix (sample)

| Table | Expected | Actual (high level) | Risk | Fix |
|-------|----------|---------------------|------|-----|
| `support_tickets` | Scoped agent/ops | `FOR ALL` for `is_ops_admin` | M–H for JWT paths | granular policies |
| `stripe_events_processed` | service only | service_role path | L | keep app idempotent |

---

## 13. Recommended repair phases

- **Phase A — Launch blockers:** merge hygiene; wire RiskEngine on checkout; start IRR-003 audit + tests.  
- **Phase B — High-risk:** distributed rate limits; support RLS revision; processor token rotation runbook execution.  
- **Phase C — E2E + CI:** Playwright project; chef/driver minimal smoke tests in CI.  
- **Phase D — Perf/load:** execute IRR-024 on staging; deepen healthchecks if required by SLO.  
- **Phase E — UX/polish:** TODO crawl; `act()` warnings; finance UI depth.

---

## 14. Commands run (summary)

| Command | Pass/Fail | Notes |
|---------|-----------|-------|
| `pnpm verify:prod-data-hygiene` | PASS | |
| `pnpm turbo typecheck --force` | PASS | no cache |
| `pnpm lint` | PASS | |
| `pnpm --filter @ridendine/engine test` | PASS | 404 tests |
| `pnpm --filter @ridendine/web test` | PASS | 52 tests |
| `pnpm --filter @ridendine/db test` | PASS | |
| `pnpm --filter @ridendine/auth test` | PASS | |
| `pnpm --filter @ridendine/utils test` | PASS | |
| `pnpm --filter @ridendine/ops-admin test` | PASS | |
| `pnpm build` | PASS | ~2m |

---

## 15. Files / directories reviewed (representative)

- `package.json`, `turbo.json`, `.github/workflows/ci.yml`  
- `apps/web/src/app/api/checkout/route.ts`, `webhooks/stripe/route.ts`, `middleware.ts`  
- `packages/utils/src/rate-limiter.ts`, `processor-auth.ts`, `image-upload.ts`, `redact-sensitive.ts`  
- `packages/engine/src/services/stripe.service.ts`, `stripe-webhook-idempotency.ts`, `platform-api-guards.ts`, `risk.engine.ts`  
- `supabase/migrations/00003_fix_rls.sql`, `00016_phase3_*.sql`  
- `docs/CROSS_APP_CONTRACTS.md`, `LOAD_TESTING_PLAN.md`, `SECURITY_HARDENING.md`  
- `AUDIT_AND_PLANNING/22_EXECUTION_TRACKER.md`

---

## 16. Final decision

**NO-GO** for **unrestricted production** today.  
**STAGING ONLY / GO WITH CONDITIONS** for **pre-launch QA** on a **clean merge commit** with staging secrets, **after** accepting risks above.

**Elevate to LIMITED PILOT** when: (1) distributed limits or proven low-traffic pilot, (2) RiskEngine wired + failure handling, (3) IRR-003 spot-check complete for web APIs, (4) at least one cross-role E2E path green in CI.

---

*End of Pre-Launch Audit 02.*
