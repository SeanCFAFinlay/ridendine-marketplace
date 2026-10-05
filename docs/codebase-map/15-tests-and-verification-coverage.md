# 15 — Tests and Verification Coverage

250 test files. Mapped to behaviours, not counted.

---

## 1. Test inventory

| Location | Files | Runner | Runs in CI? |
|---|---|---|---|
| `apps/web` | 70 | Jest + Testing Library | ✅ `ci.yml` |
| `packages/engine` | 62 | Vitest | ✅ |
| `apps/driver-app` | 32 | Jest | ✅ |
| `apps/ops-admin` | 28 | Jest | ✅ |
| `apps/chef-admin` | 18 | Jest | ✅ |
| `scripts/smoke` | 13 | `node --test` | ✅ via `test:wiring-fixes` |
| `packages/utils` | 9 | Vitest | ✅ |
| `packages/validation` | 8 | Vitest | ❌ **never run** |
| `packages/db` | 7 | Vitest | ✅ |
| `e2e/lifecycle` | 6 | Playwright | ⚠️ nightly / separate workflow |
| `packages/routing` | 4 | Vitest | ❌ **never run** |
| `scripts/audit` | 3 | `node --test` | ✅ via `test:wiring-fixes` |
| `e2e/*.smoke.spec.ts` | 2 | Playwright | ✅ (`--grep @smoke`) |
| `packages/ui` | 1 | Vitest | ❌ **never run** |
| `packages/types` | 1 | Vitest | ❌ **never run** |
| `packages/notifications` | 1 | Vitest | ❌ **never run** |
| `packages/auth` | 1 | Vitest | ✅ |
| `supabase/tests/rls` | 2 pgTAP | — | ❌ **no workflow executes them** |

## 2. CI gate composition

`.github/workflows/ci.yml` — triggers: push to `master`/`main`, PRs targeting them, and a daily 09:00 UTC schedule.

**Job `quality`** (in order): `verify:prod-data-hygiene` → `typecheck` → `lint` → `audit:guards` → `audit:db-boundary` → tests for engine, db, auth, utils, web, ops-admin, chef-admin, driver-app → `test:wiring-fixes` → `build`.

**Job `smoke-e2e`** (needs `quality`): `pnpm test:smoke` (`--grep @smoke`) on PR/push; `pnpm test:e2e` (full) on the nightly schedule.

Other workflows: `e2e.yml` (PRs to master/main — boots a real local Supabase stack, applies migrations + the lifecycle seed, runs `test:e2e:lifecycle`), `post-deploy-smoke.yml` (on Vercel `deployment_status: success`, every 6 h, and manually — runs `runtime-contract-smoke.cjs` against production), `load-test.yml` (nightly, **dry-run by default** because live mode writes real support requests).

## 3. Critical-behaviour coverage matrix

| Critical behaviour | Covered by | Level | Gaps |
|---|---|---|---|
| Order state transitions | `order-state-machine.test.ts`, `master-order-engine` tests | Unit | ✅ Strong — this is the most safety-critical logic and it is well covered |
| Delivery transitions | `delivery-engine` tests | Unit | ✅ |
| Checkout end to end | `api/checkout` route tests + `e2e/lifecycle/customer.spec.ts` | Unit + E2E | ⚠️ E2E only nightly / on PR |
| Checkout idempotency | route tests | Unit | ⚠️ **The 120 s stale-reclaim race is inherently hard to test and was not found under test** |
| Stripe webhook | `webhooks/stripe/__tests__` | Unit, mocked | ⚠️ Signature verification and the live/test dual-secret path are mocked, not exercised against a real Stripe signature |
| Amount-mismatch refusal | webhook tests | Unit | ✅ — this is exactly the right thing to have tested |
| Partner API auth + signing | `lib/partner/__tests__/{auth,signing}.test.ts` | Unit | ✅ |
| Partner checkout | `api/partner/checkout/__tests__` | Unit | ✅ |
| Driver matching / scoring | `driver-matching.service` tests | Unit | ✅ pure-function scoring is well covered |
| Offer expiry | `offer-management.service` tests | Unit | ⚠️ the **processor** that invokes it is untested |
| **Cron → processor HTTP contract** | **nothing** | — | ❌ **This is precisely where F-01 lives. No test asserts that the scheduler's `GET` performs work.** |
| Ledger idempotency | engine tests | Unit | ⚠️ the concurrent-duplicate race (F-09) is not covered |
| Payout run concurrency | migration `00032` + route pre-check | DB constraint | ⚠️ no test proves the stuck-run path |
| Reconciliation | `reconciliation.service` tests | Unit | ⚠️ never runs in production (F-02), so the tests validate dormant code |
| Ops authorization | `high-risk-ops-authz-contracts.cjs`, `high-risk-ops-negative-authz.cjs`, `sean-super-admin-fixture.cjs` + 28 app tests | Contract + unit | ✅ **Notably good — negative authorization is explicitly tested** |
| API route guards | `scripts/audit/check-api-route-guards.mjs` | Static gate | ⚠️ text-presence only; **`GET` handlers excluded** (V-05) |
| DB boundary | `db-boundary-ratchet.mjs` | Static ratchet | ✅ blocks new violations; 398 accepted at baseline |
| RLS policies | `supabase/tests/rls/{kitchen_scope,role_alignment}.sql` | pgTAP | ❌ **written but never executed by any workflow** |
| Rate limiting | `rate-limit.test.ts` incl. the degraded-fallback case | Unit | ✅ |
| Kitchen OS rules | engine module tests | Unit | ✅ pure functions covered; ⚠️ **the route layer that owns every DB write is thin** (18 tests / 161 source files) |
| Inventory ledger ↔ cache consistency | **nothing** | — | ❌ F-14 |
| Pricing / tax / surge / fees | engine service tests | Unit | ✅ arithmetic covered — **but see the pre-discount tax question in `08`; the tests assert the implementation, not its correctness** |
| Loyalty tiers | `loyalty.service` tests | Unit | ✅ |
| Referral flow | `referral.service` tests | Unit | ❌ **no test asserts the share link resolves — which is why R-05 shipped** |
| Responsive rendering | `responsive-production-smoke.cjs` | Runtime | ✅ |
| Accessibility | **nothing** | — | ❌ no axe/pa11y/Lighthouse anywhere |
| Performance / load | `run-load-smoke.mjs` | Runtime | ⚠️ dry-run by default; no latency or error thresholds — it only fails if the script itself crashes |
| Migration safety | **nothing** | — | ❌ no migration test, despite a prior production incident from editing an applied migration |
| Backup / restore | **nothing** | — | ❌ U-04 |

## 4. Test-quality observations

**Mocks that could hide integration failure**
- Stripe is mocked throughout the unit tests. Signature construction, the live-then-test secret fallback, and Connect onboarding are never exercised against a real Stripe signature.
- Supabase is mocked in most package tests. RLS behaviour is therefore never exercised by the unit suite — and the pgTAP tests that *would* exercise it never run.
- The `e2e.yml` lifecycle suite is the only place a real database is used, and it runs against a seeded local stack, not production-shaped data.

**Do tests assert outcomes or merely execution?**
Sampled: `order-state-machine.test.ts` asserts specific allowed/denied transitions; the webhook tests assert the amount-mismatch refusal; the authz audit scripts assert both positive **and negative** access. These are outcome assertions, not smoke coverage. The engine suite is genuinely good.

**Determinism**
`playwright.config.ts` sets `retries: 1` in CI, `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `fullyParallel: true`, 60 s timeout. `e2e/lifecycle` uses deterministic fixtures with a preflight (`verify-lifecycle-fixtures.mjs`) and a reset (`reset-live-fixtures.mjs`). `e2e:validate-seed` checks seed UUIDs. **This is careful work.** Stripe-gated specs self-skip when `STRIPE_SECRET_KEY` is absent — which means a green E2E run does not necessarily mean the payment path was tested.

**Fixture limitations**
The lifecycle suite pins order number `RD-E2E-LIFECYCLE` and resets it through `/api/fixtures/reset`, which is triple-gated against production. Correct.

## 5. Coverage gaps ranked by consequence

| Rank | Gap | Why it matters |
|---|---|---|
| **1** | No test of the cron → processor HTTP contract | This is the exact seam of F-01, the most severe finding in the map. A three-line test would have caught it. |
| **2** | pgTAP RLS tests never executed | 316 policies across 112 tables are entirely unverified in CI. Two well-written test files sit unused. |
| **3** | 5 packages' tests never run in CI | `validation` (8 files — Zod schemas guarding every route boundary), `routing`, `types`, `ui`, `notifications`. `validation` is the painful one: it is a security boundary. |
| **4** | No inventory cache/ledger consistency test | F-14 can silently corrupt stock levels. |
| **5** | Chef-admin route layer thinly tested | 18 tests for 161 files, and this is where 259 of the 398 raw DB calls live. |
| **6** | No accessibility testing | A consumer-facing marketplace with a legal exposure and no automated a11y check. |
| **7** | No migration testing | The repository records that editing an applied migration once caused a production incident. |
| **8** | Load test has no thresholds | It proves the script runs, not that the system performs. |

## 6. Reproducing the gate locally

```bash
pnpm typecheck
pnpm lint
pnpm audit:guards            # PASS — 179 routes, 14 allowlisted, 0 unguarded
pnpm audit:db-boundary       # PASS — 398 warnings, equal to baseline
pnpm verify:prod-data-hygiene # PASS
pnpm test
pnpm test:wiring-fixes       # 20/20 wiring assertions + 15 node --test suites
```

**Verified during this analysis** (executed read-only): `audit:guards`, `audit:db-boundary`, `verify:prod-data-hygiene`, and `verify-known-wiring-fixes.cjs` — **all four pass** at `c8b9049d`.
Not executed: `typecheck`, `lint`, `test`, `build` (they write `.tsbuildinfo`, Turbo cache and `.next` output, which the read-only mandate excluded).

## 7. Adding these five tests would close most of the risk

1. **`GET /api/engine/processors/sla` performs work** — asserts F-01 cannot recur.
2. **Run the existing pgTAP RLS suite in `e2e.yml`** — the stack is already booted there; this is a one-line addition.
3. **Add `validation`, `routing`, `types`, `ui`, `notifications` to `ci.yml`** — five lines.
4. **`computeOnHand(movements) === inventory_items.current_quantity`** after each inventory route — closes F-14.
5. **Assert the referral share link resolves to a real route on the configured base URL** — closes R-05 and the class of defect it represents.
