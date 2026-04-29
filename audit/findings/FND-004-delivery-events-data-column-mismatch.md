---
id: FND-004
title: delivery_events insert uses wrong column name 'data' vs 'event_data'
category: BrokenWire
severity: High
effort: S
status: Open
components: CMP-008, CMP-027
---

# [[FND-004]] Delivery Events Data Column Mismatch

## Summary
[[CMP-008]] DispatchEngine at line 734 inserts into `delivery_events` using the key `data`, but the actual column name is `event_data`. Migration `00010` fixed the RPC function but the direct insert call in the engine was not updated, causing all delivery event writes to silently fail or error.

## Evidence
- `dispatch.engine.ts` line 734: `{ ..., data: eventPayload }` — wrong column key
- Database column: `delivery_events.event_data`
- Migration 00010 RPC fix was applied to the function but not the direct insert path

## Impact
- Every delivery event write via the direct insert path fails silently or throws a database error
- Delivery event history is incomplete or absent for all dispatches
- Ops visibility into delivery timeline is broken

## Recommendation
1. Fix `dispatch.engine.ts` line 734: change `data:` to `event_data:`
2. Add an integration test covering delivery event creation
3. Check for other direct `delivery_events` inserts that may have the same issue

## Fix Effort
S — one-line rename fix; test addition recommended.
