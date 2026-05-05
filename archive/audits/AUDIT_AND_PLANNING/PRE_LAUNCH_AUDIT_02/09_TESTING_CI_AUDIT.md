# Phase 8 — Testing, CI, Playwright, quality gates

## CI configuration

File: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)

Jobs: install → `pnpm verify:prod-data-hygiene` → `pnpm typecheck` → `pnpm lint` → filtered tests → `pnpm build`.

**Lint hard gate:** IRR-013 — `continue-on-error` removed (per tracker; file in dirty tree aligns).

## Playwright / browser E2E

| Question | Answer |
|----------|--------|
| `apps/web/e2e` exists? | **No** — no Playwright config under web |
| Core customer order flow in Playwright? | **No** |
| Chef / ops / driver browser E2E? | **No** |
| Engine package `e2e/*.ts` | **Yes** — Vitest integration style (`packages/engine/src/e2e/`), not browser |

## Package test scripts

| Package | Script | In CI? |
|---------|--------|--------|
| `@ridendine/engine` | `vitest run` | Yes |
| `@ridendine/db` | `vitest run` | Yes |
| `@ridendine/auth` | `vitest run` | Yes |
| `@ridendine/utils` | `vitest run` | Yes |
| `@ridendine/web` | `jest` | Yes |
| `@ridendine/ops-admin` | `jest` | Yes |
| `@ridendine/chef-admin` | **no test script** | **No** |
| `@ridendine/driver-app` | **no test script** | **No** |

## Commands run (this audit, Windows)

| Command | Exit | Result summary |
|---------|------|------------------|
| `pnpm verify:prod-data-hygiene` | 0 | OK — no seed in workflows |
| `pnpm turbo typecheck --force` | 0 | 12/12 packages |
| `pnpm lint` | 0 | turbo lint 4 apps with lint tasks |
| `pnpm --filter @ridendine/engine test` | 0 | 404 tests |
| `pnpm --filter @ridendine/web test` | 0 | 52 tests |
| `pnpm --filter @ridendine/db test` | 0 | 14 tests |
| `pnpm --filter @ridendine/auth test` | 0 | 9 tests |
| `pnpm --filter @ridendine/utils test` | 0 | 31 tests |
| `pnpm --filter @ridendine/ops-admin test` | 0 | 39 tests |
| `pnpm build` | 0 | all four Next apps built |

**Notes:** Jest printed expected `console.error` in webhook/support negative tests and some `act(...)` warnings — **not failures**.

## IRR-024 load testing

**NOT EXECUTED** — no k6/Artillery artifacts in repo; doc-only per `LOAD_TESTING_PLAN.md`.

## Gaps vs “Uber Eats–class” QA

1. No cross-app Playwright matrix.  
2. Chef-admin and driver-app **zero automated tests** in CI.  
3. Nightly staging CI — **not found** in `.github/workflows` (only push/PR to main/master).
