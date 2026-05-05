---
id: CMP-036
name: AddressRepository
layer: Repository
subsystem: Customer
path: packages/db/src/repositories/address.repository.ts
language: TypeScript
loc: 96
---

# [[CMP-036]] AddressRepository

## Responsibility
Provides database read/write operations for customer saved addresses.

## Public API
- `getAddressesByCustomer(customerId) -> Promise<Address[]>` — lists customer addresses
- `createAddress(data) -> Promise<Address>` — saves new address
- `updateAddress(id, data) -> Promise<Address>` — updates an address
- `deleteAddress(id) -> Promise<void>` — removes an address
- `setDefaultAddress(id, customerId) -> Promise<void>` — marks address as default

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-006]] OrderOrchestrator — delivery address lookup
- Customer address management routes

## Reads config
- None

## Side effects
- DB writes: customer_addresses

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/address.repository.ts` (lines 1–96)
