# Ridendine Workflow Documentation

## Customer Journey

### Discovery Flow
```
1. Customer lands on homepage
2. Customer browses featured chefs or searches
3. Customer filters by cuisine, rating, delivery time
4. Customer selects a chef storefront
5. Customer views chef profile and menu
```

### Order Flow
```
1. Customer adds items to cart (with options/modifiers)
2. Customer reviews cart
3. Customer proceeds to checkout
4. Customer confirms/adds delivery address
5. Customer selects payment method
6. Customer places order
7. Order created with status: 'pending'
```

### Post-Order Flow
```
1. Customer receives order confirmation
2. Customer tracks order status updates
3. Customer receives delivery
4. Customer prompted for review
5. Customer submits rating and review
```

## Chef Journey

### Onboarding Flow
```
1. Chef signs up with email
2. Chef completes profile (name, bio, photo)
3. Chef sets up kitchen (address, certifications)
4. Chef defines service area (delivery zones)
5. Chef uploads required documents
6. Chef submits for approval
7. Ops admin reviews and approves
8. Chef receives approval notification
```

### Menu Management Flow
```
1. Chef creates menu categories
2. Chef adds menu items to categories
3. Chef sets prices, descriptions, photos
4. Chef adds item options (size, spice level, etc.)
5. Chef sets item availability schedule
6. Chef publishes storefront
```

### Order Fulfillment Flow
```
1. Chef receives new order notification
2. Chef reviews order details
3. Chef accepts order → status: 'accepted'
   OR Chef rejects order → status: 'rejected' (with reason)
4. Chef prepares food
5. Chef marks ready for pickup → status: 'ready_for_pickup'
6. Delivery assigned to driver
7. Driver picks up → status: 'picked_up'
8. Driver delivers → status: 'delivered'
```

## Driver Journey

### Onboarding Flow
```
1. Driver signs up with email
2. Driver completes profile
3. Driver adds vehicle information
4. Driver uploads documents (license, insurance)
5. Driver submits for verification
6. System/ops verifies documents
7. Driver receives approval
```

### Delivery Flow
```
1. Driver goes online
2. Driver receives delivery offer
3. Driver views offer details (pickup, dropoff, earnings)
4. Driver accepts offer
   OR Driver rejects/ignores → offer goes to next driver
5. Driver navigates to chef location
6. Driver arrives at chef
7. Driver confirms pickup (optional photo)
8. Driver navigates to customer
9. Driver arrives at customer
10. Driver confirms dropoff (optional photo)
11. Delivery completed
12. Earnings credited to driver
```

### Shift Management
```
1. Driver sets availability schedule (optional)
2. Driver goes online within shift
3. Driver receives offers based on location
4. Driver goes offline when done
5. Driver views shift summary
```

## Ops Admin Journey

### Chef Approval Flow
```
1. Ops views pending chef applications
2. Ops reviews chef profile and documents
3. Ops verifies certifications/licenses
4. Ops approves → chef notified, storefront enabled
   OR Ops requests changes → chef notified with feedback
   OR Ops rejects → chef notified with reason
```

### Order Oversight Flow
```
1. Ops views all active orders
2. Ops filters by status, chef, customer
3. Ops drills into order details
4. Ops handles escalations
5. Ops processes refunds if needed
6. Ops adds admin notes
```

### Delivery Oversight Flow
```
1. Ops views all active deliveries
2. Ops monitors driver locations (map view)
3. Ops identifies stuck/delayed deliveries
4. Ops contacts driver/customer if needed
5. Ops reassigns delivery if driver unresponsive
```

## Order State Machine

```
PENDING
  ├── ACCEPTED (by chef)
  │     └── PREPARING
  │           └── READY_FOR_PICKUP
  │                 └── DRIVER_ASSIGNED
  │                       └── PICKED_UP
  │                             └── IN_TRANSIT
  │                                   └── DELIVERED
  │                                         └── COMPLETED
  ├── REJECTED (by chef)
  │     └── CANCELLED
  └── CANCELLED (by customer, before acceptance)

Special states:
- REFUNDED (can occur from multiple states)
- DISPUTED (support escalation)
```

## Delivery State Machine

```
PENDING (awaiting assignment)
  └── ASSIGNED (driver matched)
        ├── ACCEPTED (driver accepted)
        │     └── EN_ROUTE_TO_PICKUP
        │           └── ARRIVED_AT_PICKUP
        │                 └── PICKED_UP
        │                       └── EN_ROUTE_TO_DROPOFF
        │                             └── ARRIVED_AT_DROPOFF
        │                                   └── DELIVERED
        │                                         └── COMPLETED
        └── REJECTED (driver rejected)
              └── PENDING (re-queue for next driver)

Special states:
- CANCELLED
- FAILED (undeliverable)
- RETURNED (returned to chef)
```
