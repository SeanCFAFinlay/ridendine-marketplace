---
id: CMP-005
name: NotificationSender
layer: Service
subsystem: Engine
path: packages/engine/src/core/notification-sender.ts
language: TypeScript
loc: 44
---

# [[CMP-005]] NotificationSender

## Responsibility
Persists notification records to the database; intended as the abstraction point for multi-channel delivery.

## Public API
- `send(notification: NotificationPayload) -> Promise<void>` — inserts notification record and (intended) dispatches delivery

## Depends on (outbound)
- None (writes directly to DB)

## Depended on by (inbound)
- [[CMP-006]] OrderOrchestrator — sends notifications at each order state transition

## Reads config
- `RESEND_API_KEY` — commented out / not active; see [[FND-006]]

## Side effects
- DB write to notifications table
- No actual email/SMS delivery — see [[FND-006]]

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 Email/SMS delivery not implemented; RESEND_API_KEY is commented out in .env.example (FND-006)

## Source
`packages/engine/src/core/notification-sender.ts` (lines 1–44)
