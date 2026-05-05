# Production Acceptance Criteria
| Area | Acceptance Tests | Proof Required |
| --- | --- | --- |
| Customer | place order end-to-end; pay successfully; see tracking; see order history | E2E with Stripe test mode and real DB tables |
| Chef | receive order; accept/prep/ready; update menu | Chef dashboard and API contract tests |
| Driver | go online; receive offer; accept; pickup; deliver; see earnings | Driver mobile E2E and delivery API tests |
| Ops | see live board; inspect order; manually dispatch; see SLA alerts; approve/hold payouts | Ops RBAC + live data tests |
| Finance | every dollar appears in ledger; payout preview matches ledger; reconciliation catches differences; refunds tracked | Ledger accounting acceptance suite |
| Security | customer cannot access admin; chef cannot access other chef; driver cannot access finance; finance actions require finance role; command center protected | RBAC negative test suite |
| Deployment | each app deployed; domains correct; env present; smoke tests pass | Vercel/env/domain smoke suite |
