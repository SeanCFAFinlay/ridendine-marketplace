# Repair Priority Matrix

## P0 — Immediate launch blockers

| Finding IDs | Why P0 | Dependencies | Do not touch yet |
|---|---|---|---|
| F-001, F-022 | Dirty tree / baseline drift invalidates release artifact traceability | none | Avoid feature refactors before release branch protocol |
| F-003 (IRR-022), F-028 | Checkout fraud and env money-safety controls directly affect irreversible payment actions | auth context intact, Stripe module stable | Do not change Stripe architecture; only enforce pre-check gates |
| F-005 (IRR-003), F-006 (IRR-033), F-017 | Data ownership/privacy leakage risk in service-role + RLS paths | existing auth roles | Do not widen permissions for convenience |
| F-002 | No browser E2E means no confidence in launch-critical flows | CI baseline green | Do not mark production-ready before at least one full path per role |

## P1 — High-risk pre-launch repairs

| Finding IDs | Why P1 | Dependencies | Do not touch yet |
|---|---|---|---|
| F-004, F-016 | Per-instance RL breaks in multi-instance prod | choose provider | Do not add per-route hacks before provider decision |
| F-007, F-008, F-034, F-027 | Coverage/CI gaps in chef/driver and staging schedule | test framework choice | Avoid broad CI matrix explosion before smoke baseline |
| F-009, F-010, F-021, F-032 | Perf/health observability insufficient for pilot confidence | RL + API hardening | Do not set SLOs until load scripts exist |
| F-012, F-031 | Checkout/finance correctness and reconciliation not complete | RiskEngine wired | Avoid UI-only finance fixes without API parity |

## P2 — Important hardening

| Finding IDs | Why P2 | Dependencies | Do not touch yet |
|---|---|---|---|
| F-013, F-014, F-015, F-030 | Security posture hardening and unknowns | P0 auth guardrails | Do not relax existing security checks |
| F-018, F-019, F-020, F-033 | UX wiring, placeholders, realtime and menu windows | stable APIs/tests | Do not rewrite navigation until route contracts are frozen |
| F-025 | Notification reliability improvement | queue design decision | Avoid introducing external queue without retry semantics |

## P3 — Cleanup / governance

| Finding IDs | Why P3 | Dependencies | Do not touch yet |
|---|---|---|---|
| F-023, F-024, F-026, F-029, F-035 | Documentation and governance alignment after technical fixes | prior phase evidence | Do not update docs before code/test evidence exists |

## Dependency order (high level)

1. P0 release safety + auth/payment privacy controls  
2. P1 distributed protection + CI/E2E + load evidence  
3. P2 hardening and UX wiring  
4. P3 docs/runbooks/tracker closure

This order minimizes risk of validating unstable behavior and ensures every documentation update is backed by passing tests.
