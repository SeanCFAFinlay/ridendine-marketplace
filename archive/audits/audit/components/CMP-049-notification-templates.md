---
id: CMP-049
name: NotificationTemplates
layer: Adapter
subsystem: Notifications
path: packages/notifications/src/templates.ts
language: TypeScript
loc: 80
---

# [[CMP-049]] NotificationTemplates

## Responsibility
Defines message templates for all notification types (order updates, driver alerts, etc.) used by the notification sender.

## Public API
- `getTemplate(type: NotificationType, data: TemplateData) -> NotificationContent` — returns rendered title and body for a notification type
- Template constants for all notification event types

## Depends on (outbound)
- None

## Depended on by (inbound)
- [[CMP-005]] NotificationSender — uses templates when building notification payloads

## Reads config
- None

## Side effects
- None (pure template rendering)

## Tests
- ❓ UNKNOWN

## Smells / notes
- Templates are only used for in-app notifications; no email/SMS delivery integrated — see [[FND-006]]

## Source
`packages/notifications/src/templates.ts` (lines 1–80)
