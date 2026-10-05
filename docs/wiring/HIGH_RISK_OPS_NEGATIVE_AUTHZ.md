# High-Risk Ops Negative Authorization

Generated: 2026-10-05T17:14:33.385Z

This generated audit documents endpoint-level denial expectations for the high-risk Ops/control-plane routes covered by Phase 11. It proves every contracted route method has an explicit negative authorization model for unauthenticated access, denied platform roles, invalid processor tokens, disabled command-center access, or invalid Stripe signatures.

## Summary

| Metric | Count |
|---|---:|
| Phase 11 method rows | 27 |
| Negative authorization contracts | 27 |
| Passed contracts | 27 |
| Failed checks | 0 |

## Denial Matrix

| Status | Area | Method | Route | Guard | Required guard/capability | Denial expectations |
|---|---|---|---|---|---|---|
| PASS | Dispatch | `GET` | `/api/engine/dispatch` | platform | dispatch_read | 401 unauthenticated; 403 denied roles: finance_admin, finance_manager, support_agent, customer, chef_user, driver |
| PASS | Dispatch | `POST` | `/api/engine/dispatch` | platform | dispatch_write | 401 unauthenticated; 403 denied roles: finance_admin, finance_manager, support_agent, customer, chef_user, driver |
| PASS | Dispatch | `GET` | `/api/engine/dispatch/offer-history` | platform | dispatch_read | 401 unauthenticated; 403 denied roles: finance_admin, finance_manager, support_agent, customer, chef_user, driver |
| PASS | Finance | `GET` | `/api/engine/finance` | platform | finance_engine | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Finance | `POST` | `/api/engine/finance` | platform | finance_engine | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Refunds | `GET` | `/api/engine/refunds` | platform | finance_refunds_read | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Refunds | `POST` | `/api/engine/refunds` | platform | finance_refunds_request | 401 unauthenticated; 403 denied roles: support_agent, customer, chef_user, driver |
| PASS | Payouts | `GET` | `/api/engine/payouts` | platform | finance_payouts | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Payouts | `POST` | `/api/engine/payouts` | platform | finance_payouts | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Payouts | `POST` | `/api/engine/payouts/preview` | platform | finance_payouts | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Payouts | `POST` | `/api/engine/payouts/execute` | platform | finance_payouts | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Payouts | `GET` | `/api/engine/payouts/instant` | platform | finance_payouts | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Payouts | `POST` | `/api/engine/payouts/instant/[id]` | platform | finance_payouts | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Payouts | `DELETE` | `/api/engine/payouts/instant/[id]` | platform | finance_payouts | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Processor | `GET` | `/api/engine/processors/expired-offers` | processor | validateEngineProcessorHeaders | 401 via validateEngineProcessorHeaders: missing processor headers, wrong bearer token, wrong x-processor-token |
| PASS | Processor | `POST` | `/api/engine/processors/expired-offers` | processor | validateEngineProcessorHeaders | 401 via validateEngineProcessorHeaders: missing processor headers, wrong bearer token, wrong x-processor-token |
| PASS | Processor | `GET` | `/api/engine/processors/reconciliation` | processor | validateEngineProcessorHeaders | 401 via validateEngineProcessorHeaders: missing processor headers, wrong bearer token, wrong x-processor-token |
| PASS | Processor | `POST` | `/api/engine/processors/reconciliation` | processor | validateEngineProcessorHeaders | 401 via validateEngineProcessorHeaders: missing processor headers, wrong bearer token, wrong x-processor-token |
| PASS | Processor | `GET` | `/api/engine/processors/retention` | processor | validateEngineProcessorHeaders | 401 via validateEngineProcessorHeaders: missing processor headers, wrong bearer token, wrong x-processor-token |
| PASS | Processor | `POST` | `/api/engine/processors/retention` | processor | validateEngineProcessorHeaders | 401 via validateEngineProcessorHeaders: missing processor headers, wrong bearer token, wrong x-processor-token |
| PASS | Processor | `GET` | `/api/engine/processors/sla` | processor | validateEngineProcessorHeaders | 401 via validateEngineProcessorHeaders: missing processor headers, wrong bearer token, wrong x-processor-token |
| PASS | Processor | `POST` | `/api/engine/processors/sla` | processor | validateEngineProcessorHeaders | 401 via validateEngineProcessorHeaders: missing processor headers, wrong bearer token, wrong x-processor-token |
| PASS | Internal command center | `GET` | `/api/internal/command-center/change-requests` | command_center | team_manage | 403 when INTERNAL_COMMAND_CENTER_ENABLED disabled; 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, finance_admin, finance_manager, support_agent, customer, chef_user, driver |
| PASS | Internal command center | `POST` | `/api/internal/command-center/change-requests` | command_center | team_manage | 403 when INTERNAL_COMMAND_CENTER_ENABLED disabled; 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, finance_admin, finance_manager, support_agent, customer, chef_user, driver |
| PASS | Internal command center | `PATCH` | `/api/internal/command-center/change-requests` | command_center | team_manage | 403 when INTERNAL_COMMAND_CENTER_ENABLED disabled; 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, finance_admin, finance_manager, support_agent, customer, chef_user, driver |
| PASS | Order refund | `POST` | `/api/orders/[id]/refund` | platform | finance_refunds_sensitive | 401 unauthenticated; 403 denied roles: ops_admin, ops_manager, ops_agent, support_agent, customer, chef_user, driver |
| PASS | Stripe finance webhook | `POST` | `/api/stripe/webhook` | stripe_signature | stripe-signature | 400 missing stripe-signature, 400 invalid stripe-signature |

## Failures

None found.
