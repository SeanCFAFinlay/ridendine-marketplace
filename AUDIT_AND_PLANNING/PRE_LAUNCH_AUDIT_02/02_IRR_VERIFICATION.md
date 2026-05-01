# Phase 2 — IRR completion verification

Source tracker: [AUDIT_AND_PLANNING/22_EXECUTION_TRACKER.md](../22_EXECUTION_TRACKER.md) master table (IRR-001 — IRR-036).  
Verification: grep, file read, test runs (see `09_TESTING_CI_AUDIT.md` / final report).

## Prioritized IRR table

| IRR | Tracker status | Verified status | Evidence | Files checked | Launch impact | Required fix |
|-----|------------------|-----------------|----------|---------------|---------------|--------------|
| **IRR-003** | PARTIAL | **PARTIAL** | Favorites/reviews UUID hardening per Phase 15 notes; **no** exhaustive proof every `apps/web` admin route scopes by `customerId` | `apps/web/src/app/api/**/*.ts`, `docs/SECURITY_HARDENING.md` | **High** — IDOR/data leak if any route misses scope | Systematic route-by-route audit + negative tests |
| **IRR-016** | NOT STARTED | **NOT STARTED** | `graphify-out/` exists untracked in tree; optional | User/workspace graphify rules | **Low** | Generate report or remove rule |
| **IRR-020** | PARTIAL | **PARTIAL** | Checkout POST uses engine + admin client; UI disclaimer; cart line display still client-side subtotal | `apps/web/src/app/checkout/page.tsx`, `api/checkout/route.ts` | **Medium** — product/PCI display vs authority | Move remaining orchestration/display risk behind API if policy requires |
| **IRR-021** | PARTIAL | **PARTIAL** | Finance dashboard + engine finance APIs exist; “CFO reconciliation” deferred per tracker | `apps/ops-admin/.../finance/`, engine finance | **Medium** for finance ops | Deep ledger↔Stripe reconciliation + tests |
| **IRR-022** | PARTIAL | **PARTIAL** | Engine + 10 Vitest rules **PASS**; **no** `evaluateCheckoutRisk` in apps | `packages/engine/src/orchestrators/risk.engine.ts`, grep `apps/` | **High** fraud/ops until wired | Call RiskEngine from checkout (and dispatch if required) + failure path |
| **IRR-023** | PARTIAL | **PARTIAL** | `NotificationSender`, dedupe, triggers tests | `packages/engine/src/core/notification-*.ts` | **Medium** | Retry queue + optional live Resend E2E |
| **IRR-024** | PARTIAL | **PARTIAL** | Doc only; no k6 in repo | `docs/LOAD_TESTING_PLAN.md` | **Medium** capacity | Run staging load + attach report |
| **IRR-025** | PARTIAL | **PARTIAL** | Checklist doc; chef menu responsive pass claimed | `docs/MOBILE_UI_RESPONSIVE_CHECKLIST.md` | **Low/Medium** UX | Manual device matrix sign-off |
| **IRR-026** | PARTIAL | **PARTIAL** | MIME allowlist, 5MB, `canonicalImageExtensionForMime`; utils tests | `apps/web/.../upload`, `apps/chef-admin/.../upload`, `packages/utils/src/image-upload.ts` | **Medium** until private bucket+AV | Infra: private bucket + scanner |
| **IRR-028** | PARTIAL | **PARTIAL** | `stripe_events` export + finance guard; matrix tests deferred | `apps/ops-admin/.../export/route.ts` | **Medium** compliance | CSV↔DB reconciliation tests |
| **IRR-033** | PARTIAL | **PARTIAL** | App-layer support queue guards + repo tests; RLS on `support_tickets` still broad for `is_ops_admin` | `supabase/migrations/00003_fix_rls.sql` (policy “Ops can manage support tickets” FOR ALL), `packages/db/src/repositories/support.repository.ts` | **Medium** — defense in depth | Stricter RLS + agent-only policies if product demands |
| **IRR-034** | NOT STARTED | **NOT STARTED** | `/api/analytics/trends` unchanged | `apps/ops-admin/src/app/api/analytics/trends/route.ts` | **Low** for launch MVP | Define metric SOT in doc + code |

## Tracker accuracy

Rows marked **DONE** in tracker (e.g. IRR-007 Stripe module, IRR-008 webhook idempotency, IRR-013 CI lint gate) **match code** where spot-checked. Items marked **PARTIAL** above remain **accurately PARTIAL** after this audit.
