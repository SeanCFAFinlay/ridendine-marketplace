---
id: CMP-052
name: WebCartContext
layer: Adapter
subsystem: WebApp
path: apps/web/src/contexts/cart-context.tsx
language: TypeScript
loc: 100
---

# [[CMP-052]] WebCartContext

## Responsibility
React context managing in-memory and persisted cart state for the customer web app.

## Public API
- `<CartProvider>` — wraps app to provide cart context
- `useCart() -> CartContext` — hook to access cart state and actions
- `addItem(item)`, `removeItem(itemId)`, `updateQuantity(itemId, qty)`, `clearCart()` — cart mutations

## Depends on (outbound)
- [[CMP-021]] BrowserClient — persists cart to DB
- [[CMP-031]] CartRepository — cart data operations

## Depended on by (inbound)
- Web app checkout flow
- Web app cart sidebar component

## Reads config
- None

## Side effects
- DB reads/writes to cart state via CMP-031

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`apps/web/src/contexts/cart-context.tsx` (lines 1–100)
