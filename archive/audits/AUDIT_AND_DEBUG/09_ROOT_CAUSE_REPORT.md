# Phase 10 — Root cause report

Issues grouped by category. **Severity** reflects production impact if unfixed.

---

## 1. Startup blockers

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| *None found* | — | `pnpm run build` exit 0 | — | — | — |

---

## 2. Build blockers

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| *None found* | — | Turbo build succeeded | — | — | — |

---

## 3. Runtime blockers

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| Chef Stripe Connect redirects may send users to **wrong origin** (customer app port) when `NEXT_PUBLIC_APP_URL` is standard and `NEXT_PUBLIC_CHEF_ADMIN_URL` ignored | **High** (payout onboarding) | `payouts/setup/route.ts` lines 77–78 use only `NEXT_PUBLIC_APP_URL`. `.env.example` sets `NEXT_PUBLIC_APP_URL=http://localhost:3000` and `NEXT_PUBLIC_CHEF_ADMIN_URL=http://localhost:3001`. | `apps/chef-admin/src/app/api/payouts/setup/route.ts` | Prefer `NEXT_PUBLIC_CHEF_ADMIN_URL` with fallback; fail loudly if both unset | Low — URL selection only |

---

## 4. Data-flow blockers

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| *None proven in this run* | — | Tests + build passed | — | Monitor staging | — |

---

## 5. UI blockers

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| *None compile-time* | — | Next build completed | — | — | — |

---

## 6. Config / env blockers

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| Optional vars used in code but missing from `.env.example` | Low | Grep: `UPSTASH_*`, `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED`, `APP_ENV`, `LOG_LEVEL` | `05_ENV_CONFIG_REVIEW.md` | Add commented placeholders | Low |

---

## 7. Old / stale code

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| Multiple audit folders (`audit`, `AUDIT_AND_PLANNING`, `AUDIT_AND_DEBUG`) | Low | Directory listing | — | Consolidate docs when convenient | N/A |
| Empty `graphify-out/GRAPH_REPORT.md` | Low | File read | `graphify-out/GRAPH_REPORT.md` | Regenerate graph when needed | N/A |

---

## 8. Security

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| `TEST_CREDENTIALS.md` present | **Medium** if committed secrets | File exists at root | `TEST_CREDENTIALS.md` | Verify gitignore / rotate if exposed | — |

---

## 9. Performance

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| *None flagged* | — | — | — | — | — |

---

## 10. Testing gaps

| Item | Severity | Evidence | Path | Recommended fix | Risk of fixing |
|------|----------|----------|------|-----------------|----------------|
| ESLint partial paths | Medium | App `lint` scripts scope subsets | `apps/*/package.json` | Expand over time | Low |
| React `act()` warnings | Low | Jest stderr | ops-admin / web tests | Adjust tests | Low |
