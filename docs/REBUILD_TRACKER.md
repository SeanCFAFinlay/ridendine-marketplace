# Rebuild Tracker

Local rebuild on branch `rebuild/local`. No remote pushes.

- [x] Phase 1 — Repo hygiene
- [x] Phase 2 — Schema consolidation and RLS alignment
- [x] Phase 3 — Collapse parallel order and dispatch engines
- [x] Phase 4 — Schedulers and notification delivery
- [x] Phase 5 — Centralized auth and RBAC enforcement
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
- Phase 4: added `sla-tick` + `expired-offers` cron routes (auth via existing `validateEngineProcessorHeaders` which already accepts `Bearer ${CRON_SECRET}`); created `scripts/local-cron.mjs` runner (60s/30s intervals); added `sms-provider.ts` (Twilio direct-fetch, no SDK) + `sms-templates.ts`; registered Twilio as second NotificationDeliveryProvider; constructed `NotificationTriggers` in factory and exposed as `engine.triggers`; added `CRON_SECRET` / `RESEND_API_KEY` / `TWILIO_*` to `.env.example`. Manual end-to-end email/SMS smoke deferred — credentials not present locally.
- Phase 5: relocated capability list to `packages/types/src/capabilities.ts`; closed route gaps (web cart/addresses/profile/favorites/notifications/reviews/support/upload, chef-admin profile/upload/payouts-setup); deleted `BYPASS_AUTH` (replaced with `ALLOW_DEV_AUTOLOGIN` flag, dev-only); architecture test `scripts/audit/check-api-route-guards.mjs` (`pnpm audit:guards`) — scans 92 routes, allowlists 13 public/auth/webhook/health, finds zero unguarded; extended `platform-api-guards.test.ts` to 309 tests covering 35 capabilities × allowed/denied role matrix; rewrote `docs/AUTH_ROLE_MATRIX.md` with full capability×role table.
