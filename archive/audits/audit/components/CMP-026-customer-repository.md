---
id: CMP-026
name: CustomerRepository
layer: Repository
subsystem: Customer
path: packages/db/src/repositories/customer.repository.ts
language: TypeScript
loc: 208
---

# [[CMP-026]] CustomerRepository

## Responsibility
Provides database read/write operations for customer profiles and preferences.

## Public API
- `getCustomerById(id) -> Promise<Customer>` — fetches customer profile
- `getCustomerByUserId(userId) -> Promise<Customer>` — fetches customer by auth user
- `updateCustomerProfile(id, data) -> Promise<Customer>` — updates customer profile
- `getCustomerOrderHistory(customerId) -> Promise<Order[]>` — retrieves order history

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-006]] OrderOrchestrator — customer lookups
- [[CMP-015]] CustomersService — legacy service

## Reads config
- None

## Side effects
- DB writes: customer_profiles

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/customer.repository.ts` (lines 1–208)
