---
id: CMP-061
name: NotificationBell
layer: UI
subsystem: WebApp
path: apps/web/src/components/notifications/notification-bell.tsx
language: TypeScript
loc: 234
---

# [[CMP-061]] NotificationBell

## Responsibility
Displays unread notification count badge and dropdown list of recent notifications for the customer.

## Public API
- `<NotificationBell userId>` — renders bell icon with badge and notification dropdown

## Depends on (outbound)
- [[CMP-021]] BrowserClient — realtime notification subscription
- Notification query (via browser client)

## Depended on by (inbound)
- Web app top navigation bar

## Reads config
- None

## Side effects
- Marks notifications as read on open
- Realtime channel subscription

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`apps/web/src/components/notifications/notification-bell.tsx` (lines 1–234)
