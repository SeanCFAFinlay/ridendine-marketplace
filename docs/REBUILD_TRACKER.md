# Rebuild Tracker

Local rebuild on branch `rebuild/local`. No remote pushes.

- [x] Phase 1 — Repo hygiene
- [x] Phase 2 — Schema consolidation and RLS alignment
- [x] Phase 3 — Collapse parallel order and dispatch engines
- [ ] Phase 4 — Schedulers and notification delivery
- [ ] Phase 5 — Centralized auth and RBAC enforcement
- [ ] Phase 6 — Stripe end-to-end correctness
- [ ] Phase 7 — Shared UI primitives and design tokens
- [ ] Phase 8 — Rebuild the ops-admin UI
- [ ] Phase 9 — Customer experience polish
- [ ] Phase 10 — Chef and driver app polish
- [ ] Phase 11 — Local end-to-end Playwright tests
- [ ] Phase 12 — Local launch readiness

## Notes
_One-line note per phase. Append, never delete._

- Phase 1 (commit 063d58b): archived 391 audit-style files into `archive/audits/`; markdown count under 80.
- Phase 2 (commit 5ba727f): added `00024_canonical_consolidation.sql` (idempotent ADDs + deprecation comments) and `00025_rls_role_alignment.sql` (`is_platform_staff`/`is_finance_staff`/`is_support_staff` helpers); 33 pgTAP tests; FND-002/003/020 resolved; ledger_entries SELECT tightened to `is_finance_staff` (engine bypass via service role still works).
- Phase 3: deleted `order.orchestrator.ts` (1,589 LOC) and `dispatch.engine.ts` (1,660 LOC); created `OrderCreationService`, `DriverMatchingService`, `OfferManagementService`, `DispatchOrchestrator`; extended `MasterOrderEngine` with FND-017 payment void + ledger writes + opsOverride + getAllowedActions + alias methods; added `updateDeliveryStatus` to `DeliveryEngine`; per-request factory (singleton removed); FND-007 scoring moved into `driver-matching.service.ts`; 46 new tests; FND-004/017/018 regression coverage explicit.
