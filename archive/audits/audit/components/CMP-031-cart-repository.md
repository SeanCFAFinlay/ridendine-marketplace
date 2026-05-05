---
id: CMP-031
name: CartRepository
layer: Repository
subsystem: Customer
path: packages/db/src/repositories/cart.repository.ts
language: TypeScript
loc: 133
---

# [[CMP-031]] CartRepository

## Responsibility
Provides database read/write operations for customer cart state and cart items.

## Public API
- `getCartByCustomer(customerId) -> Promise<Cart>` — retrieves active cart
- `addCartItem(cartId, item) -> Promise<CartItem>` — adds item to cart
- `updateCartItem(cartItemId, quantity) -> Promise<CartItem>` — updates item quantity
- `removeCartItem(cartItemId) -> Promise<void>` — removes item from cart
- `clearCart(cartId) -> Promise<void>` — empties the cart

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-052]] WebCartContext — cart state management
- Checkout API route

## Reads config
- None

## Side effects
- DB writes: carts, cart_items

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/cart.repository.ts` (lines 1–133)
