---
name: gitnexus-area-hooks
description: "Skill for the Hooks area of ridendine-marketplace. 37 symbols across 6 files."
---

# Hooks

37 symbols | 6 files | Cohesion: 80%

## When to Use

- Working with code in `apps/`
- Understanding how activePostCount, beginPost, finishPost work
- Modifying hooks-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/driver-app/src/hooks/use-location-tracker.ts` | extractApiErrorMessage, postLocation, readRejectedLocationMessage, activePostCount, beginPost (+8) |
| `apps/ops-admin/src/hooks/use-ops-live-feed.ts` | dispatchFromBroadcastPayload, useOpsLiveFeed, fetchSnapshot, ch, clearFallback (+5) |
| `apps/web/src/hooks/use-push-notifications.ts` | getSwRegistration, removeSubscription, unsubscribe, createSubscription, saveSubscription (+3) |
| `packages/auth/src/hooks/use-user.ts` | useIsAuthenticated, useSession, useUser |
| `packages/db/src/realtime/channels.ts` | opsLiveBoardChannel, postgresTableChannelId |
| `packages/db/src/hooks/use-realtime.ts` | useRealtimeSubscription |

## Entry Points

Start here when exploring this area:

- **`activePostCount`** (Function) — `apps/driver-app/src/hooks/use-location-tracker.ts:103`
- **`beginPost`** (Function) — `apps/driver-app/src/hooks/use-location-tracker.ts:107`
- **`finishPost`** (Function) — `apps/driver-app/src/hooks/use-location-tracker.ts:114`
- **`isActiveSession`** (Function) — `apps/driver-app/src/hooks/use-location-tracker.ts:99`
- **`updateLocation`** (Function) — `apps/driver-app/src/hooks/use-location-tracker.ts:128`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `activePostCount` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 103 |
| `beginPost` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 107 |
| `finishPost` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 114 |
| `isActiveSession` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 99 |
| `updateLocation` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 128 |
| `useOpsLiveFeed` | Function | `apps/ops-admin/src/hooks/use-ops-live-feed.ts` | 107 |
| `fetchSnapshot` | Function | `apps/ops-admin/src/hooks/use-ops-live-feed.ts` | 114 |
| `ch` | Function | `apps/ops-admin/src/hooks/use-ops-live-feed.ts` | 196 |
| `clearFallback` | Function | `apps/ops-admin/src/hooks/use-ops-live-feed.ts` | 135 |
| `startFallback` | Function | `apps/ops-admin/src/hooks/use-ops-live-feed.ts` | 142 |
| `opsLiveBoardChannel` | Function | `packages/db/src/realtime/channels.ts` | 26 |
| `unsubscribe` | Function | `apps/web/src/hooks/use-push-notifications.ts` | 101 |
| `useIsAuthenticated` | Function | `packages/auth/src/hooks/use-user.ts` | 66 |
| `useSession` | Function | `packages/auth/src/hooks/use-user.ts` | 61 |
| `useUser` | Function | `packages/auth/src/hooks/use-user.ts` | 12 |
| `useLocationTracker` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 77 |
| `clearPermissionListener` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 152 |
| `startTracking` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 159 |
| `stopTracking` | Function | `apps/driver-app/src/hooks/use-location-tracker.ts` | 271 |
| `subscribe` | Function | `apps/web/src/hooks/use-push-notifications.ts` | 84 |

## How to Explore

1. `context({name: "activePostCount"})` — see callers and callees
2. `query({search_query: "hooks"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
