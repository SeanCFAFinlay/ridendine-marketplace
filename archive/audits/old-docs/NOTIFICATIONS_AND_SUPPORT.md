# Notifications and support (Phase 12 canonical)

This document is the **application-layer source of truth** for in-app notifications and support tickets. Database RLS remains authoritative at rest; this doc describes how code paths use tables and guards.

---

## 1. Notification source of truth

| Layer | Responsibility |
|-------|------------------|
| **`notifications` table** | Durable record of what was shown / attempted for a user (`user_id` = `auth.users.id`). Title, body, `type`, `data` JSON (may include `order_id`, `delivery_id`, `dedupe_key`). |
| **`NotificationSender`** (`packages/engine/src/core/notification-sender.ts`) | **Only** component that inserts into `notifications` for engine-driven flows using `createNotification()` + optional provider fan-out. Order: **DB insert first** (best-effort), then **external providers** (best-effort, never throws). |
| **`@ridendine/notifications`** | **Templates only** — maps `NotificationType` + params → title/body. No branching business rules. |
| **`NotificationTriggers`** (`packages/engine/src/core/notification-triggers.ts`) | Maps **domain inputs** → `NotificationSender.send()`. Resolves `orders.customer_id` (`customers.id`) → `customers.user_id` for customer-facing rows. Never throws from public methods. |
| **UI** | Reads notification rows the user is allowed to see (RLS on `notifications`). Does not fabricate “sent” state without a row. |
| **`domain_events`** | **Trigger source** where orchestrators emit events; notification side effects stay in `NotificationTriggers` / `NotificationSender` to avoid duplicate sends. |

### Dedupe

When `additionalData` includes `order_id` or `delivery_id`, `NotificationSender` sets a deterministic `dedupe_key` in `data` and skips insert + providers if a matching row already exists (best-effort; probe errors do not block sends).

### Cancel / refund

`order_cancelled` and `refund_processed` are first-class `NotificationType` values with templates; they go through **`NotificationSender`** like other types (no direct `insert` bypass).

---

## 2. Support source of truth

| Layer | Responsibility |
|-------|------------------|
| **`support_tickets` table** | Canonical support case: subject, description, status, priority, `customer_id`, `assigned_to`, timestamps, optional `order_id` / `chef_id` / `driver_id`. |
| **`packages/db` `support.repository.ts`** | Typed reads/writes: customer-scoped lists, ops queue, support-agent scoped queue (`listSupportTicketsForSupportAgent`), `createSupportTicket`, `updateSupportTicket`. |
| **Web** | `POST /api/support` — create ticket (session optional; `customer_id` set when logged-in customer exists). `GET /api/support/tickets`, `GET /api/support/tickets/[id]` — **own tickets only** via admin client + repository filters. |
| **Ops-admin** | `GET`/`PATCH` `apps/ops-admin/src/app/api/support/**` guarded with `guardPlatformApi(..., 'support_queue')`. Support dashboard uses `hasPlatformApiCapability(actor, 'support_queue')`. |

### Assignment

- **`assigned_to`** persists assignee (`auth.users` id, per existing schema usage).
- **Support agents** see tickets **assigned to them** plus the **unassigned `open`** pool (`listSupportTicketsForSupportAgent`). They do not receive other agents’ assigned tickets in that query.
- **Ops line** (`ops_agent`, `ops_admin`, `ops_manager`, `super_admin`) sees the full queue via `getOpsSupportQueue` without agent scoping.

### Auditability

Status changes go through `updateSupportTicket` (updates `updated_at`). Deeper immutable audit log (`support.ticket_updated` in `domain_events`, before/after snapshots) is **deferred** — see §8.

---

## 3. Support role access matrix

Enforced in **`packages/engine/src/services/platform-api-guards.ts`** (`support_queue` capability).

| Role | `support_queue` | Customer ticket APIs (web) |
|------|-------------------|----------------------------|
| `support_agent` | Yes | N/A (ops app) |
| `ops_agent`, `ops_admin`, `ops_manager`, `super_admin` | Yes | N/A |
| `finance_admin`, `finance_manager` | **No** | N/A |
| Customer (session + `customers` row) | N/A | List/get **own** rows only |
| Unauthenticated | N/A | Create ticket via POST allowed; list/detail **401/403** |

`support_agent` **cannot** PATCH a ticket assigned to another user (403) — `apps/ops-admin/src/app/api/support/[id]/route.ts`.

---

## 4. Event → notification matrix

| Domain / product event | Trigger location | `NotificationType` / path | Notes |
|------------------------|------------------|----------------------------|--------|
| Order created | `NotificationTriggers.onOrderCreated` | `order_placed` (customer + chef) | Customer send uses resolved `user_id`. |
| Chef accepted | `OrderOrchestrator.acceptOrder` → `onChefAccepted` | `order_accepted` | Single path (duplicate direct send removed). |
| Chef rejected | `rejectOrder` → `onChefRejected` | `order_rejected` | |
| Order ready | `markOrderReady` → `onOrderReady` | `order_ready` | |
| Driver offered | `onDriverOffered` | `delivery_offer` | Driver `user_id`. |
| Driver assigned (picked up semantics) | `onDriverAssigned` | `order_picked_up` | `order_number` from input or `orders`. |
| Order delivered | `completeOrder` → `onOrderDelivered` | `order_delivered` | Single path (duplicate direct send removed). |
| Order cancelled | `cancelOrder` → `onOrderCancelled` | `order_cancelled` | |
| Refund processed | `onRefundProcessed` | `refund_processed` | Caller supplies engine trigger when refunds finalize. |
| Support ticket created | Web `POST /api/support` | **No automatic customer/ops in-app row in Phase 12** | Optional future: `support.ticket_created` domain event + internal notify. |
| Support ticket updated | Ops `PATCH` | **Not wired** to notifications in Phase 12 | Documented gap. |

Orchestrator methods should **not** call `notificationSender.send` directly for the same transition as `NotificationTriggers` (dedupe does not catch two different code paths if types differ).

---

## 5. Provider boundary

| Item | Detail |
|------|--------|
| **Interface** | `NotificationDeliveryProvider` in `notification-sender.ts`. |
| **Resend** | `createResendProvider()` (`email-provider.ts`) reads **`RESEND_API_KEY`** only inside `isAvailable()` / `deliver()` — server env, not logged. |
| **Failure** | Provider errors are caught; returns `{ delivered: false, error }`. Core order/payment paths do **not** await provider success. |
| **Email body** | Uses template title/body from DB payload; optional `data.email` for recipient (otherwise `no_recipient_email`). |
| **Tests** | Vitest registers mock providers or omits API key so Resend never sends real mail. |

Missing provider env → DB row still written when insert succeeds; external delivery skipped.

---

## 6. Privacy rules

- Customer ticket **GET** responses use **narrow selects** (no internal ops-only fields beyond what the row type exposes in the customer projection).
- Customers **cannot** pass another user’s id; server resolves `customer_id` from session.
- Notifications `user_id` must be **`auth.users.id`**, not `customers.id` (resolved in `NotificationTriggers`).
- Do not log API keys, full payment details, or ticket bodies in error paths intended for production.

---

## 7. Failure / retry / test mode

- **DB insert failure:** logged; providers may still run (current behavior).
- **Dedupe:** prevents duplicate rows for same type + user + order/delivery key.
- **Retry:** No automatic outbound retry queue in Phase 12 — **deferred** to ops/infra (Phase 17) or a future job processor.
- **Tests:** No real SMS/email; mocks / missing keys.

---

## 8. Phase 15 (security hardening)

- Redact logs for notification/support errors in shared middleware.
- Stricter RLS review on `support_tickets` for **chef/driver**-scoped rows if product exposes those APIs.
- Rate limits on `POST /api/support`.

---

## 9. Phase 17 (deployment / env)

- Document `RESEND_API_KEY` (and `from` domain) in env runbooks.
- Optional: queue workers for retrying failed provider deliveries using `notifications` metadata.

---

## 10. Mock / demo data

Production code paths must not inject fake notification rows or demo tickets. Seeds and demo fixtures are out of scope for runtime (**Phase 13** removes seed-from-prod risk).
