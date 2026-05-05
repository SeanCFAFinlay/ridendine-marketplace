# Remaining Risks

## Confirmed remaining defects

1. **IRR-003 incomplete** — full web service-role route audit and ownership negative tests are not complete.
2. **Distributed rate limiting not implemented** — production still vulnerable to per-instance bypass.
3. **Browser E2E missing** — no critical-path Playwright gate yet.
4. **Chef-admin/driver-app test coverage gap** — still missing dedicated test scripts/CI jobs.
5. **IRR-024 load evidence missing** — no staged signed load report.
6. **Support RLS depth unresolved** — broad `support_tickets` policy remains unresolved in this pass.

## Suspected risks still requiring verification

1. Full payment/order reconciliation across all error paths.
2. Full SSRF/CORS/CSRF review across all route handlers.
3. Full pagination/perf behavior on high-volume list endpoints.
4. Correlation ID propagation and structured log completeness.

## Owner decisions still required

1. Distributed limiter provider choice (Upstash vs Supabase vs Vercel KV).
2. Support ticket access policy (ops-wide vs assignment-scoped).
3. Payout launch scope (launch-critical vs post-launch).
4. Promotion gate after P0/P1 (staging only vs limited pilot).
