# 20 — Legacy, Duplicate, Dead and Generated Code

**Rule applied throughout:** nothing is called dead without checking static references, barrel exports, dynamic registration, configuration loading, build inclusion, deployment inclusion and external invocation. An empty search result was never treated as proof on its own — every "dead" verdict below has a positive reason, not merely an absent one. Nothing was deleted.

---

## Classification

| ID | Item | Classification | Evidence | Removal prerequisite |
|---|---|---|---|---|
| **D-01** | `packages/engine/src/services/dispatch.service.ts` | **UNREACHABLE — dead second implementation** | Referenced only by `packages/engine/src/index.ts` (`export * from`), its own `dispatch.service.test.ts`, and two explanatory comments in `packages/db/src/client/types.ts`. **No production caller.** The live path is `DriverMatchingService → OfferManagementService → DispatchOrchestrator`, wired explicitly in `createCentralEngine`. | Remove the barrel export, then the file and its test. Confirm nothing imports `@ridendine/engine/services/dispatch`. |
| **D-02** | `@ridendine/engine` exports `"./orders"` → `src/orchestrators/order.orchestrator.ts` and `"./dispatch"` → `src/orchestrators/dispatch.engine.ts` | **BROKEN — target files do not exist** | Filesystem check: both paths MISS; the other 16 export targets resolve. Deleted in the Phase 3 rebuild. | Delete the two entries from `package.json: exports`. Nothing can currently import them, so this is safe. |
| **D-03** | `apps/ops-admin/src/app/api/cron/sla-tick` | **DEPRECATED but reachable** | A 14-line header comment states it is deprecated, that production cron does not invoke it, that it runs an older smaller subset (timers + chef rejection only), and that it does not write `ops_processor_runs`. Retained for `scripts/local-cron.mjs` compatibility — **though `local-cron.mjs` has already been updated to call the canonical processor instead.** | Nothing depends on it any more. Deletable now. |
| **D-04** | `apps/ops-admin/src/app/api/cron/expired-offers` | **DUPLICATE, unscheduled** | Functionally identical to `processors/expired-offers` minus the `ops_processor_runs` claim. Absent from `vercel.json`. | Deletable. |
| **D-05** | `apps/ops-admin/src/app/api/cron/{payouts-chef-preview,payouts-driver-preview}` | **INACTIVE — no processor equivalent, no schedule, no UI caller** | Absent from `vercel.json`; `local-cron.mjs` explicitly skips them; nothing in `apps/ops-admin/src` fetches them. But `/api/engine/health` lists them as tracked processors. | **Do not delete — promote.** These are the only entry points to `previewChefRun`/`previewDriverRun`. Move to `/api/engine/processors/*` with run tracking, or wire them to the finance UI (R-04). |
| **D-06** | `apps/ops-admin/src/app/api/cron/reconciliation-daily` | **INACTIVE — the highest-consequence dormant route** | Same as D-05. `ReconciliationService.runDaily` is also reachable via `POST /api/engine/reconciliation` (ops UI documents this in the page copy). | **Do not delete — schedule it.** See R-02. |
| **D-07** | Web-push notifications | **HALF-BUILT — a UI promise with no backend** | `push_subscriptions` table exists; `/api/notifications/subscribe` writes it; `use-push-notifications.ts` subscribes via `pushManager`; `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is documented. **But:** no `web-push` package in any manifest, no VAPID **private** key anywhere, and `grep -rn "web-push\|VAPID_PRIVATE"` across `apps`, `packages` and `scripts` returns **zero hits**. Nothing can send a push. | Either implement a sender, or remove the subscribe surface so it stops promising a capability that does not exist. |
| **D-08** | `packages/routing/src/mapbox.provider.ts` | **INACTIVE — never instantiated** | `MapboxProvider` is exported from `packages/routing/src/index.ts` and constructed nowhere. Both `EtaService` instantiation sites pass `new OsrmProvider()`. | **Keep.** It is the ready-made mitigation for X-04/F-13. Document it as an intentional alternative rather than dead code. |
| **D-09** | `packages/engine/src/core/engine.factory.ts: getEngine(client)` and `packages/engine/src/server.ts: getEngine()` (module singleton) | **INACTIVE — neither has a production caller** | All four apps re-export `getAdminEngine as getEngine`. `core.getEngine` appears only in `engine-factory.test.ts`. The `server.ts` singleton is imported by nothing. `CLAUDE.md` warns "check which one you are importing" — the sharper truth is that **neither is imported**. | The naming collision is a real trap for a future developer. Rename or remove both; keep `createCentralEngine` and `getAdminEngine`. |
| **D-10** | `archive/` | **GENERATED — no source** | 351 files, all under `graphify-out/` plus one `GRAPH_REPORT.md`. | Deletable; regenerable. |
| **D-11** | 8 × `**/graphify-out/`, `.gitnexus/` (309 MB), `.local-tools/` (152 MB), `.turbo/`, `apps/*/.next/`, `test-results/` | **GENERATED / VENDORED** | All gitignored. | Never edit. Safe to delete locally; regenerable. |
| **D-12** | `packages/db/src/generated/database.types.ts` | **GENERATED — never hand-edit** | `pnpm db:generate` → `packages/db/scripts/generate-types.mjs` | Regenerate after every schema change. |
| **D-13** | `apps/web/src/app/order-confirmation/[orderId]/page.tsx` | **INTENTIONAL LEGACY REDIRECT — not dead** | 15 lines; permanent redirect to the canonical `/orders/[id]/confirmation` (IRR-011). Documented in code and in `customer-ordering.ts: legacyOrderConfirmationPath`. | Keep until inbound links to the old URL have aged out. |

## Duplicate implementations

| Pair | Status | Which runs | Drift risk |
|---|---|---|---|
| `dispatch.service.ts` vs the `DispatchOrchestrator` trio | One dead, one live | **Trio** — wired in `createCentralEngine` | The dead file gives a misleading impression of the dispatch design to anyone reading the barrel export |
| `/api/cron/expired-offers` vs `/api/engine/processors/expired-offers` | Duplicate | **Neither, in practice** (F-01) — the processor is the scheduled one | Divergence: only the processor writes `ops_processor_runs` |
| `/api/cron/sla-tick` vs `/api/engine/processors/sla` | Already diverged | **Processor** | The legacy route runs a strictly smaller subset — a developer who finds it first would implement against the wrong one |
| `core.getEngine(client)` vs `server.getEngine()` vs `getAdminEngine()` | Three factories | **`getAdminEngine` only** | Direct naming collision; the documented trap |
| Payout split math in `payout-engine.ts` vs inline in `commerce.engine.ts` | Both live | **Both** | **Real risk.** Same two constants, two call sites. A change to one silently splits the platform's economics. |
| `/order-confirmation/[orderId]` vs `/orders/[id]/confirmation` | Redirect | Canonical | None — intentional |
| Kitchen OS DB access vs `@ridendine/db` repositories | Architectural duplication | **Raw `.from()`** — 259 calls in chef-admin alone | The repository pattern is bypassed entirely for 7 domains |

## The db-boundary erosion

| App | Raw `supabase.from()` warnings | Share |
|---|---|---|
| `apps/chef-admin` | **259** | 65% |
| `apps/web` | 71 | 18% |
| `apps/driver-app` | 53 | 13% |
| `apps/ops-admin` | 15 | 4% |
| **Total** | **398** | |

`scripts/audit/db-boundary-ratchet.mjs` was verified passing at exactly these numbers. The ratchet blocks **new** violations; the baseline is accepted, not fixed.

**The concentration tells the story.** Chef-admin's 259 are the Kitchen OS: **recipes, inventory, production, purchasing, suppliers, labour and kitchen have no `*.repository.ts` at all.** Confirmed against the 22 repositories in `packages/db/src/repositories/`. As `CLAUDE.md` states — and this analysis confirms independently — the missing repositories *are* the task; bumping the baseline again would not be.

## Deletion candidates, ranked

| Priority | Item | Effort | Risk |
|---|---|---|---|
| 1 | D-02 broken `exports` entries | Trivial | **None** — they cannot resolve today |
| 2 | D-01 `dispatch.service.ts` + its test + barrel export | Small | Low — no caller |
| 3 | D-03, D-04 legacy cron routes | Small | Low — unscheduled, and `local-cron` no longer calls them |
| 4 | D-09 rename or remove the two unused `getEngine` factories | Small | Low, but touches the engine's public surface — do it with the barrel export change |
| 5 | D-10 `archive/` | Trivial | None |
| 6 | D-07 decide push notifications: build the sender or remove the subscribe surface | Medium | Medium — a product decision, not a cleanup |

**Do not delete:** D-05, D-06 (dormant but needed — schedule them), D-08 (the mitigation for X-04), D-12, D-13.

## Method note

Every "unreachable" verdict above was reached by checking, in order: static imports across `apps/`, `packages/`, `scripts/` and `e2e/`; barrel re-exports; `package.json: exports` entries; `vercel.json` schedules; `.github/workflows` invocations; UI `fetch` call sites (including template-literal construction); and dynamic route registration. Where a search returned nothing, a positive reason for absence was established before the verdict was recorded — for example, D-01 is dead not because grep found nothing, but because `createCentralEngine` demonstrably wires a different implementation into every engine instance.
