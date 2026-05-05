---
id: FLOW-003
name: Dispatch & Delivery
entry_point: packages/engine/src/orchestrators/dispatch.engine.ts
actors: Driver, DriverApp, DispatchEngine, Supabase
---

# [[FLOW-003]] Dispatch & Delivery

## Summary
When an order is marked ready, dispatch engine creates a delivery record, finds nearby drivers, sends offers, and manages the pickup-to-delivery lifecycle.

## Steps
1. [[CMP-008]] DispatchEngine.requestDispatch() triggered by order.ready event
2. Delivery record created with pickup (kitchen) and dropoff (customer) addresses
3. Distance calculated via Haversine formula
4. Driver payout calculated (80% of $5 delivery fee = $4)
5. Order status updated to 'dispatch_pending'
6. Dispatch assignment SLA started
7. findAndAssignDriver() queries online approved drivers near pickup
8. Drivers scored: distance (120pts max) + rating (25pts) + experience (20pts) - workload (25pts/active) - decline penalty (8pts) - expiry penalty (10pts) + fairness bonus (12pts)
9. Best driver selected, assignment_attempts record created with 60s expiry
10. Notification sent to driver
11. Driver accepts → delivery updated with driver_id, status='assigned'
12. Driver presence set to 'busy', dispatch SLA completed
13. Driver updates status: en_route_to_pickup → picked_up → en_route_to_dropoff → delivered
14. On delivered: delivery SLA completed, driver released to 'online'
15. Order completion triggered ([[FLOW-001]] completeOrder)

## Sequence Diagram
See [[diagrams/flows/FLOW-003.mmd]]

## Key Components
- [[CMP-008]] DispatchEngine
- [[CMP-004]] SLAManager
- [[CMP-057]] DriverLocationTracker
- [[CMP-037]] DriverPresenceRepository

## Error Paths
- No drivers available → escalateToOps() after 2 attempts
- Max attempts reached (5) → escalateToOps()
- All drivers declined → escalateToOps()
- Offer expired → processExpiredOffers() re-attempts

## Related Findings
- [[FND-014]] No scheduled processor for expired offers
- [[FND-005]] No automated SLA breach detection
